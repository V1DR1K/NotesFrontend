import { spawnSync } from 'node:child_process';

const approvedAdvisory = 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm';
const audit = spawnSync(
  'npm',
  ['audit', '--audit-level=high', '--json', '--ignore-scripts'],
  { encoding: 'utf8' },
);

if (audit.error) {
  console.error('Could not run npm audit:', audit.error.message);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  console.error('npm audit did not return valid JSON.');
  if (audit.stderr) console.error(audit.stderr.trim());
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities;
const counts = report.metadata?.vulnerabilities;
if (!vulnerabilities || !counts || audit.status === null) {
  console.error('npm audit returned an incomplete report.');
  if (audit.stderr) console.error(audit.stderr.trim());
  process.exit(1);
}

function isOnlyApprovedAdvisory(name, visiting = new Set()) {
  const issue = vulnerabilities[name];
  if (!issue || issue.name !== name || issue.severity !== 'high' || visiting.has(name)) {
    return false;
  }

  const nextVisiting = new Set(visiting);
  nextVisiting.add(name);

  if (name === 'braces') {
    return Array.isArray(issue.via)
      && issue.via.length === 1
      && typeof issue.via[0] === 'object'
      && issue.via[0].name === 'braces'
      && issue.via[0].severity === 'high'
      && issue.via[0].url === approvedAdvisory;
  }

  return Array.isArray(issue.via)
    && issue.via.length > 0
    && issue.via.every((cause) =>
      typeof cause === 'string' && isOnlyApprovedAdvisory(cause, nextVisiting),
    );
}

const highOrCritical = Object.entries(vulnerabilities)
  .filter(([, issue]) => issue.severity === 'high' || issue.severity === 'critical');
const reportedHighOrCritical = Number(counts.high ?? 0) + Number(counts.critical ?? 0);
if (reportedHighOrCritical !== highOrCritical.length) {
  console.error('npm audit returned inconsistent high or critical vulnerability counts.');
  process.exit(1);
}

const allowed = highOrCritical
  .filter(([name]) => isOnlyApprovedAdvisory(name))
  .map(([name]) => name);
const blocked = highOrCritical
  .filter(([name]) => !isOnlyApprovedAdvisory(name));

if (blocked.length > 0 || (audit.status !== 0 && allowed.length === 0)) {
  console.error('npm audit found blocking high or critical vulnerabilities:');
  for (const [name, issue] of blocked) {
    console.error('- ' + name + ': ' + issue.severity + '; ' + issue.range);
  }
  if (blocked.length === 0 && audit.stderr) console.error(audit.stderr.trim());
  process.exit(1);
}

if (allowed.length > 0) {
  console.warn(
    'npm audit exception: ' + approvedAdvisory
    + ' has no patched braces release; allowing only its dependency paths: '
    + allowed.join(', ') + '.',
  );
  console.warn('All other high or critical vulnerabilities remain blocking.');
}

# npm audit exception

The frontend dependency tree currently includes braces 3.0.3, affected by
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
The published advisory covers versions <= 3.0.3 and currently lists no
patched release.

scripts/audit-dependencies.mjs permits only high-severity findings whose
complete npm audit dependency chain ends at braces and that exact advisory.
All other high and critical findings continue to fail CI. The script also fails
closed if npm returns an invalid or incomplete report.

Remove this exception after a patched braces release is available and the
lockfile has been updated; restore the direct npm audit --audit-level=high
gate at that point.

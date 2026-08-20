import assert from "node:assert/strict";
import test from "node:test";

const siteTitle = /<title>Cuaderno · Tu espacio personal<\/title>/i;
const siteDescription =
  /<meta(?=[^>]*\bname=["']description["'])(?=[^>]*\bcontent=["']Un espacio oscuro y ordenado para registrar tus días, finanzas, archivos y notas\.["'])[^>]*>/i;

test("renders the Cuaderno shell and site metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, siteTitle);
  assert.match(html, siteDescription);
  assert.match(html, /<html lang=["']es["']/i);
  assert.match(html, /Ordená el ruido\./i);
  assert.doesNotMatch(html, /Starter Project/i);
});

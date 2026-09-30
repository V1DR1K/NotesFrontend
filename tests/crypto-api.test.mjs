import assert from "node:assert/strict";
import test from "node:test";
import { api, ApiError } from "../app/lib/api/client.ts";

const stored = (price = 25) => ({
  id: "lot-1", date: "2026-09-30", assetCode: "BTCUSDT", assetLabel: "Bitcoin",
  amount: { ars: 60000, usd: 50, exchangeRate: 1200 }, unitPriceUsd: price,
  quantity: 50 / price, remainingQuantity: 50 / price,
  remainingCostBasis: { ars: 60000, usd: 50, exchangeRate: 1200 }, sales: [], voided: false,
});

async function withFetch(handler, action) {
  const previous = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url, method: init.method }); return handler(url, init); };
  try { return await action(calls); }
  finally { globalThis.fetch = previous; }
}

test("confirms a persisted price after the write response is lost, without resubmitting", async () => {
  await withFetch((url, init) => init.method === "PATCH"
    ? Response.json({ detail: "Response lost after commit" }, { status: 502 }) : Response.json(stored()), async (calls) => {
    const result = await api.completeCryptoPurchasePrice("lot-1", 25);
    assert.equal(result.unitPriceUsd, 25);
    assert.deepEqual(calls.map(call => call.method), ["PATCH", "GET"]);
  });
});

test("confirms a persisted price when the successful response has malformed data", async () => {
  await withFetch((url, init) => Response.json(init.method === "PATCH" ? {} : stored()), async (calls) => {
    assert.equal((await api.completeCryptoPurchasePrice("lot-1", 25)).quantity, 2);
    assert.deepEqual(calls.map(call => call.method), ["PATCH", "GET"]);
  });
});

test("does not report success when the stored price differs after a connection failure", async () => {
  await withFetch((url, init) => {
    if (init.method === "PATCH") throw new TypeError("Connection lost");
    return Response.json(stored(20));
  }, async (calls) => {
    await assert.rejects(api.completeCryptoPurchasePrice("lot-1", 25), error => error instanceof ApiError && error.status === 503 && error.message.includes("podría haberse guardado"));
    assert.deepEqual(calls.map(call => call.method), ["PATCH", "GET"]);
  });
});

test("preserves a rejected edit and does not reconcile validation errors", async () => {
  await withFetch(() => Response.json({ detail: "Anulá las ventas antes de corregir el precio." }, { status: 400 }), async (calls) => {
    await assert.rejects(api.completeCryptoPurchasePrice("lot-1", 25), error => error instanceof ApiError && error.status === 400);
    assert.deepEqual(calls.map(call => call.method), ["PATCH"]);
  });
});

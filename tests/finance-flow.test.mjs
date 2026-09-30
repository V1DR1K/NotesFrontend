import assert from "node:assert/strict";
import test from "node:test";
import { movementType, transferRoute, transferAccounts, transferDestinations } from "../app/features/finances/financeFlow.ts";

const accounts = [
  { code: "mercadopago", type: "CASH" },
  { code: "inversiones_pesos", type: "INVESTMENT" },
  { code: "crypto", type: "CRYPTO" },
  { code: "other", type: "INVESTMENT" },
];

test("offers exactly the four allowed transfer routes", () => {
  assert.equal(transferAccounts(accounts).length, 3);
  const routes = transferAccounts(accounts).flatMap((source) => transferDestinations(accounts, source.code).map((destination) => `${source.code}->${destination.code}`));
  assert.deepEqual(routes.sort(), ["crypto->mercadopago", "inversiones_pesos->mercadopago", "mercadopago->crypto", "mercadopago->inversiones_pesos"]);
});

test("legacy investment records display as transfers in either direction", () => {
  for (const accountCode of ["crypto", "inversiones_pesos"]) {
    const income = { bucket: "INCOME", accountCode };
    const expense = { bucket: "EXPENSE", accountCode };
    assert.equal(movementType(income), "TRANSFER");
    assert.equal(movementType(expense), "TRANSFER");
    assert.deepEqual(transferRoute(income), { sourceAccountCode: "mercadopago", destinationAccountCode: accountCode });
    assert.deepEqual(transferRoute(expense), { sourceAccountCode: accountCode, destinationAccountCode: "mercadopago" });
  }
});

test("external money and historical invested records keep their classifications", () => {
  assert.equal(movementType({ accountCode: "mercadopago", bucket: "INCOME" }), "INCOME");
  assert.equal(movementType({ accountCode: "mercadopago", bucket: "EXPENSE" }), "EXPENSE");
  assert.equal(movementType({ accountCode: "crypto", bucket: "INVESTED" }), "INVESTED");
});

test("uses the explicit route from the API when editing", () => {
  const movement = { accountCode: "crypto", bucket: "EXPENSE", movementType: "TRANSFER", sourceAccountCode: "crypto", destinationAccountCode: "mercadopago" };
  assert.deepEqual(transferRoute(movement), { sourceAccountCode: "crypto", destinationAccountCode: "mercadopago" });
});

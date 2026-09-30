import type { FinanceAccount, FinanceMovement, FinanceMovementType } from "../../lib/api/types";

export function movementType(movement: FinanceMovement): FinanceMovementType {
  if (movement.movementType) return movement.movementType;
  if (movement.bucket !== "INVESTED" && movement.accountCode.toLowerCase() !== "mercadopago") return "TRANSFER";
  return movement.bucket as FinanceMovementType;
}

export function transferRoute(movement: FinanceMovement) {
  return {
    sourceAccountCode: movement.sourceAccountCode ?? (movement.bucket === "INCOME" ? "mercadopago" : movement.accountCode),
    destinationAccountCode: movement.destinationAccountCode ?? (movement.bucket === "INCOME" ? movement.accountCode : "mercadopago"),
  };
}

export function transferAccounts(accounts: FinanceAccount[]) {
  return accounts.filter((account) => account.code === "mercadopago" && account.type === "CASH" || account.code === "inversiones_pesos" && account.type === "INVESTMENT" || account.code === "crypto" && account.type === "CRYPTO");
}

export function transferDestinations(accounts: FinanceAccount[], source: string) {
  return transferAccounts(accounts).filter((account) => source === "mercadopago" ? account.code !== "mercadopago" : account.code === "mercadopago");
}

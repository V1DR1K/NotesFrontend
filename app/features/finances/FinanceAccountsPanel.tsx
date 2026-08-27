"use client";

import type { FinanceAccount } from "../../lib/api/types";
import { asNumber, formatARS, formatUSD } from "../../lib/presentation";
import { Button } from "../../ui/Primitives";

function accountKind(type: string) {
  if (type === "CASH") return "SALDO DISPONIBLE";
  if (type === "CRYPTO") return "SEGUIMIENTO MANUAL";
  return "APORTES ACUMULADOS";
}

export function FinanceAccountsPanel({ accounts, rate, onSync }: { accounts: FinanceAccount[]; rate: number; onSync: (account: FinanceAccount) => void }) {
  return <section className="finance-accounts" aria-labelledby="finance-accounts-title">
    <div className="finance-accounts-heading"><div><span className="eyebrow">SALDOS ACTUALES</span><h2 id="finance-accounts-title">Dónde está tu dinero.</h2><p>Cada movimiento actualiza su caja. Las transferencias mueven fondos entre MercadoPago y la inversión seleccionada.</p></div><span className="finance-accounts-mark" aria-hidden="true">$</span></div>
    {accounts.length ? <div className="finance-account-grid">{accounts.map((account) => <article className={`finance-account finance-account-${account.type.toLowerCase()}`} key={account.code}><div className="finance-account-top"><span className="finance-account-kind">{accountKind(account.type)}</span><span className="finance-account-dot" aria-hidden="true" /></div><h3>{account.label}</h3><strong>{formatARS(account.balanceArs)}</strong>{rate ? <span className="finance-account-usd">{formatUSD(asNumber(account.balanceArs) / rate)} en referencia USD</span> : null}<div className="finance-account-meta">{account.growthMode === "DAILY_TNA" ? <span>+ {asNumber(account.annualRatePercent).toLocaleString("es-AR")} % TNA diaria</span> : <span>Sin valuación automática</span>}<Button variant="quiet" onClick={() => onSync(account)}>Actualizar saldo</Button></div></article>)}</div> : <p className="analytics-empty">No hay cuentas configuradas.</p>}
  </section>;
}

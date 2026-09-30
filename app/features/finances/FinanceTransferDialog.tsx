"use client";

import type { FinanceAccount } from "../../lib/api/types";
import { formatARS, parseARSInput } from "../../lib/presentation";
import { Button, Dialog, FormField, FormPanel, SelectField } from "../../ui/Primitives";
import { ARSInput } from "./ARSInput";
import { transferAccounts, transferDestinations } from "./financeFlow";

export type TransferDraft = { sourceAccountCode: string; destinationAccountCode: string; date: string; amount: string; note: string };

export function FinanceTransferDialog({ accounts, draft, onChange, editing, pending, error, amountError, onClose, onSave }: {
  accounts: FinanceAccount[]; draft: TransferDraft; onChange: (draft: TransferDraft) => void;
  editing: boolean; pending: boolean; error?: string; amountError: string; onClose: () => void; onSave: () => void;
}) {
  const choices = transferAccounts(accounts);
  const destinations = transferDestinations(accounts, draft.sourceAccountCode);
  const source = choices.find((account) => account.code === draft.sourceAccountCode);
  const destination = destinations.find((account) => account.code === draft.destinationAccountCode);
  const amount = parseARSInput(draft.amount);
  return <Dialog ariaLabel={editing ? "Editar transferencia" : "Transferir dinero"} onClose={onClose}>
    <FormPanel title={editing ? "Editar transferencia" : "Transferir dinero"} description="Mové dinero entre Mercado Pago y tus inversiones. El total entre las cuentas se conserva." onClose={onClose} onSubmit={onSave} eyebrow="">
      <fieldset disabled={pending} className="finance-transfer-fields">
        <div className="form-grid form-grid-finance">
          <SelectField label="Origen" id="transfer-source" value={draft.sourceAccountCode} options={choices.map(({ code, label }) => ({ value: code, label }))} onChange={(value) => {
            const next = transferDestinations(accounts, value);
            onChange({ ...draft, sourceAccountCode: value, destinationAccountCode: next.some((account) => account.code === draft.destinationAccountCode) ? draft.destinationAccountCode : next[0]?.code ?? "" });
          }} />
          <SelectField label="Destino" id="transfer-destination" value={draft.destinationAccountCode} options={destinations.map(({ code, label }) => ({ value: code, label }))} onChange={(value) => onChange({ ...draft, destinationAccountCode: value })} />
          <label className="form-field" htmlFor="transfer-date"><span>Fecha</span><input id="transfer-date" type="date" value={draft.date} onChange={(event) => onChange({ ...draft, date: event.target.value })} required /></label>
          <label className="form-field" htmlFor="transfer-amount"><span>Importe en pesos</span><ARSInput id="transfer-amount" value={draft.amount} onChange={(amount) => onChange({ ...draft, amount })} placeholder="0" required aria-invalid={Boolean(amountError)} aria-describedby={amountError ? "transfer-amount-error" : "transfer-effect"} />{amountError ? <span id="transfer-amount-error" className="form-field-error" role="alert">{amountError}</span> : null}</label>
          <FormField label="Nota" value={draft.note} onChange={(note) => onChange({ ...draft, note })} placeholder="Opcional" multiline />
        </div>
      </fieldset>
      <p id="transfer-effect" className="finance-transfer-effect" aria-live="polite">{source && destination && amount !== null && amount > 0 ? <>Se descontarán <strong>{formatARS(amount)}</strong> de {source.label} y se acreditarán <strong>{formatARS(amount)}</strong> en {destination.label}.</> : "Elegí las cuentas e ingresá un importe para ver el efecto de la transferencia."}</p>
      {error ? <div className="inline-error" role="alert">{error}</div> : null}
      <div className="form-actions"><Button variant="quiet" onClick={onClose} disabled={pending}>Cancelar</Button><Button type="submit" disabled={pending || !source || !destination}>{pending ? "Guardando..." : editing ? "Guardar cambios" : "Transferir dinero"}</Button></div>
    </FormPanel>
  </Dialog>;
}

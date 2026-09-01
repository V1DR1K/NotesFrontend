"use client";

import type { InputHTMLAttributes } from "react";
import { useRef } from "react";
import { formatARSInput } from "../../lib/presentation";

function formattedCaret(raw: string, formatted: string, caret: number) {
  const beforeCaret = raw.slice(0, caret);
  const commaIndex = beforeCaret.indexOf(",");

  if (commaIndex >= 0) {
    const fractionDigits = beforeCaret.slice(commaIndex + 1).replace(/\D/g, "").length;
    const formattedComma = formatted.indexOf(",");
    return formattedComma >= 0 ? formattedComma + 1 + fractionDigits : formatted.length;
  }

  const integerDigits = beforeCaret.replace(/\D/g, "").length;
  if (!integerDigits) return 0;

  let seenDigits = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index])) {
      seenDigits += 1;
      if (seenDigits === integerDigits) return index + 1;
    }
  }
  return formatted.length;
}

export function ARSInput({ value, onChange, ...inputProps }: {
  value: string;
  onChange: (value: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "inputMode">) {
  const inputRef = useRef<HTMLInputElement>(null);

  return <input
    {...inputProps}
    ref={inputRef}
    type="text"
    inputMode="decimal"
    value={value}
    onChange={(event) => {
      const raw = event.currentTarget.value;
      const caret = event.currentTarget.selectionStart ?? raw.length;
      const formatted = formatARSInput(raw);
      onChange(formatted);
      requestAnimationFrame(() => {
        if (inputRef.current && document.activeElement === inputRef.current) {
          const nextCaret = formattedCaret(raw, formatted, caret);
          inputRef.current.setSelectionRange(nextCaret, nextCaret);
        }
      });
    }}
  />;
}

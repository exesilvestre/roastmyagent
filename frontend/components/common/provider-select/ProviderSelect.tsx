"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ProviderSelectProps } from "./types";
import "./styles.css";

export function ProviderSelect({
  value,
  onChange,
  options,
  disabled = false,
  ariaLabel = "Provider",
  id: idProp,
}: ProviderSelectProps) {
  const reactId = useId();
  const listboxId = `${reactId}-listbox`;
  const triggerId = idProp ?? `${reactId}-trigger`;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value) ?? options[0];
  const displayLabel = selected?.label ?? value;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <div className="providerSelect" ref={rootRef}>
      <button
        type="button"
        id={triggerId}
        className={`providerSelect_trigger ${open ? "providerSelect_triggerOpen" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((o) => !o);
          }
        }}
      >
        <span className="providerSelect_value">{displayLabel}</span>
        <span className="providerSelect_chevron" aria-hidden />
      </button>
      {open ? (
        <ul id={listboxId} className="providerSelect_list" role="listbox" aria-label={ariaLabel}>
          {options.map((opt) => {
            const isSelected = opt.id === value;
            return (
              <li key={opt.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`providerSelect_option ${isSelected ? "providerSelect_optionSelected" : ""}`}
                  onClick={() => {
                    onChange(opt.id);
                    close();
                  }}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

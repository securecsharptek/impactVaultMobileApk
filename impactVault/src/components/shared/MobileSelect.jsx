import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, X } from "lucide-react";

/**
 * MobileSelect — replaces <select> with a bottom-sheet drawer on mobile.
 * Falls back to native select appearance on desktop (no drawer opened).
 * 
 * Props:
 *   value        — current selected value (string)
 *   onChange     — (value: string) => void
 *   options      — [{ value, label }]
 *   placeholder  — string shown when nothing selected
 *   className    — extra classes for the trigger button
 */
export default function MobileSelect({ value, onChange, options = [], placeholder = "Select…", className = "" }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full flex items-center justify-between border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 ${className}`}
      >
        <span className={selected ? "text-stone-800" : "text-stone-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-stone-400 shrink-0 ml-2" />
      </button>

      {/* Bottom sheet backdrop + drawer */}
      {open && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end" onClick={() => setOpen(false)}>
          <div
            className="absolute inset-0 bg-black/40"
            aria-hidden="true"
          />
          <div
            className="relative bg-white rounded-t-2xl shadow-xl max-h-[70vh] flex flex-col overflow-x-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle + header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-stone-100">
              <div className="w-10 h-1 rounded-full bg-stone-200 mx-auto absolute top-2.5 left-1/2 -translate-x-1/2" />
              <p className="text-sm font-semibold text-stone-700 mt-1">{placeholder}</p>
              <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-stone-100">
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </div>

            {/* Options list */}
            <div className="overflow-y-auto py-2">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    className={`w-full flex items-center justify-between px-5 py-3.5 text-sm text-left transition-colors ${
                      isSelected ? "bg-amber-50 text-amber-800 font-semibold" : "text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-amber-700 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Safe area spacer */}
            <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
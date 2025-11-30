"use client";
import * as React from "react";

type CalendarProps = {
  selected?: Date;
  onSelect?: (date?: Date) => void;
  disabled?: (date: Date) => boolean;
  mode?: string;
  initialFocus?: boolean;
  captionLayout?: string;
};

export function Calendar({ selected, onSelect }: CalendarProps) {
  const [val, setVal] = React.useState(() => (selected ? toInputValue(selected) : ""));
  function toInputValue(d: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function fromInputValue(v: string) {
    const [y, m, d] = v.split("-").map(Number);
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d);
  }
  return (
    <input
      type="date"
      value={val}
      onChange={(e) => {
        const v = e.target.value;
        setVal(v);
        onSelect?.(fromInputValue(v));
      }}
      className="px-3 py-2 border rounded"
    />
  );
}

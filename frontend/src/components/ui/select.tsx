"use client";
import * as React from "react";

type SelectContextType = {
  value?: string;
  onValueChange?: (v: string) => void;
  items: Array<{ value: string; label: string }>;
};
const SelectContext = React.createContext<SelectContextType>({ value: undefined, onValueChange: undefined, items: [] });

export function Select({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children: React.ReactNode }) {
  const items: Array<{ value: string; label: string }> = [];
  function collect(node: React.ReactNode): void {
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement(child)) return;
      const el = child as React.ReactElement<any>;
      if ((el.type as any).displayName === "SelectItem") {
        const { value } = el.props as { value: string; children?: React.ReactNode };
        const label = typeof el.props.children === "string" ? el.props.children : String(value);
        items.push({ value, label });
      }
      if (el.props && el.props.children) collect(el.props.children as React.ReactNode);
    });
  }
  collect(children);
  return <SelectContext.Provider value={{ value, onValueChange, items }}>{children}</SelectContext.Provider>;
}

export function SelectTrigger({ className, children }: { className?: string; children?: React.ReactNode }) {
  const ctx = React.useContext(SelectContext);
  return (
    <select
      className={`${className ?? ""}`}
      value={ctx.value}
      onChange={(e) => ctx.onValueChange?.(e.target.value)}
    >
      <option value="" disabled hidden>
        Select an option
      </option>
      {ctx.items.map((it) => (
        <option key={it.value} value={it.value}>
          {it.label}
        </option>
      ))}
    </select>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span>{placeholder}</span>;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <option value={value}>{children}</option> as any;
}

SelectItem.displayName = "SelectItem";

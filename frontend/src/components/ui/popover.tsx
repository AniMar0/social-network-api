"use client";
import * as React from "react";

export function Popover({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
export function PopoverTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  if (asChild) return <>{children}</>;
  return <button type="button">{children}</button>;
}
export function PopoverContent({ children, className, align }: { children: React.ReactNode; className?: string; align?: string }) {
  return <div className={className}>{children}</div>;
}

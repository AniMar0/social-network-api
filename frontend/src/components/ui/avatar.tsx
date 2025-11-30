"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Avatar({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cn("inline-flex items-center justify-center rounded-full overflow-hidden bg-gray-100", className)}>{children}</div>;
}
export function AvatarImage({ src, alt = "", className }: { src?: string; alt?: string; className?: string }) {
  return <img src={src} alt={alt} className={cn("h-full w-full object-cover", className)} />;
}
export function AvatarFallback({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <div className={cn("flex items-center justify-center h-full w-full text-gray-500", className)}>{children}</div>;
}

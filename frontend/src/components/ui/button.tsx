"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
};

export function Button({ className, variant = "default", size = "md", asChild, ...props }: ButtonProps) {
  const variants: Record<string, string> = {
    default: "bg-black text-white border border-transparent hover:opacity-90",
    outline: "bg-transparent border border-gray-300 hover:bg-gray-50",
    ghost: "bg-transparent hover:bg-gray-50",
    link: "bg-transparent text-blue-600 underline-offset-4 hover:underline border-0 p-0",
  };
  const sizes: Record<string, string> = {
    sm: "px-2 py-1 text-sm rounded",
    md: "px-3 py-2 rounded",
    lg: "px-4 py-2.5 text-lg rounded",
  };
  if (asChild) {
    return (
      <span className={cn("inline-flex items-center justify-center transition outline-none", variants[variant], sizes[size], className)} {...props} />
    );
  }
  return (
    <button
      className={cn("inline-flex items-center justify-center transition outline-none", variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

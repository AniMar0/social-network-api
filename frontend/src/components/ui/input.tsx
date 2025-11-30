"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full px-3 py-2 rounded border border-gray-300 bg-white text-black placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-300",
        className
      )}
      {...props}
    />
  );
});

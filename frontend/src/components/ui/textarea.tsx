"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full px-3 py-2 rounded border border-gray-300 bg-white text-black placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-300",
        className
      )}
      {...props}
    />
  );
});

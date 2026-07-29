import { cn } from "@/lib/utils";
import React from "react";

interface LogoProps {
  showText?: boolean;
  textSize?: "12px" | "16px" | "18px" | "20px";
}

export default function Logo({ showText = true, textSize = "16px" }: LogoProps) {
  const sizeClass = {
    "12px": "text-[12px]",
    "16px": "text-[16px]",
    "18px": "text-[18px]",
    "20px": "text-[20px]",
  }[textSize];

  return (
    <div className="flex items-center gap-2.5 group cursor-pointer">
      <div className="relative flex h-7 w-7 shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-105">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-7 w-7 overflow-visible"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Book / Pages icon representing NotebookLM style */}
          <path
            d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"
            className="text-txt transition-transform duration-300 ease-out group-hover:-translate-x-[1px]"
          />
          <path
            d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
            className="text-[#c25e1a] transition-transform duration-300 ease-out group-hover:translate-x-[1px]"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex items-center tracking-tight font-bold">
          <span className={cn("text-txt", sizeClass)}>ChaiBook</span>
          {/* Only 'LM' gets the primary color for a tasteful pop */}
          <span className={cn("text-primary ml-[1px]", sizeClass)}>LM</span>
        </div>
      )}
    </div>
  );
}
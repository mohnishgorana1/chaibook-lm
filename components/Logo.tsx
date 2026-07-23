import { cn } from "@/lib/utils";
import React from "react";

interface LogoProps {
  showText?: boolean;
  textSize?: "12px" | "16px" | "18px" | "20px";
}

export default function Logo({ showText = true, textSize = "16px" }: LogoProps) {
  // Map exact pixel strings to Tailwind arbitrary text classes
  const sizeClass = {
    "12px": "text-[12px]",
    "16px": "text-[16px]",
    "18px": "text-[18px]",
    "20px": "text-[20px]",
  }[textSize];

  return (
    <div className="flex items-center gap-2 group cursor-pointer">
      {/* Logo Container with subtle glow on hover */}
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center transition-all duration-300 group-hover:drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]">
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
            className="text-orange-500 transition-transform duration-300 ease-out group-hover:translate-x-[1px]"
          />
        </svg>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex items-center">
          <span className={cn("font-sans font-black tracking-tight text-txt uppercase", sizeClass)}>
            ChaiBook
          </span>
          <span className={cn("font-sans font-black tracking-tight text-orange-500 uppercase ml-[1px]", sizeClass)}>
            LM
          </span>
        </div>
      )}
    </div>
  );
}
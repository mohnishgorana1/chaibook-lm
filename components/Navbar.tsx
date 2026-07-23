"use client";

import React from "react";
import Link from "next/link";
import { User, ArrowRight } from "lucide-react";
import { UserButton, useAuth } from "@clerk/nextjs";
import ThemeToggle from "./themes/ThemeToggle"; 
import Logo from "./Logo";

export default function Navbar() {
  const { isLoaded, userId } = useAuth();
  const isSignedIn = !!userId;

  return (
    <nav className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-subtle bg-base/80 px-6 backdrop-blur-md">
      {/* Left: Logo */}
      <Logo showText={true}/>
      {/* Right: Auth & Theme */}
      <div className="flex items-center gap-4">
        <ThemeToggle />

        {!isLoaded ? (
          <div className="h-9 w-9 animate-pulse rounded-full bg-subtle"></div>
        ) : !isSignedIn ? (
          <Link
            href="/login"
            className="group flex h-9 items-center gap-2 rounded-lg border border-subtle bg-panel px-4 transition-colors hover:bg-subtle"
          >
            <User className="h-4 w-4 text-muted group-hover:text-txt" />
            <span className="text-[13px] font-medium text-txt">Sign In</span>
          </Link>
        ) : (
          <div className="flex items-center gap-4">
            <Link 
              href="/risk-analyzer/chat/risk"
              className="flex items-center gap-2 text-[13px] font-medium text-muted hover:text-txt transition-colors"
            >
              Enter Arena <ArrowRight className="h-4 w-4" />
            </Link>
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "h-9 w-9 rounded-lg border border-subtle shadow-sm",
                },
              }}
            />
          </div>
        )}
      </div>
    </nav>
  );
}
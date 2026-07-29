"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { UserButton, useAuth } from "@clerk/nextjs";
import ThemeToggle from "./themes/ThemeToggle"; 
import Logo from "./Logo";

export default function Navbar() {
  const { isLoaded, userId } = useAuth();
  const isSignedIn = !!userId;

  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b border-subtle bg-base/80 px-6 backdrop-blur-md transition-colors duration-300">
      <Logo showText={true} />
      
      <div className="flex items-center gap-3">
        <ThemeToggle />

        {!isLoaded ? (
          <div className="h-8 w-8 animate-pulse rounded-lg bg-subtle"></div>
        ) : !isSignedIn ? (
          <Link
            href="/login"
            className="flex h-8 items-center rounded-lg border border-subtle bg-panel px-4 text-[13px] font-medium text-txt transition-all hover:bg-input hover:text-primary"
          >
            Sign in
          </Link>
        ) : (
          <div className="flex items-center gap-4">
            <Link 
              href="/notebook"
              className="group flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-txt transition-colors"
            >
              Workspace 
              <ArrowRight className="h-3.5 w-3.5 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
            <div className="flex items-center justify-center rounded-lg border border-subtle p-0.5 bg-panel hover:border-primary/40 transition-colors">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "h-7 w-7 rounded-md",
                  },
                }}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
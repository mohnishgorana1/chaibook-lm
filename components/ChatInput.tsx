"use client";

import React, { useState, useRef, useEffect } from "react";
import { CornerDownLeft, Loader2, Globe } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";

interface ChatInputProps {
  onSendMessage: (message: string, useWebSearch: boolean) => void;
  placeholder?: string;
  isLoading?: boolean;
}

export default function ChatInput({ 
  onSendMessage, 
  placeholder = "Message Chai GPT...", 
  isLoading = false 
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [useWebSearch, setUseWebSearch] = useState(false);
  const pathname = usePathname();
  
  const isChaiGpt = pathname?.includes("/chai-gpt");

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    // Message ke saath web search toggle boolean state pass ki
    onSendMessage(input.trim(), useWebSearch);
    
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  return (
    <div className="shrink-0 bg-base p-4 pb-6">
      <div className="mx-auto w-full flex flex-col gap-2">
        
        {/* Phase 1: Web Search Toggle UI */}
        <AnimatePresence>
          {isChaiGpt && (
            <motion.button
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              type="button"
              onClick={() => setUseWebSearch(!useWebSearch)}
              className={`flex items-center gap-1.5 w-fit px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${
                useWebSearch
                  ? "bg-blue-500/10 text-blue-500 border-blue-500/30 shadow-sm"
                  : "bg-input text-muted border-subtle hover:text-txt hover:bg-subtle"
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              {useWebSearch ? "Web Search: ON" : "Web Search: OFF"}
            </motion.button>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="relative flex w-full items-end gap-2 rounded-lg border border-subtle bg-input px-3 py-2.5 focus-within:border-muted transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            rows={1}
            disabled={isLoading}
            className="max-h-[200px] min-h-[24px] w-full resize-none bg-transparent px-2 py-1 text-[13px] font-medium text-txt outline-none placeholder:text-muted disabled:opacity-50 font-sans custom-thin-scrollbar"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <AnimatePresence mode="wait">
            <motion.button
              key={isLoading ? "loading" : "idle"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              type="submit"
              disabled={!input.trim() || isLoading}
              className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-txt text-base disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CornerDownLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
              )}
            </motion.button>
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
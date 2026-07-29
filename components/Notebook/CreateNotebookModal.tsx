"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, X, BookOpen, Sparkles } from "lucide-react";

export default function CreateNotebookModal({ onCreate }: { onCreate: (title: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate(title);
    setIsOpen(false);
    setTitle("");
  };

  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-md transition-all duration-300">
      <div className="relative w-full max-w-[420px] overflow-hidden rounded-[24px] border border-subtle/80 bg-panel/95 backdrop-blur-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 ring-1 ring-white/10 dark:ring-white/5">
        
        <div className="flex items-center justify-between border-b border-subtle/50 px-6 py-5 bg-base/30">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-inner">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
               <h2 className="text-[15px] font-bold text-txt">Initialize Workspace</h2>
               <p className="text-[11px] text-muted font-medium mt-0.5">Create an isolated vector index</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="rounded-xl p-2 text-muted transition-colors hover:bg-input hover:text-txt">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleCreate}>
          <div className="p-6">
            <label htmlFor="title" className="mb-2 block text-[12px] font-bold uppercase tracking-wider text-muted">Notebook Title</label>
            <input
              type="text"
              id="title"
              autoFocus
              placeholder="e.g., Quantum Physics Research"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-subtle bg-input/50 px-4 py-3.5 text-[14px] font-medium text-txt placeholder:text-muted/60 transition-all focus:bg-panel focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-subtle/50 bg-base/30 px-6 py-5">
            <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl px-5 py-2.5 text-[13px] font-bold text-muted transition-colors hover:bg-input hover:text-txt">
              Cancel
            </button>
            <button type="submit" disabled={!title.trim()} className="flex min-w-[120px] items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-[13px] font-bold text-white transition-all hover:bg-primary-hover hover:shadow-[0_4px_20px_rgba(var(--color-primary),0.3)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none">
              <Sparkles className="h-3.5 w-3.5" /> Initialize
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="group flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[13px] font-bold text-white shadow-sm transition-all hover:bg-primary-hover hover:shadow-[0_4px_20px_rgba(var(--color-primary),0.3)] active:scale-95">
        <Plus className="h-4 w-4" />
        <span>New Notebook</span>
      </button>
      {mounted && createPortal(modalContent, document.body)}
    </>
  );
}
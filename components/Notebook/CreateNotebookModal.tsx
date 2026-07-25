"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, X, BookOpen } from "lucide-react";

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 backdrop-blur-md transition-all duration-300">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-subtle bg-panel shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between border-b border-subtle px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 shadow-inner">
              <BookOpen className="h-4 w-4" />
            </div>
            <h2 className="text-[17px] font-semibold tracking-tight text-txt">Create Notebook</h2>
          </div>
          <button onClick={() => setIsOpen(false)} className="rounded-full p-2 text-muted transition-colors hover:bg-subtle hover:text-txt">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleCreate}>
          <div className="p-6">
            <label htmlFor="title" className="mb-2 block text-sm font-medium text-txt">Notebook Title</label>
            <input
              type="text"
              id="title"
              autoFocus
              placeholder="e.g., Quantum Physics Research"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-subtle bg-input px-4 py-3.5 text-[15px] text-txt placeholder:text-muted/60 transition-all focus:border-txt/20 focus:bg-panel focus:outline-none focus:ring-4 focus:ring-txt/5"
            />
            <p className="mt-3 text-[13px] font-medium text-muted/80">This creates an isolated, distraction-free workspace.</p>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-subtle bg-base/30 px-6 py-5">
            <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-subtle hover:text-txt">
              Cancel
            </button>
            <button type="submit" disabled={!title.trim()} className="flex min-w-[110px] items-center justify-center rounded-xl bg-txt px-5 py-2.5 text-sm font-semibold text-base transition-all hover:bg-txt/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="group flex h-11 items-center justify-center gap-2 rounded-xl bg-txt px-5 text-[14px] font-medium text-base shadow-sm transition-all hover:scale-[1.02] hover:shadow-md active:scale-95">
        <Plus className="h-4 w-4" />
        <span>New Notebook</span>
      </button>
      {mounted && createPortal(modalContent, document.body)}
    </>
  );
}
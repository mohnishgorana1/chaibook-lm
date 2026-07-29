"use client";

import React, { useState, useEffect } from "react";
import { X, AlertTriangle, Edit2, Trash2 } from "lucide-react";

interface NotebookActionModalProps {
    isOpen: boolean;
    type: "rename" | "delete";
    notebook: any;
    onClose: () => void;
    onConfirm: (id: string, newTitle?: string) => void;
}

export default function NotebookActionModal({ isOpen, type, notebook, onClose, onConfirm }: NotebookActionModalProps) {
    const [newTitle, setNewTitle] = useState("");

    useEffect(() => {
        if (isOpen && notebook) {
            setNewTitle(notebook.title);
        }
    }, [isOpen, notebook]);

    if (!isOpen || !notebook) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (type === "rename") {
            if (newTitle.trim() && newTitle.trim() !== notebook.title) {
                onConfirm(notebook._id || notebook.id, newTitle.trim());
            } else {
                onClose(); 
            }
        } else {
            onConfirm(notebook._id || notebook.id);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-md transition-all duration-300">
            <div className="relative w-full max-w-[420px] overflow-hidden rounded-[24px] border border-subtle/80 bg-panel/95 backdrop-blur-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 ring-1 ring-white/10 dark:ring-white/5">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-subtle/50 px-6 py-5 bg-base/30">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-inner border ${type === "rename" ? "bg-primary/10 border-primary/20 text-primary" : "bg-red-500/10 border-red-500/20 text-red-500"}`}>
                            {type === "rename" ? <Edit2 className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                        </div>
                        <div>
                           <h2 className="text-[15px] font-bold text-txt">{type === "rename" ? "Rename Notebook" : "Delete Notebook"}</h2>
                           <p className="text-[11px] text-muted font-medium mt-0.5">{type === "rename" ? "Update workspace alias" : "Remove workspace & vectors"}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-xl p-2 text-muted transition-colors hover:bg-input hover:text-txt">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        {type === "rename" ? (
                            <div>
                                <label className="mb-2 block text-[12px] font-bold uppercase tracking-wider text-muted">Notebook Name</label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    autoFocus
                                    className="w-full rounded-2xl border border-subtle bg-input/50 px-4 py-3.5 text-[14px] font-medium text-txt placeholder:text-muted/60 transition-all focus:bg-panel focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10"
                                    placeholder="Enter new alias..."
                                />
                            </div>
                        ) : (
                            <div className="rounded-2xl bg-red-500/5 p-5 border border-red-500/20">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                                    <div>
                                        <h3 className="text-[13px] font-bold text-red-500 mb-1.5">Irreversible Destructive Action</h3>
                                        <p className="text-[12px] leading-relaxed text-muted">
                                            Are you sure you want to purge <strong>&quot;{notebook.title}&quot;</strong>? This will permanently delete the index and all synthesized context vectors.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 border-t border-subtle/50 bg-base/30 px-6 py-5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-5 py-2.5 text-[13px] font-bold text-muted transition-colors hover:bg-input hover:text-txt"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`flex min-w-[120px] items-center justify-center rounded-xl px-5 py-2.5 text-[13px] font-bold text-white transition-all active:scale-[0.98] ${
                                type === "rename" 
                                ? "bg-primary hover:bg-primary-hover shadow-sm hover:shadow-[0_4px_20px_rgba(var(--color-primary),0.3)] disabled:opacity-50" 
                                : "bg-red-500 hover:bg-red-600 shadow-sm hover:shadow-[0_4px_20px_rgba(239,68,68,0.3)]"
                            }`}
                            disabled={type === "rename" && (!newTitle.trim() || newTitle.trim() === notebook.title)}
                        >
                            {type === "rename" ? "Save Changes" : "Confirm Purge"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

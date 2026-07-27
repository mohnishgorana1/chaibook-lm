"use client";

import React, { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";

interface NotebookActionModalProps {
    isOpen: boolean;
    type: "rename" | "delete";
    notebook: any;
    onClose: () => void;
    onConfirm: (id: string, newTitle?: string) => void;
}

export default function NotebookActionModal({ isOpen, type, notebook, onClose, onConfirm }: NotebookActionModalProps) {
    const [newTitle, setNewTitle] = useState("");

    // Reset input when modal opens with a new notebook
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
                onClose(); // No change made
            }
        } else {
            onConfirm(notebook._id || notebook.id);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md scale-100 p-6 opacity-100 transition-all bg-panel border border-subtle rounded-2xl shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-semibold text-txt">
                        {type === "rename" ? "Rename Notebook" : "Delete Notebook"}
                    </h2>
                    <button onClick={onClose} className="text-muted hover:text-txt rounded-full p-1 transition-colors hover:bg-subtle">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit}>
                    {type === "rename" ? (
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-muted mb-2">Notebook Name</label>
                            <input
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                autoFocus
                                className="w-full rounded-xl border border-subtle bg-base px-4 py-3 text-txt placeholder-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                placeholder="Enter new name..."
                            />
                        </div>
                    ) : (
                        <div className="mb-6 rounded-xl bg-red-500/10 p-4 border border-red-500/20">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                                <div>
                                    <h3 className="text-sm font-bold text-red-500 mb-1">Warning: Irreversible Action</h3>
                                    <p className="text-sm text-muted">
                                        Are you sure you want to delete <strong>"{notebook.title}"</strong>? This will permanently delete the notebook and all its vector sources.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2 text-sm font-semibold text-muted hover:bg-subtle transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all ${
                                type === "rename" 
                                ? "bg-orange-500 hover:bg-orange-600 shadow-md shadow-orange-500/20" 
                                : "bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/20"
                            }`}
                        >
                            {type === "rename" ? "Save Changes" : "Yes, Delete"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
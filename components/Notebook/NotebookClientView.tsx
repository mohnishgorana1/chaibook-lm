"use client";

import React, { useOptimistic, startTransition, useState } from "react";
import { BookOpen, Sparkles } from "lucide-react";
import NotebookCard from "./NotebookCard";
import CreateNotebookModal from "./CreateNotebookModal";
import NotebookActionModal from "./NotebookActionModal"; // 🔥 Import Modal
import { createNotebookAction, renameNotebookAction, deleteNotebookAction } from "@/lib/actions/notebook/notebook.actions"; 

// 🔥 Add DELETE action type
type OptimisticAction = 
  | { type: "ADD"; payload: any }
  | { type: "RENAME"; payload: { id: string; title: string } }
  | { type: "DELETE"; payload: { id: string } };

export default function NotebookClientView({ initialNotebooks }: { initialNotebooks: any[] }) {
    
    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: "rename" | "delete";
        notebook: any | null;
    }>({ isOpen: false, type: "rename", notebook: null });

    const [optimisticNotebooks, dispatchOptimistic] = useOptimistic(
        initialNotebooks,
        (state, action: OptimisticAction) => {
            switch (action.type) {
                case "ADD":
                    return [action.payload, ...state];
                case "RENAME":
                    return state.map((nb) => 
                        nb._id === action.payload.id 
                            ? { ...nb, title: action.payload.title, isOptimistic: true } 
                            : nb
                    );
                case "DELETE":
                    return state.filter((nb) => nb._id !== action.payload.id); // 🔥 Remove from UI instantly
                default:
                    return state;
            }
        }
    );

    const handleCreateNotebook = async (title: string) => {
        // ... (Tumhara existing ADD code)
        const tempId = `temp_${Date.now()}`;
        const tempNotebook = {
            _id: tempId, id: tempId, title: title, sourcesCount: 0,
            updatedAt: new Date().toISOString(), accentColor: "text-txt", accentBg: "bg-subtle", borderColor: "group-hover:border-subtle", isOptimistic: true, 
        };
        startTransition(() => { dispatchOptimistic({ type: "ADD", payload: tempNotebook }); });
        try { await createNotebookAction(title); } catch (error) { alert("Failed to create notebook."); }
    };

    // 🔥 Modal Submit Handler
    const handleModalConfirm = async (id: string, newTitle?: string) => {
        const actionType = modalConfig.type;
        setModalConfig({ ...modalConfig, isOpen: false }); // Close modal immediately

        if (actionType === "rename" && newTitle) {
            startTransition(() => {
                dispatchOptimistic({ type: "RENAME", payload: { id, title: newTitle } });
            });
            try {
                await renameNotebookAction(id, newTitle);
            } catch (error) {
                alert("Failed to rename notebook.");
            }
        } else if (actionType === "delete") {
            startTransition(() => {
                dispatchOptimistic({ type: "DELETE", payload: { id } });
            });
            try {
                await deleteNotebookAction(id); // Server call to delete
            } catch (error) {
                alert("Failed to delete notebook.");
            }
        }
    };

    return (
        <div className="flex h-full flex-col overflow-y-auto custom-thin-scrollbar">
            <header className="sticky top-0 z-10 flex flex-col gap-5 border-b border-subtle/50 bg-base/80 px-8 py-6 backdrop-blur-xl sm:flex-row sm:items-end sm:justify-between lg:px-12">
                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-orange-500">Workspace</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-txt">My Notebooks</h1>
                </div>
                <CreateNotebookModal onCreate={handleCreateNotebook} />
            </header>

            <main className="flex-1 px-8 py-10 lg:px-12">
                {optimisticNotebooks.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {optimisticNotebooks.map((notebook) => (
                            <div key={notebook._id} className="transition-all duration-300">
                                <NotebookCard 
                                    notebook={notebook} 
                                    onAction={(type, nb) => setModalConfig({ isOpen: true, type, notebook: nb })} 
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    // ... (Tumhara existing empty state)
                    <div className="flex h-[55vh] w-full flex-col items-center justify-center rounded-[32px] border border-dashed border-subtle bg-panel/30 text-center">
                        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-subtle/30 text-muted shadow-inner">
                            <BookOpen className="h-8 w-8 opacity-50" />
                        </div>
                        <h3 className="mb-2 text-xl font-semibold tracking-tight text-txt">No notebooks yet</h3>
                    </div>
                )}
            </main>

            {/* 🔥 Custom Action Modal Render */}
            <NotebookActionModal 
                isOpen={modalConfig.isOpen} 
                type={modalConfig.type} 
                notebook={modalConfig.notebook} 
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} 
                onConfirm={handleModalConfirm} 
            />
        </div>
    );
}
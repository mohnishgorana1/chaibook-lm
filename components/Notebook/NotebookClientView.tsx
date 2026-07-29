"use client";

import React, { useOptimistic, startTransition, useState } from "react";
import { BookOpen, Sparkles, Database } from "lucide-react";
import NotebookCard from "./NotebookCard";
import CreateNotebookModal from "./CreateNotebookModal";
import NotebookActionModal from "./NotebookActionModal";
import { createNotebookAction, renameNotebookAction, deleteNotebookAction } from "@/lib/actions/notebook/notebook.actions"; 

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
                    return state.filter((nb) => nb._id !== action.payload.id);
                default:
                    return state;
            }
        }
    );

    const handleCreateNotebook = async (title: string) => {
        const tempId = `temp_${Date.now()}`;
        const tempNotebook = {
            _id: tempId, id: tempId, title: title, sourcesCount: 0,
            updatedAt: new Date().toISOString(), isOptimistic: true, 
        };
        startTransition(() => { dispatchOptimistic({ type: "ADD", payload: tempNotebook }); });
        try { await createNotebookAction(title); } catch (error) { alert("Failed to create notebook."); }
    };

    const handleModalConfirm = async (id: string, newTitle?: string) => {
        const actionType = modalConfig.type;
        setModalConfig({ ...modalConfig, isOpen: false });

        if (actionType === "rename" && newTitle) {
            startTransition(() => { dispatchOptimistic({ type: "RENAME", payload: { id, title: newTitle } }); });
            try { await renameNotebookAction(id, newTitle); } catch (error) { alert("Failed to rename notebook."); }
        } else if (actionType === "delete") {
            startTransition(() => { dispatchOptimistic({ type: "DELETE", payload: { id } }); });
            try { await deleteNotebookAction(id); } catch (error) { alert("Failed to delete notebook."); }
        }
    };

    return (
        <div className="flex h-full flex-col overflow-y-auto custom-thin-scrollbar bg-base">
            <header className="sticky top-0 z-10 flex flex-col gap-5 border-b border-subtle/40 bg-base/80 px-8 py-8 backdrop-blur-2xl sm:flex-row sm:items-end sm:justify-between lg:px-12">
                <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary shadow-sm backdrop-blur-md">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Command Center</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-txt sm:text-4xl">My Notebooks</h1>
                </div>
                <CreateNotebookModal onCreate={handleCreateNotebook} />
            </header>

            <main className="flex-1 px-8 py-10 lg:px-12 relative z-0">
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
                    <div className="flex flex-col items-center justify-center mt-20 animate-in fade-in zoom-in duration-700 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none"></div>
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] bg-panel border border-subtle shadow-xl shadow-primary/5 relative z-10">
                            <Database className="h-8 w-8 text-muted/50" />
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight text-txt mb-2 relative z-10">No notebooks initialized</h3>
                        <p className="text-[14px] leading-relaxed text-muted mb-8 relative z-10">Create an isolated workspace to begin aggregating knowledge.</p>
                    </div>
                )}
            </main>

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
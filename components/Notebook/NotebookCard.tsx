"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, Edit2, Trash2, Calendar, FileText, ChevronRight } from "lucide-react"; // 🔥 Naye icons add kiye

interface Notebook {
  id?: string;
  _id?: string;
  title: string;
  sourcesCount?: number; // Made optional to handle undefined gracefully
  updatedAt?: string;
  accentColor: string;
  accentBg: string;
  borderColor: string;
  isOptimistic?: boolean;
}

interface NotebookCardProps {
    notebook: Notebook;
    onAction: (type: "rename" | "delete", notebook: Notebook) => void; 
}

export default function NotebookCard({ notebook, onAction }: NotebookCardProps) {
  const notebookId = notebook._id || notebook.id;
  
  // 🔥 BUG FIX: Ensure sourcesCount is always a number
  const safeSourcesCount = notebook.sourcesCount || 0;

  const updatedDateLabel = notebook.updatedAt
    ? new Date(notebook.updatedAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    : "Just now";

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    onAction("rename", notebook);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    onAction("delete", notebook);
  };

  const CardContent = (
    <div className={`group relative flex h-[210px] flex-col justify-between overflow-hidden rounded-[24px] border border-subtle bg-panel p-6 shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-white/5 ${notebook.borderColor}`}>
      
      {/* ✨ Premium Glow Effect behind the icon */}
      <div className={`absolute -right-10 -top-10 h-40 w-40 rounded-full ${notebook.accentBg} opacity-40 blur-3xl transition-transform duration-700 group-hover:scale-150`}></div>

      <div className="relative z-10 flex items-start justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-[18px] ${notebook.accentBg} ${notebook.accentColor} shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
          <BookOpen className="h-6 w-6" />
        </div>

        {/* 🔥 Sleek Actions Row */}
        <div className="flex items-center gap-1.5 opacity-0 translate-x-2 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
            <button
                onClick={handleEditClick}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-base/80 text-muted backdrop-blur-md transition-all hover:bg-subtle hover:text-txt border border-transparent hover:border-subtle"
                title="Rename Notebook"
            >
                <Edit2 className="h-4 w-4" />
            </button>
            <button
                onClick={handleDeleteClick}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-base/80 text-muted backdrop-blur-md transition-all hover:bg-red-500/10 hover:text-red-500 border border-transparent hover:border-red-500/20"
                title="Delete Notebook"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
      </div>
      
      <div className="relative z-10 mt-auto">
        <h3 className="mb-4 truncate text-[20px] font-bold tracking-tight text-txt transition-colors group-hover:text-txt">
          {notebook.title}
        </h3>
        
        {/* 🔥 New Badge Design for Metadata */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-subtle bg-base/50 px-3 py-1.5 text-[12px] font-medium text-muted transition-colors group-hover:border-txt/10 group-hover:text-txt/80 group-hover:bg-base">
            <FileText className="h-3.5 w-3.5" />
            {safeSourcesCount} {safeSourcesCount === 1 ? 'Source' : 'Sources'}
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-subtle bg-base/50 px-3 py-1.5 text-[12px] font-medium text-muted transition-colors group-hover:border-txt/10 group-hover:text-txt/80 group-hover:bg-base">
            <Calendar className="h-3.5 w-3.5" />
            {updatedDateLabel}
          </div>
        </div>
      </div>

      {/* Subtle interaction indicator on hover */}
      <div className="absolute bottom-7 right-6 opacity-0 transition-all duration-300 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0">
         <ChevronRight className={`h-5 w-5 ${notebook.accentColor}`} />
      </div>
    </div>
  );

  if (notebook.isOptimistic) {
    return (
      <div className="opacity-50 cursor-wait scale-[0.98] pointer-events-none transition-all duration-300">
        {CardContent}
      </div>
    );
  }

  return (
    <Link href={`/notebook/${notebookId}`} className="block outline-none rounded-[24px] focus-visible:ring-4 focus-visible:ring-txt/10">
      {CardContent}
    </Link>
  );
}
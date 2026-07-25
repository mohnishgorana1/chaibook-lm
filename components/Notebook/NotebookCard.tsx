"use client";

import React from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";

interface Notebook {
  id?: string;
  _id?: string;
  title: string;
  sourcesCount: number;
  updatedAt?: string;
  accentColor: string;
  accentBg: string;
  borderColor: string;
  isOptimistic?: boolean;
}

export default function NotebookCard({ notebook }: { notebook: Notebook }) {
  const notebookId = notebook._id || notebook.id;

  const updatedDateLabel = notebook.updatedAt
    ? new Date(notebook.updatedAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    : "No date";

  const CardContent = (
    <div className={`group relative flex h-44 flex-col justify-between rounded-[24px] border border-subtle bg-panel p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5 ${notebook.borderColor}`}>
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${notebook.accentBg} ${notebook.accentColor} shadow-inner transition-transform duration-300 group-hover:scale-110`}>
          <BookOpen className="h-5 w-5" />
        </div>
      </div>
      <div>
        <h3 className="mb-1.5 truncate text-[17px] font-semibold tracking-tight text-txt transition-colors group-hover:text-orange-500">
          {notebook.title}
        </h3>
        <div className="flex items-center gap-2 text-[13px] font-medium text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-txt/30"></span>
            {notebook.sourcesCount} Sources
          </span>
          <span className="opacity-50">•</span>
          <span>{updatedDateLabel}</span>
        </div>
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
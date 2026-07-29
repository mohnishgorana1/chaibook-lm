"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, X, UploadCloud, Link2, Loader2, Type, File as FileIcon, Globe, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { createSourceAction } from "@/lib/actions/source/source.actions";
import { FaYoutube } from "react-icons/fa";

export default function AddSourceModal({ notebookId }: { notebookId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"file" | "link" | "text">("file");
  const [urlInput, setUrlInput] = useState("");
  const [rawTextInput, setRawTextInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // 🔥 Drag & Drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 🔥 Validation Logic
  const isValidFile = (file: File) => {
    const validExtensions = ['pdf', 'txt', 'csv', 'md', 'vtt', 'srt'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    return fileExt ? validExtensions.includes(fileExt) : false;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (isValidFile(selectedFile)) {
        setFile(selectedFile);
      } else {
        alert("Unsupported file format! Please select a PDF, TXT, CSV, MD, VTT, or SRT file.");
        e.target.value = ''; 
      }
    }
  };

  // 🔥 Drag Events Setup
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      const selectedFile = droppedFiles[0];
      if (isValidFile(selectedFile)) {
        setFile(selectedFile);
      } else {
        alert("Unsupported file format! Please drop a PDF, TXT, CSV, MD, VTT, or SRT file.");
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let finalSourceUrl = "";
      let sourceType: "PDF" | "TEXT" | "URL" | "YOUTUBE" | "TRANSCRIPT" = "URL";
      let sourceTitle = "";

      if (activeTab === "link") {
        if (!urlInput.trim()) return;
        finalSourceUrl = urlInput;
        sourceTitle = urlInput;
        sourceType = urlInput.includes("youtube.com") || urlInput.includes("youtu.be") ? "YOUTUBE" : "URL";
      }
      else if (activeTab === "text") {
        if (!rawTextInput.trim()) return;
        sourceType = "TEXT";
        sourceTitle = `Text: ${rawTextInput.substring(0, 20)}...`;

        const textFile = new File([rawTextInput], `pasted-text-${Date.now()}.txt`, { type: "text/plain" });

        const { data, error } = await supabase.storage
          .from('chaibook-sources')
          .upload(textFile.name, textFile);

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage.from('chaibook-sources').getPublicUrl(textFile.name);
        finalSourceUrl = publicUrlData.publicUrl;
      }
      else {
        if (!file) return;

        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (fileExt === 'pdf') sourceType = "PDF";
        else if (fileExt === 'txt' || fileExt === 'csv' || fileExt === 'md') sourceType = "TEXT";
        else if (fileExt === 'vtt' || fileExt === 'srt') sourceType = "TRANSCRIPT";
        else throw new Error("Unsupported file format");

        sourceTitle = file.name;
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
        const fileName = `${Date.now()}-${cleanFileName}`;

        const { data, error } = await supabase.storage.from('chaibook-sources').upload(fileName, file);
        if (error) throw error;

        const { data: publicUrlData } = supabase.storage.from('chaibook-sources').getPublicUrl(fileName);
        finalSourceUrl = publicUrlData.publicUrl;
      }

      await createSourceAction({
        notebookId,
        title: sourceTitle,
        type: sourceType,
        sourceUrl: finalSourceUrl
      });

      setIsOpen(false);
      setUrlInput("");
      setRawTextInput("");
      setFile(null);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to add source. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-md transition-all">
      <div className="relative w-full max-w-[480px] overflow-hidden rounded-[24px] border border-subtle/80 bg-panel/95 backdrop-blur-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 ring-1 ring-white/10 dark:ring-white/5">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-subtle/50 px-6 py-5 bg-base/30">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-inner">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-txt">Add New Source</h2>
              <p className="text-[11px] text-muted font-medium mt-0.5">Expand your notebook's knowledge</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="rounded-xl p-2 text-muted hover:bg-input hover:text-txt transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex w-full border-b border-subtle/50 bg-base/20 px-2 pt-2">
          <button onClick={() => setActiveTab("file")} className={`flex flex-1 items-center justify-center gap-2 py-3 text-[13px] font-semibold transition-all rounded-t-xl ${activeTab === "file" ? "bg-panel border-b-2 border-primary text-primary shadow-sm" : "text-muted hover:text-txt hover:bg-input/50"}`}>
            <UploadCloud className="h-4 w-4" /> File
          </button>
          <button onClick={() => setActiveTab("link")} className={`flex flex-1 items-center justify-center gap-2 py-3 text-[13px] font-semibold transition-all rounded-t-xl ${activeTab === "link" ? "bg-panel border-b-2 border-primary text-primary shadow-sm" : "text-muted hover:text-txt hover:bg-input/50"}`}>
            <Link2 className="h-4 w-4" /> Link
          </button>
          <button onClick={() => setActiveTab("text")} className={`flex flex-1 items-center justify-center gap-2 py-3 text-[13px] font-semibold transition-all rounded-t-xl ${activeTab === "text" ? "bg-panel border-b-2 border-primary text-primary shadow-sm" : "text-muted hover:text-txt hover:bg-input/50"}`}>
            <Type className="h-4 w-4" /> Raw Text
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">

            {/* 🔥 FILE TAB (Drag & Drop + Validation) */}
            {activeTab === "file" && (
              <div 
                className={`group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 cursor-pointer ${
                  isDragging 
                    ? "border-primary bg-primary/10 scale-[1.02] shadow-[0_0_20px_rgba(var(--color-primary),0.15)]" 
                    : file 
                      ? "border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/60" 
                      : "border-subtle bg-input/40 hover:border-primary/40 hover:bg-primary/5"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()} 
              >
                {file ? (
                   <>
                     <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shadow-sm">
                        <FileIcon className="h-6 w-6" />
                     </div>
                     <h3 className="mb-1.5 text-[14px] font-bold text-txt truncate max-w-[280px]">{file.name}</h3>
                     <p className="text-[11px] font-semibold tracking-wide text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/> Ready to synthesize</p>
                   </>
                ) : (
                   <>
                    <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border transition-colors duration-300 ${isDragging ? "bg-primary/20 border-primary/30 text-primary" : "bg-panel border-subtle text-muted group-hover:text-primary group-hover:border-primary/20 group-hover:bg-primary/5"} shadow-sm`}>
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <h3 className="mb-1.5 text-[14px] font-bold text-txt">
                        {isDragging ? "Drop to upload" : "Click or drag file here"}
                    </h3>
                    <p className="mb-2 text-[12px] font-medium text-muted/80">Supports PDF, TXT, CSV, MD, VTT, SRT</p>
                   </>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  id="file-upload" 
                  accept=".pdf,.txt,.csv,.md,.vtt,.srt" 
                  onChange={handleFileChange} 
                />
              </div>
            )}

            {/* 🔥 LINK TAB */}
            {activeTab === "link" && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-300">
                <div className="flex gap-4">
                  <div className="group flex flex-1 flex-col items-center justify-center rounded-2xl border border-subtle/80 bg-input/40 p-5 text-center transition-all hover:bg-panel hover:border-red-500/30 hover:shadow-sm">
                    <FaYoutube className="mb-2 h-7 w-7 text-red-500/80 group-hover:text-red-500 transition-colors" />
                    <span className="text-[12px] font-semibold text-txt">YouTube Video</span>
                  </div>
                  <div className="group flex flex-1 flex-col items-center justify-center rounded-2xl border border-subtle/80 bg-input/40 p-5 text-center transition-all hover:bg-panel hover:border-blue-500/30 hover:shadow-sm">
                    <Globe className="mb-2 h-7 w-7 text-blue-500/80 group-hover:text-blue-500 transition-colors" />
                    <span className="text-[12px] font-semibold text-txt">Web Article</span>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-muted"><Link2 className="h-4 w-4" /></div>
                  <input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full rounded-2xl border border-subtle bg-input/50 pl-11 pr-4 py-3.5 text-[14px] font-medium text-txt placeholder:text-muted/60 focus:bg-panel focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  />
                </div>
              </div>
            )}

            {/* 🔥 TEXT TAB */}
            {activeTab === "text" && (
              <div className="flex flex-col gap-2 animate-in fade-in duration-300">
                <textarea
                  placeholder="Paste your raw transcript, code, or article here..."
                  value={rawTextInput}
                  onChange={(e) => setRawTextInput(e.target.value)}
                  rows={6}
                  className="w-full rounded-2xl border border-subtle bg-input/50 p-4 text-[13.5px] leading-relaxed text-txt placeholder:text-muted/60 focus:bg-panel focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all outline-none custom-thin-scrollbar resize-none"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-subtle/50 bg-base/50 px-6 py-4">
            <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-2.5 text-[13px] font-bold text-muted transition-colors hover:bg-input hover:text-txt">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || (activeTab === "link" && !urlInput.trim()) || (activeTab === "file" && !file) || (activeTab === "text" && !rawTextInput.trim())}
              className="flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[13px] font-bold text-white transition-all hover:bg-primary-hover hover:shadow-[0_4px_20px_rgba(var(--color-primary),0.3)] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Indexing...</> : "Process Data"}
            </button>
          </div>
        </form>

      </div>
    </div>
  ) : null;

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2.5 text-[12px] font-bold uppercase tracking-wider text-primary shadow-sm transition-all hover:bg-primary hover:text-white hover:shadow-md hover:border-primary active:scale-[0.98]">
        <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" /> Add Source
      </button>
      {mounted && createPortal(modalContent, document.body)}
    </>
  );
}
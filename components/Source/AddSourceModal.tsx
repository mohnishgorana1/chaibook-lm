"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, X, UploadCloud, Link2, Loader2, Type, File as FileIcon } from "lucide-react";
import { FaYoutube } from 'react-icons/fa'
import { supabase } from "@/lib/supabase/client";
import { createSourceAction } from "@/lib/actions/source/source.actions";

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-all">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-subtle bg-panel shadow-2xl animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-subtle px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
              <Plus className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-txt">Add New Source</h2>
          </div>
          <button onClick={() => setIsOpen(false)} className="rounded-xl p-2 text-muted hover:bg-subtle hover:text-txt">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex w-full border-b border-subtle bg-base/50">
          <button onClick={() => setActiveTab("file")} className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${activeTab === "file" ? "border-b-2 border-orange-500 text-orange-500" : "text-muted hover:text-txt"}`}>
            <UploadCloud className="h-4 w-4" /> File
          </button>
          <button onClick={() => setActiveTab("link")} className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${activeTab === "link" ? "border-b-2 border-orange-500 text-orange-500" : "text-muted hover:text-txt"}`}>
            <Link2 className="h-4 w-4" /> Link
          </button>
          <button onClick={() => setActiveTab("text")} className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${activeTab === "text" ? "border-b-2 border-orange-500 text-orange-500" : "text-muted hover:text-txt"}`}>
            <Type className="h-4 w-4" /> Raw Text
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">

            {/* 🔥 FILE TAB (Drag & Drop + Validation) */}
            {activeTab === "file" && (
              <div 
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 cursor-pointer ${
                  isDragging 
                    ? "border-orange-500 bg-orange-500/10 scale-[1.02]" 
                    : file 
                      ? "border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10" 
                      : "border-subtle bg-base hover:border-orange-500/50 hover:bg-orange-500/5"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()} 
              >
                {file ? (
                   <>
                     <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                        <FileIcon className="h-6 w-6" />
                     </div>
                     <h3 className="mb-1 text-sm font-bold text-txt truncate max-w-[250px]">{file.name}</h3>
                     <p className="text-xs font-medium text-emerald-500">Ready to upload</p>
                   </>
                ) : (
                   <>
                    <UploadCloud className={`mb-4 h-10 w-10 transition-colors duration-200 ${isDragging ? "text-orange-500" : "text-orange-500/50"}`} />
                    <h3 className="mb-1 text-sm font-bold text-txt">
                        {isDragging ? "Drop file here" : "Click or drag file to this area"}
                    </h3>
                    <p className="mb-4 text-xs font-medium text-muted">Supports PDF, TXT, CSV, MD, VTT, SRT</p>
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

            {/* LINK TAB */}
            {activeTab === "link" && (
              <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-subtle bg-base p-4 text-center">
                    <FaYoutube className="mb-2 h-6 w-6 text-red-500" />
                    <span className="text-[11px] font-semibold text-muted">YouTube</span>
                  </div>
                  <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-subtle bg-base p-4 text-center">
                    <Link2 className="mb-2 h-6 w-6 text-blue-500" />
                    <span className="text-[11px] font-semibold text-muted">Website</span>
                  </div>
                </div>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=... or https://example.com"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full rounded-xl border border-subtle bg-base px-4 py-3 text-[15px] text-txt placeholder:text-muted/50 focus:border-orange-500 focus:outline-none"
                />
              </div>
            )}

            {/* TEXT TAB */}
            {activeTab === "text" && (
              <div className="flex flex-col gap-2">
                <textarea
                  placeholder="Paste your article, code, or notes here..."
                  value={rawTextInput}
                  onChange={(e) => setRawTextInput(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-subtle bg-base p-4 text-[14px] text-txt placeholder:text-muted/50 focus:border-orange-500 focus:outline-none custom-thin-scrollbar resize-none"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-subtle bg-base/50 px-6 py-4">
            <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-muted transition-colors hover:bg-subtle hover:text-txt">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || (activeTab === "link" && !urlInput.trim()) || (activeTab === "file" && !file) || (activeTab === "text" && !rawTextInput.trim())}
              className="flex min-w-[120px] items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Process Data"}
            </button>
          </div>
        </form>

      </div>
    </div>
  ) : null;

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500/10 border border-orange-500/20 px-4 py-2.5 text-sm font-bold text-orange-500 transition-all hover:bg-orange-500 hover:text-white">
        <Plus className="h-4 w-4" /> Add Source
      </button>
      {mounted && createPortal(modalContent, document.body)}
    </>
  );
}
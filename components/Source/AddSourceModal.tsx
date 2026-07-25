"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, X, UploadCloud, Link2, Loader2 } from "lucide-react";
import { FaYoutube } from 'react-icons/fa'
import { supabase } from "@/lib/supabase/client";
import { createSourceAction } from "@/lib/actions/source/source.actions";

export default function AddSourceModal({ notebookId }: { notebookId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"file" | "link">("file");
  const [urlInput, setUrlInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let finalSourceUrl = "";
      let sourceType: "PDF" | "TEXT" | "URL" | "YOUTUBE" | "TRANSCRIPT" = "URL";
      let sourceTitle = "";

      console.log("Active tab", activeTab)

      if (activeTab === "link") {
        // --- 1. LINK LOGIC ---
        if (!urlInput.trim()) return;
        finalSourceUrl = urlInput;
        sourceTitle = urlInput; // Future update: Isko YouTube API se fetch karke real title de sakte hain
        sourceType = urlInput.includes("youtube.com") || urlInput.includes("youtu.be") ? "YOUTUBE" : "URL";
        console.log("LINK ", finalSourceUrl, sourceTitle, sourceType)
      } else {
        // --- 2. FILE UPLOAD LOGIC ---
        if (!file) return;

        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (fileExt === 'pdf') sourceType = "PDF";
        else if (fileExt === 'txt') sourceType = "TEXT";
        else if (fileExt === 'vtt' || fileExt === 'srt') sourceType = "TRANSCRIPT";
        else throw new Error("Unsupported file format");

        console.log("FILE: ", sourceType, fileExt);

        sourceTitle = file.name;


        // Generate a unique clean filename
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
        const fileName = `${Date.now()}-${cleanFileName}`;

        console.log("filename", fileName);

        

        // Upload to Supabase bucket
        const { data, error } = await supabase.storage
          .from('chaibook-sources')
          .upload(fileName, file);


        if (error) {
          console.log("error spbse", error)
          throw error
        };

        // Get the public URL directly from Supabase
        const { data: publicUrlData } = supabase.storage
          .from('chaibook-sources')
          .getPublicUrl(fileName);

        finalSourceUrl = publicUrlData.publicUrl;

        console.log("finalSourceUrl", finalSourceUrl);
      }



      // --- 3. CREATE MONGODB DOCUMENT ---
      await createSourceAction({
        notebookId,
        title: sourceTitle,
        type: sourceType,
        sourceUrl: finalSourceUrl
      });

      // --- 4. CLEANUP & CLOSE ---
      setIsOpen(false);
      setUrlInput("");
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
          <button onClick={() => setIsOpen(false)} className="rounded-xl p-2 text-muted transition-colors hover:bg-subtle hover:text-txt">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex w-full border-b border-subtle bg-base/50">
          <button
            onClick={() => setActiveTab("file")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${activeTab === "file" ? "border-b-2 border-orange-500 text-orange-500" : "text-muted hover:text-txt"
              }`}
          >
            <UploadCloud className="h-4 w-4" />
            Upload File
          </button>
          <button
            onClick={() => setActiveTab("link")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${activeTab === "link" ? "border-b-2 border-orange-500 text-orange-500" : "text-muted hover:text-txt"
              }`}
          >
            <Link2 className="h-4 w-4" />
            Paste Link
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">

            {/* FILE UPLOAD TAB */}
            {activeTab === "file" && (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-subtle bg-base p-8 text-center transition-colors hover:border-orange-500/50 hover:bg-orange-500/5">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <h3 className="mb-1 text-sm font-bold text-txt">
                  {file ? file.name : "Click to upload or drag and drop"}
                </h3>
                <p className="mb-4 text-xs font-medium text-muted">Supports PDF, TXT, VTT, SRT</p>
                <input type="file" className="hidden" id="file-upload" accept=".pdf,.txt,.vtt,.srt" onChange={handleFileChange} />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer rounded-lg bg-panel px-4 py-2 text-sm font-semibold text-txt border border-subtle hover:bg-subtle transition-colors"
                >
                  {file ? "Change File" : "Select File"}
                </label>
              </div>
            )}

            {/* PASTE LINK TAB */}
            {activeTab === "link" && (
              <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-subtle bg-base p-4 text-center">
                    <FaYoutube className="mb-2 h-6 w-6 text-red-500" />
                    <span className="text-xs font-semibold text-muted">YouTube Video</span>
                  </div>
                  <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-subtle bg-base p-4 text-center">
                    <Link2 className="mb-2 h-6 w-6 text-blue-500" />
                    <span className="text-xs font-semibold text-muted">Website URL</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="url" className="text-sm font-semibold text-txt">Enter URL</label>
                  <input
                    type="url"
                    id="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full rounded-xl border border-subtle bg-base px-4 py-3 text-[15px] text-txt placeholder:text-muted/50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-subtle bg-base/50 px-6 py-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-muted transition-colors hover:bg-subtle hover:text-txt"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || (activeTab === "link" && !urlInput.trim()) || (activeTab === "file" && !file)}
              className="flex min-w-[120px] items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : activeTab === "file" ? "Upload & Process" : "Process Link"}
            </button>
          </div>
        </form>

      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500/10 border border-orange-500/20 px-4 py-2.5 text-sm font-bold text-orange-500 transition-all hover:bg-orange-500 hover:text-white"
      >
        <Plus className="h-4 w-4" />
        Add Source
      </button>
      {mounted && createPortal(modalContent, document.body)}
    </>
  );
}
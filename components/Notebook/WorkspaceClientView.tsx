"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Link2, MessageSquare, Captions,
  FileType, Clock, CheckCircle2, Loader2,
  PanelLeftClose, PanelLeft, PanelRightClose, PanelRight, Menu, X, ExternalLink, Trash2,
  Sparkles, ArrowUp
} from "lucide-react";
import { FaYoutube } from 'react-icons/fa';
import AddSourceModal from "@/components/Source/AddSourceModal";
import { deleteSourceAction } from "@/lib/actions/source/source.actions";
import ReactMarkdown from "react-markdown";

// Helper Functions
const getSourceIcon = (type: string) => {
  switch (type) {
    case "PDF": return <FileText className="h-4 w-4 text-rose-500" />;
    case "YOUTUBE": return <FaYoutube className="h-4 w-4 text-red-500" />;
    case "TRANSCRIPT": return <Captions className="h-4 w-4 text-emerald-500" />;
    case "TEXT": return <FileType className="h-4 w-4 text-amber-500" />;
    default: return <Link2 className="h-4 w-4 text-blue-500" />;
  }
};

const getStatusIndicator = (status: string) => {
  switch (status) {
    case "READY": return <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-500"><CheckCircle2 className="h-3 w-3" /> Ready</div>;
    case "INDEXING":
    case "PROCESSING": return <div className="flex items-center gap-1.5 text-[11px] font-medium text-orange-500"><Loader2 className="h-3 w-3 animate-spin" /> Processing</div>;
    default: return <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted"><Clock className="h-3 w-3" /> Pending</div>;
  }
};

type PreviewData = {
  title: string;
  type: string;
  contentUrl?: string;
  snippet?: string;
} | null;

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function WorkspaceClientView({ notebook, initialSources }: { notebook: any, initialSources: any[] }) {
  const router = useRouter();

  // UI States
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Preview & Deletion State
  const [activePreview, setActivePreview] = useState<PreviewData>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Citations State
  const [currentCitations, setCurrentCitations] = useState<any[]>([]);

  // =====================================================================
  // 🚀 NATIVE CHAT STREAMING LOGIC
  // =====================================================================
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    setCurrentCitations([]); 

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          notebookId: notebook._id,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch response");

      const sourcesHeader = response.headers.get("x-sources");
      if (sourcesHeader) {
        try {
          const decodedSources = JSON.parse(atob(sourcesHeader));
          setCurrentCitations(decodedSources);
        } catch (error) {
          console.error("Failed to parse citations", error);
        }
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      
      if (!reader) throw new Error("No reader found");

      const aiMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: aiMessageId, role: "assistant", content: "" }]);

      let aiContent = "";
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        aiContent += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId ? { ...msg, content: aiContent } : msg
          )
        );
      }
    } catch (error) {
      console.error("Chat Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const isAnySourceProcessing = initialSources.some(
      (src) => src.status === "INDEXING" || src.status === "PROCESSING"
    );

    if (isAnySourceProcessing) {
      const interval = setInterval(() => {
        router.refresh();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [initialSources, router]);

  const handleOpenPreview = (source: any) => {
    setActivePreview({
      title: source.title,
      type: source.type,
      contentUrl: source.sourceUrl || "", 
      snippet: "Full source view selected. Ask questions in the chat to see relevant snippets here."
    });
    setRightOpen(true);
  };

  const handleDeleteSource = async (e: React.MouseEvent, source: any) => {
    e.stopPropagation(); 
    if (!confirm(`Are you sure you want to delete "${source.title}"?`)) return;

    setDeletingId(source._id);
    try {
      await deleteSourceAction(source._id, notebook._id);
      if (activePreview?.title === source.title) {
        setActivePreview(null);
        setRightOpen(false);
      }
    } catch (error) {
      console.error("Delete failed", error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-base">

      {/* MOBILE OVERLAY */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ========================================== */}
      {/* LEFT COLUMN: SOURCES PANEL                 */}
      {/* ========================================== */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col border-r border-subtle bg-panel/80 backdrop-blur-xl transition-all duration-300 ease-in-out
          lg:relative lg:z-0
          ${leftOpen ? "w-[280px] translate-x-0" : "w-[280px] -translate-x-full lg:w-0 lg:-translate-x-full lg:border-r-0"}
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-subtle/50 px-5">
          <div className="flex items-center gap-3 overflow-hidden">
            <Link href="/notebook" className="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-input hover:text-txt">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex flex-col overflow-hidden">
              <h2 className="truncate text-[14px] font-semibold tracking-tight text-txt">{notebook.title}</h2>
              <span className="text-[11px] font-medium text-muted">{initialSources.length} Sources</span>
            </div>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-2 text-muted hover:text-txt">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 shrink-0">
          <AddSourceModal notebookId={notebook._id} />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 custom-thin-scrollbar">
          <h3 className="mb-3 px-1 text-[10px] font-bold uppercase tracking-wider text-muted/80">Knowledge Base</h3>
          <div className="flex flex-col gap-1.5">
            {initialSources.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-subtle p-5 text-center">
                <p className="text-[12px] leading-relaxed text-muted">No sources yet. Add documents to start.</p>
              </div>
            ) : (
              initialSources.map((src) => (
                <div
                  key={src._id}
                  onClick={() => handleOpenPreview(src)}
                  className={`group relative flex cursor-pointer items-start gap-3 rounded-2xl border p-2.5 transition-colors ${activePreview?.title === src.title ? "bg-input border-subtle" : "border-transparent hover:bg-input/50"}`}
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-panel shadow-sm">
                    {getSourceIcon(src.type)}
                  </div>
                  <div className="flex flex-col overflow-hidden pr-8">
                    <span className="truncate text-[13px] font-medium text-txt" title={src.title}>{src.title}</span>
                    {getStatusIndicator(src.status)}
                  </div>

                  <button
                    onClick={(e) => handleDeleteSource(e, src)}
                    disabled={deletingId === src._id}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1.5 text-muted hover:bg-red-500/10 hover:text-red-500 disabled:opacity-100"
                  >
                    {deletingId === src._id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* MIDDLE COLUMN: MAIN CHAT INTERFACE         */}
      {/* ========================================== */}
      <div className="relative flex flex-1 flex-col min-w-0 bg-base transition-all duration-300">
        
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-subtle/50 bg-panel/40 px-4 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <button onClick={() => setLeftOpen(!leftOpen)} className="hidden rounded-xl p-2 text-muted transition-colors hover:bg-subtle hover:text-txt lg:block">
              {leftOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
            </button>
            <button onClick={() => setMobileMenuOpen(true)} className="rounded-xl p-2 text-muted transition-colors hover:bg-subtle hover:text-txt lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            {!leftOpen && <span className="ml-2 hidden text-[14px] font-semibold text-txt lg:block">{notebook.title}</span>}
          </div>
          <div className="flex items-center gap-2 text-txt">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <span className="text-[13px] font-bold tracking-wide">ChaiBookLM</span>
          </div>
          <button onClick={() => setRightOpen(!rightOpen)} className="hidden rounded-xl p-2 text-muted transition-colors hover:bg-subtle hover:text-txt lg:block">
            {rightOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRight className="h-5 w-5" />}
          </button>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-6 pb-40 custom-thin-scrollbar">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-panel shadow-sm border border-subtle">
                <MessageSquare className="h-6 w-6 text-txt/40" />
              </div>
              <p className="text-[15px] font-medium text-txt">Ask anything about your sources.</p>
              <p className="mt-1 text-[13px] text-muted">ChaiBookLM is ready to fetch answers.</p>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-6">
              {messages.map((m) => (
                m.role === "user" ? (
                  // ================= USER MESSAGE (Right aligned, tasteful) =================
                  <div key={m.id} className="flex w-full justify-end group">
                    <div className="max-w-[80%] rounded-[24px] rounded-tr-[4px] bg-subtle/30 border border-subtle px-5 py-3.5 text-[15px] leading-relaxed text-txt shadow-sm">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  // ================= AI MESSAGE (Full width, sleek) =================
                  <div key={m.id} className="flex w-full items-start gap-4 py-2 group">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0 text-[15px] leading-relaxed text-txt">
                      <div className="prose prose-sm prose-invert max-w-none text-txt">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                      
                      {/* Citations Block */}
                      {currentCitations.length > 0 && messages[messages.length - 1].id === m.id && (
                        <div className="mt-5 border-t border-subtle pt-3">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Sources</span>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {currentCitations.map((cite, i) => (
                              <button 
                                key={i}
                                onClick={() => {
                                  setActivePreview({
                                    title: `Source ${i + 1}`,
                                    type: "TEXT",
                                    snippet: cite.snippet
                                  });
                                  setRightOpen(true);
                                }}
                                className="flex items-center gap-1.5 rounded-lg border border-subtle bg-panel px-2.5 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-subtle hover:text-txt"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Source {i + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              ))}

              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex w-full items-start gap-4 py-2">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-panel border border-subtle shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-muted" />
                  </div>
                  <div className="flex-1 mt-1 text-[14px] font-medium text-muted animate-pulse">
                    Thinking...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* INPUT FORM WITH MASK EFFECT                */}
        {/* ========================================== */}
        <div className="absolute bottom-0 left-0 w-full pointer-events-none">
          {/* Gradient Mask to fade text as it scrolls up */}
          <div className="h-24 w-full bg-gradient-to-t from-base via-base/80 to-transparent" />
          
          <div className="bg-base px-4 sm:px-8 pb-6 pt-2 pointer-events-auto">
            <form onSubmit={handleChatSubmit} className="mx-auto max-w-3xl">
              <div className="relative flex items-center rounded-full border border-subtle bg-panel p-1.5 shadow-sm transition-all focus-within:border-txt/30 focus-within:ring-4 focus-within:ring-txt/5 hover:border-txt/20">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={initialSources.length === 0 ? "Add a source to start chatting..." : "Message ChaiBookLM..."} 
                  disabled={initialSources.length === 0 || isLoading} 
                  className="w-full bg-transparent px-5 py-3 text-[15px] text-txt placeholder:text-muted/60 outline-none disabled:cursor-not-allowed disabled:opacity-50" 
                />
                <button 
                  type="submit"
                  disabled={initialSources.length === 0 || isLoading || !input.trim()} 
                  className="mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-txt text-base transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-base" /> : <ArrowUp className="h-5 w-5 text-base" />}
                </button>
              </div>
            </form>
            <div className="text-center mt-3">
               <span className="text-[11px] text-muted/60">AI can make mistakes. Consider verifying important information.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* RIGHT COLUMN: PRO SOURCE VIEWER            */}
      {/* ========================================== */}
      <div
        className={`
          hidden flex-col border-l border-subtle bg-panel/30 transition-all duration-300 ease-in-out lg:flex
          ${rightOpen ? "w-[360px] xl:w-[420px] opacity-100" : "w-0 overflow-hidden opacity-0 border-l-0"}
        `}
      >
        {/* Dynamic Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-subtle/50 px-5 bg-panel/50 backdrop-blur-md">
          <div className="flex items-center gap-2 overflow-hidden">
            {activePreview ? getSourceIcon(activePreview.type) : <Captions className="h-4 w-4 text-muted" />}
            <span className="truncate text-[13px] font-semibold text-txt">
              {activePreview ? activePreview.title : "Source Viewer"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {activePreview?.contentUrl && (
              <a href={activePreview.contentUrl} target="_blank" rel="noreferrer" className="rounded-full p-1.5 text-muted hover:bg-input hover:text-txt" title="Open Original">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button onClick={() => setRightOpen(false)} className="rounded-full p-1.5 text-muted hover:bg-input hover:text-txt">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Content Body */}
        <div className="flex flex-1 flex-col overflow-y-auto p-4 custom-thin-scrollbar">
          {!activePreview ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted">
              <div className="w-full max-w-[280px] rounded-[24px] border border-dashed border-subtle p-8 bg-base/50">
                <Captions className="mx-auto mb-3 h-6 w-6 text-muted/40" />
                <p className="text-[13px] leading-relaxed">Click a source or citation<br />to preview content here.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
              
              {/* Context Snippet (Text) */}
              <div className="rounded-2xl border border-subtle bg-base p-4">
                <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Retrieved Snippet</h4>
                <p className="text-[13.5px] leading-relaxed text-txt">
                  {activePreview.snippet}
                </p>
              </div>

              {/* Media Preview (iframe for YouTube/PDF) */}
              {(activePreview.type === "YOUTUBE" || activePreview.type === "PDF") && activePreview.contentUrl && (
                <div className="overflow-hidden rounded-2xl border border-subtle bg-base">
                  <div className="flex items-center justify-between border-b border-subtle bg-panel px-3 py-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Media Preview</span>
                  </div>
                  {activePreview.type === "YOUTUBE" ? (
                    <div className="aspect-video w-full bg-black">
                      <iframe
                        className="h-full w-full"
                        src={activePreview.contentUrl.replace("watch?v=", "embed/")}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="aspect-[1/1.4] w-full bg-input">
                      <iframe
                        src={`${activePreview.contentUrl}#view=FitH`}
                        className="h-full w-full opacity-90"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
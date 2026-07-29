"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Link2, MessageSquare, Captions,
  FileType, Clock, CheckCircle2, Loader2,
  PanelLeftClose, PanelLeft, PanelRightClose, PanelRight, Menu, X, ExternalLink, Trash2,
  Sparkles, ArrowUp, Clock4, Globe, Map, PlayCircle, BookOpen, Headphones,
  Play, Pause, SkipBack, SkipForward, Search, Layers, ShieldCheck, Cpu,
  Database
} from "lucide-react";
import { FaYoutube } from 'react-icons/fa';
import AddSourceModal from "@/components/Source/AddSourceModal";
import { deleteSourceAction } from "@/lib/actions/source/source.actions";
import { generatePodcastAction } from "@/lib/actions/podcast/podcast.actions";
import ReactMarkdown from "react-markdown";

// ==========================================
// HELPER FUNCTIONS & TYPES
// ==========================================
const getSourceIcon = (type: string) => {
  switch (type?.toUpperCase()) {
    case "PDF": return <FileText className="h-4 w-4 text-rose-500" />;
    case "YOUTUBE": return <FaYoutube className="h-4 w-4 text-red-500" />;
    case "TRANSCRIPT": return <Captions className="h-4 w-4 text-emerald-500" />;
    case "URL":
    case "WEBSITE": return <Globe className="h-4 w-4 text-blue-500" />;
    case "TEXT": return <FileType className="h-4 w-4 text-amber-500" />;
    case "PODCAST": return <Headphones className="h-4 w-4 text-purple-500" />;
    default: return <Link2 className="h-4 w-4 text-blue-500" />;
  }
};

const getStatusIndicator = (status: string) => {
  switch (status) {
    case "READY": return <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-500"><CheckCircle2 className="h-3 w-3" /> Ready</div>;
    case "INDEXING":
    case "PROCESSING": return <div className="flex items-center gap-1.5 text-[10px] font-medium text-primary"><Loader2 className="h-3 w-3 animate-spin" /> Processing</div>;
    default: return <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted"><Clock className="h-3 w-3" /> Pending</div>;
  }
};

const formatTimestamp = (seconds: number | string) => {
  const num = typeof seconds === 'string' ? parseInt(seconds, 10) : seconds;
  if (isNaN(num) || !isFinite(num)) return "00:00";
  const m = Math.floor(num / 60).toString().padStart(2, '0');
  const s = Math.floor(num % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

type PreviewData = { title: string; type: string; contentUrl?: string; snippet?: string; pageNumber?: number; timestamp?: number; } | null;
type Message = { id: string; role: "user" | "assistant"; content: string; };

// ==========================================
// COMPONENT 1: LEFT SIDEBAR
// ==========================================
const LeftSidebar = ({ notebook, initialSources, leftOpen, mobileMenuOpen, setMobileMenuOpen, activePreview, setActivePreview, setRightOpen }: any) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenPreview = (source: any) => {
    setActivePreview({ title: source.title, type: source.type, contentUrl: source.sourceUrl, snippet: "Ask questions to see relevant chunks here." });
    setRightOpen(true);
    setMobileMenuOpen(false);
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
    } catch (error) { console.error("Delete failed"); } finally { setDeletingId(null); }
  };

  return (
    // 🔥 FIX: Added overflow-hidden to parent and fixed width 260px wrapper inside to stop squishing
    <div className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-panel/60 backdrop-blur-2xl transition-all duration-300 ease-in-out lg:relative lg:z-0 overflow-hidden ${leftOpen ? "w-[260px] border-r border-subtle/60" : "w-0 border-r-0"} ${mobileMenuOpen ? "w-[260px] translate-x-0" : "lg:translate-x-0"}`}>
      <div className="w-[260px] flex flex-col h-full shrink-0">
        
        {/* Sidebar Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-subtle/40 px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <Link href="/notebook" className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-input hover:text-txt"><ArrowLeft className="h-4 w-4" /></Link>
            <div className="flex flex-col overflow-hidden">
              <h2 className="truncate text-[13px] font-bold tracking-tight text-txt">{notebook.title}</h2>
              <span className="text-[10px] font-medium text-muted">{initialSources.length} Sources</span>
            </div>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-1.5 rounded-lg text-muted hover:bg-input hover:text-txt"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-4 shrink-0 add-source-wrapper">
          <AddSourceModal notebookId={notebook._id} />
        </div>

        {/* Sources List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 custom-thin-scrollbar">
          <div className="mb-3 flex items-center gap-2 px-1">
            <div className="h-1.5 w-1.5 rounded-full bg-primary/60"></div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">Knowledge Base</h3>
          </div>
          
          <div className="flex flex-col gap-1.5">
            {initialSources.length === 0 ? (
              <div className="rounded-xl border border-dashed border-subtle p-6 text-center bg-panel/30">
                <Layers className="mx-auto h-5 w-5 text-muted/40 mb-2" />
                <p className="text-[12px] leading-relaxed text-muted">Context empty.<br/>Add sources to begin.</p>
              </div>
            ) : (
              initialSources.map((src: any) => (
                <div key={src._id} onClick={() => handleOpenPreview(src)} className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border p-2.5 transition-all duration-300 ${activePreview?.title === src.title ? "bg-panel shadow-sm border-subtle" : "border-transparent bg-transparent hover:bg-input/50 hover:border-subtle/40"}`}>
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-base border border-subtle shadow-xs">{getSourceIcon(src.type)}</div>
                  <div className="flex flex-col overflow-hidden pr-8 w-full">
                    <span className="truncate text-[12px] font-semibold text-txt" title={src.title}>{src.title}</span>
                    {getStatusIndicator(src.status)}
                  </div>
                  <button onClick={(e) => handleDeleteSource(e, src)} disabled={deletingId === src._id} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-md p-1.5 text-muted hover:bg-red-500/10 hover:text-red-500 disabled:opacity-100">
                    {deletingId === src._id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT 2: CHAT INTERFACE
// ==========================================
const ChatInterface = ({ notebook, initialSources, leftOpen, setLeftOpen, rightOpen, setRightOpen, setMobileMenuOpen, isRoadmapMode, setIsRoadmapMode, isPodcastMode, setIsPodcastMode, setActivePreview, setPodcastLibrary, currentCitations, setCurrentCitations }: any) => {
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

    if (isPodcastMode) {
      try {
        const aiMessageId = (Date.now() + 1).toString();
        setMessages((prev) => [...prev, { id: aiMessageId, role: "assistant", content: "🎙️ Structuring transcript & synthesizing vocal nodes..." }]);

        const res = await generatePodcastAction(notebook._id, userMessage.content);

        if (res.success) {
          setMessages((prev) => prev.map((msg) => msg.id === aiMessageId ? { ...msg, content: "✅ **Acoustic synthesis complete.** Acoustic Engine opened in right panel." } : msg));
          if (res.podcastObj) setPodcastLibrary((prev: any) => [...prev, res.podcastObj]);

          setActivePreview({ title: `Podcast: ${userMessage.content.substring(0, 30)}...`, type: "PODCAST", contentUrl: res.audioUrl, snippet: res.script });
          setRightOpen(true);
        }
      } catch (error: any) {
        alert(error.message || "Podcast generation failed");
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: "❌ Synthesis failed. Check token limits or logs." }]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const apiEndpoint = isRoadmapMode ? "/api/roadmap" : "/api/chat";
    await fetchAndStream(apiEndpoint, { messages: updatedMessages, notebookId: notebook._id, topic: input });
  };

  const fetchAndStream = async (endpoint: string, payload: any) => {
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error((await response.json()).error || "Failed to fetch response");

      const sourcesHeader = response.headers.get("x-sources");
      if (sourcesHeader) {
        try { setCurrentCitations(JSON.parse(atob(sourcesHeader))); } catch (error) { console.error("Failed to parse citations"); }
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
        aiContent += decoder.decode(value, { stream: true });
        setMessages((prev) => prev.map((msg) => msg.id === aiMessageId ? { ...msg, content: aiContent } : msg));
      }
    } catch (error: any) {
      console.error("Stream Error:", error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmptyStateBtnClick = () => {
    if (window.innerWidth < 1024) setMobileMenuOpen(true); 
    setTimeout(() => {
      const btn = document.querySelector('.add-source-wrapper button') as HTMLButtonElement;
      if (btn) btn.click();
    }, 100);
  };

  return (
    <div className="relative flex flex-1 flex-col min-w-0 bg-base/40 transition-all duration-300">
      
      {/* Glassy Chat Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-subtle/40 bg-panel/30 px-4 backdrop-blur-xl z-10">
        <div className="flex items-center gap-2">
          <button onClick={() => setLeftOpen(!leftOpen)} className="hidden rounded-lg p-1.5 text-muted transition-colors hover:bg-input hover:text-txt lg:block">
            {leftOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </button>
          <button onClick={() => setMobileMenuOpen(true)} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-input hover:text-txt lg:hidden"><Menu className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center gap-2 text-txt">
          {isPodcastMode ? <Headphones className="h-4 w-4 text-purple-500" /> : isRoadmapMode ? <Map className="h-4 w-4 text-emerald-500"/> : <Sparkles className="h-4 w-4 text-primary" />}
          <span className="text-[13px] font-bold tracking-wide">
            {isPodcastMode ? "Acoustic Engine" : isRoadmapMode ? "Roadmap Architect" : "ChaiBookLM"}
          </span>
        </div>
        {initialSources.length > 0 && (
          <button onClick={() => setRightOpen(!rightOpen)} className="hidden rounded-lg p-1.5 text-muted transition-colors hover:bg-input hover:text-txt lg:block">
            {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-8 pb-44 custom-thin-scrollbar relative">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            {initialSources.length === 0 ? (
              <div className="flex flex-col items-center max-w-sm animate-in fade-in zoom-in duration-700 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/20 blur-[80px] rounded-full pointer-events-none"></div>
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-panel border border-subtle shadow-xl shadow-primary/5 relative z-10">
                  <Database className="h-7 w-7 text-txt" />
                </div>
                <h2 className="text-2xl font-bold text-txt mb-2 relative z-10">Empty Workspace</h2>
                <p className="text-[14px] leading-relaxed text-muted mb-8 relative z-10">
                  Inject documents, web URLs, or media transcripts to establish your isolated vector index.
                </p>
                <button onClick={handleEmptyStateBtnClick} className="relative z-10 flex cursor-pointer items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary bg-primary/5 px-6 py-2.5 rounded-full border border-primary/20 hover:bg-primary/10 transition-all shadow-sm">
                  <ArrowLeft className="h-4 w-4 hidden lg:block" />
                  <ArrowUp className="h-4 w-4 lg:hidden" />
                  Inject Source Data
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center animate-in fade-in duration-500">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-panel shadow-sm border border-subtle"><MessageSquare className="h-5 w-5 text-muted" /></div>
                <p className="text-[15px] font-semibold text-txt">Index initialized.</p>
                <p className="text-[13px] text-muted mt-1 max-w-xs">Query the system, architect roadmaps, or synthesize audio streams.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-8">
            {messages.map((m) => (
              m.role === "user" ? (
                // 🔥 Exact mockup style User Bubble
                <div key={m.id} className="flex w-full justify-end group">
                  <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-subtle/30 border border-subtle px-5 py-3 text-[13.5px] leading-relaxed text-txt shadow-sm backdrop-blur-sm">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex w-full items-start gap-4 py-2 group">
                  <div className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border shadow-xs ${isPodcastMode ? 'bg-purple-500/10 border-purple-500/20' : isRoadmapMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-primary/5 border-primary/20'}`}>
                    <Sparkles className={`h-3.5 w-3.5 ${isPodcastMode ? 'text-purple-500' : isRoadmapMode ? 'text-emerald-500' : 'text-primary'}`} />
                  </div>
                  <div className="flex-1 min-w-0 text-[14px] leading-relaxed text-txt">
                    <div className="prose prose-sm max-w-none text-txt prose-p:leading-relaxed prose-headings:text-txt prose-strong:text-txt">
                      <ReactMarkdown components={{
                        p: ({ node, ...props }) => <div className="mb-4" {...props} />,
                        h3: ({ node, ...props }) => (
                          <div className="mt-8 mb-3 flex items-center gap-2.5">
                            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-subtle border border-subtle/50"><Map className="h-3.5 w-3.5 text-txt" /></div>
                            <h3 className="text-[13px] font-bold text-txt uppercase tracking-wider m-0" {...props} />
                          </div>
                        ),
                        a: ({ href, children }) => {
                          if (href?.startsWith("#cite-")) {
                            const sourceIndex = parseInt(href.replace("#cite-", "")) - 1;
                            const cite = currentCitations[sourceIndex];
                            if (!cite) return <span className="font-semibold text-primary">{children}</span>;

                            if (isRoadmapMode) {
                              return (
                                <div className="mt-4 mb-2">
                                  <button type="button" onClick={() => { setActivePreview({ title: cite.title || `Source ${sourceIndex + 1}`, type: cite.type, contentUrl: cite.url, snippet: cite.snippet, pageNumber: cite.pageNumber ? Number(cite.pageNumber) : undefined, timestamp: cite.timestamp ? Number(cite.timestamp) : undefined }); setRightOpen(true); }} className="flex w-full max-w-md items-center justify-between gap-4 rounded-xl border border-subtle bg-panel/60 px-4 py-3 text-left transition-all hover:border-emerald-500/30 hover:bg-panel hover:shadow-md group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-input border border-subtle transition-colors group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20">{getSourceIcon(cite.type)}</div>
                                      <div className="flex flex-col overflow-hidden">
                                        <span className="truncate text-[13px] font-semibold text-txt transition-colors">{cite.title || `Source Document ${sourceIndex + 1}`}</span>
                                        <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted mt-0.5">
                                          {cite.type === "YOUTUBE" && cite.timestamp !== undefined ? <><Clock4 className="h-3 w-3" /> Starts at {formatTimestamp(cite.timestamp)}</> : null}
                                          {cite.type === "PDF" && cite.pageNumber !== undefined ? <><FileText className="h-3 w-3" /> Reference: Page {cite.pageNumber}</> : null}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex shrink-0 items-center justify-center h-7 w-7 rounded-full bg-subtle text-txt transition-all group-hover:bg-emerald-500/10 group-hover:text-emerald-500">{cite.type === "YOUTUBE" ? <PlayCircle className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}</div>
                                  </button>
                                </div>
                              );
                            }
                            return (
                              <button type="button" onClick={() => { setActivePreview({ title: cite.title || `Source ${sourceIndex + 1}`, type: cite.type, contentUrl: cite.url, snippet: cite.snippet, pageNumber: cite.pageNumber ? Number(cite.pageNumber) : undefined, timestamp: cite.timestamp ? Number(cite.timestamp) : undefined }); setRightOpen(true); }} className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/15 transition-all mx-1 shadow-xs active:scale-95">
                                {getSourceIcon(cite.type)}<span className="max-w-[120px] truncate" title={cite.title}>{cite.title || `Source ${sourceIndex + 1}`}</span>
                              </button>
                            );
                          }
                          return <a href={href} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{children}</a>;
                        }
                      }}>{m.content}</ReactMarkdown>
                    </div>

                    {/* Citations Footer Area */}
                    {!isRoadmapMode && !isPodcastMode && currentCitations.length > 0 && messages[messages.length - 1].id === m.id && (
                      <div className="mt-6 border-t border-subtle/60 pt-4">
                        <div className="flex items-center gap-1.5 mb-3">
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Grounded In Sources</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {currentCitations.map((cite: any, i: number) => (
                            <button key={i} onClick={() => { setActivePreview({ title: cite.title || `Source ${i + 1}`, type: cite.type, contentUrl: cite.url, snippet: cite.snippet, pageNumber: cite.pageNumber ? Number(cite.pageNumber) : undefined, timestamp: cite.timestamp ? Number(cite.timestamp) : undefined }); setRightOpen(true); }} className="group/btn flex items-center gap-2 rounded-lg border border-subtle bg-panel/50 px-3 py-1.5 text-[11px] font-medium text-muted transition-colors hover:bg-panel hover:border-primary/30 hover:text-txt shadow-xs">
                              {getSourceIcon(cite.type)}<span className="max-w-[140px] truncate" title={cite.title}>{cite.title || `Source ${i + 1}`}</span>
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
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-panel border border-subtle shadow-xs"><Loader2 className="h-3.5 w-3.5 animate-spin text-muted" /></div>
                <div className="flex-1 mt-1 text-[13px] font-medium text-muted animate-pulse">{isPodcastMode ? "Synthesizing acoustic layers..." : isRoadmapMode ? "Architecting logic map..." : "Extracting context..."}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🔥 Floating Command Input (Matches mockup perfectly) */}
      <div className="absolute bottom-0 left-0 w-full pointer-events-none">
        <div className="h-32 w-full bg-gradient-to-t from-base via-base/90 to-transparent" />
        <div className="px-4 sm:px-8 pb-6 pt-2 pointer-events-auto">
          <form onSubmit={handleChatSubmit} className="mx-auto max-w-2xl">
            <div className={`relative flex items-center rounded-[20px] border ${isRoadmapMode ? 'border-emerald-500/30 bg-panel/90 shadow-[0_8px_30px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/10' : isPodcastMode ? 'border-purple-500/30 bg-panel/90 shadow-[0_8px_30px_rgba(168,85,247,0.1)] ring-1 ring-purple-500/10' : 'border-subtle bg-panel/80 backdrop-blur-xl shadow-lg'} p-1.5 transition-all duration-300`}>
              
              {/* Sleek Toggles */}
              <button type="button" onClick={() => { setIsRoadmapMode(!isRoadmapMode); setIsPodcastMode(false); }} className={`ml-1 flex h-9 text-[11px] font-semibold tracking-wide px-3.5 shrink-0 items-center justify-center rounded-xl transition-all ${isRoadmapMode ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-input text-muted hover:text-txt border border-transparent'}`} disabled={initialSources.length === 0}>
                Roadmaps
              </button>
              <button type="button" onClick={() => { setIsPodcastMode(!isPodcastMode); setIsRoadmapMode(false); }} className={`ml-1 flex h-9 text-[11px] font-semibold tracking-wide px-3.5 shrink-0 items-center justify-center gap-1.5 rounded-xl transition-all ${isPodcastMode ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20' : 'bg-input text-muted hover:text-txt border border-transparent'}`} disabled={initialSources.length === 0}>
                <Headphones className="h-3.5 w-3.5" /> Podcast
              </button>
              
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={isPodcastMode ? "Define podcast parameters..." : isRoadmapMode ? "Define structural roadmap..." : "Command ChaiBookLM..."} disabled={initialSources.length === 0 || isLoading} className={`w-full bg-transparent px-4 py-2 text-[13.5px] ${isPodcastMode ? 'text-purple-600 placeholder:text-purple-600/50' : isRoadmapMode ? 'text-emerald-600 placeholder:text-emerald-600/50' : 'text-txt placeholder:text-muted/50'} outline-none disabled:opacity-50 font-medium`} />
              
              <button type="submit" disabled={initialSources.length === 0 || isLoading || !input.trim()} className={`mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-base transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${isPodcastMode ? 'bg-purple-500 text-white' : isRoadmapMode ? 'bg-emerald-500 text-white' : 'bg-txt text-base'}`}>
                <ArrowUp className="h-4 w-4 dark:text-black text-white" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT 3: RIGHT SIDEBAR (PREVIEW & PODCAST)
// ==========================================
const RightSidebar = ({ activePreview, setActivePreview, rightOpen, setRightOpen, podcastLibrary, setIsPodcastMode, setIsRoadmapMode }: any) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (activePreview?.type === "PODCAST") { setIsPlaying(true); setProgress(0); setCurrentTime(0); }
  }, [activePreview?.contentUrl]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause(); else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTo = (parseFloat(e.target.value) / 100) * duration;
    if (audioRef.current) { audioRef.current.currentTime = seekTo; setCurrentTime(seekTo); setProgress(parseFloat(e.target.value)); }
  };

  const transcriptSentences = React.useMemo(() => {
    if (activePreview?.type !== "PODCAST" || !activePreview.snippet) return [];
    const rawSentences = activePreview.snippet.match(/[^.!?]+[.!?]+/g) || [activePreview.snippet];
    let currentSpeaker = "Host";

    return rawSentences.map((sentence: string) => {
      let cleanText = sentence.replace(/\*/g, '').trim();
      let isNewSpeaker = false;
      const speakerMatch = cleanText.match(/^([A-Za-z0-9 ]{2,15}):\s*(.*)/);

      if (speakerMatch) {
        currentSpeaker = speakerMatch[1].trim();
        cleanText = speakerMatch[2].trim();
        isNewSpeaker = true;
      }
      return { speaker: currentSpeaker, text: cleanText, isNewSpeaker };
    }).filter((s: any) => s.text.length > 1);
  }, [activePreview]);

  const activeSentenceIndex = React.useMemo(() => {
    if (!transcriptSentences.length) return 0;
    const index = Math.floor((progress / 100) * transcriptSentences.length);
    return Math.min(index, transcriptSentences.length - 1);
  }, [progress, transcriptSentences.length]);

  useEffect(() => {
    if (transcriptContainerRef.current) {
      const lines = transcriptContainerRef.current.querySelectorAll('.transcript-line');
      const activeElement = lines[activeSentenceIndex] as HTMLElement;
      if (activeElement) activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeSentenceIndex]);

  const isPodcastModeActive = activePreview?.type === "PODCAST";
  const rightPanelWidthClass = isPodcastModeActive ? "w-[380px] xl:w-[450px]" : "w-[340px] xl:w-[400px]";

  return (
    // 🔥 FIX: Added overflow-hidden to parent and fixed width inner container so it doesn't wrap/squish
    <div className={`hidden flex-col border-l border-subtle/60 bg-panel/30 backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] lg:flex overflow-hidden ${rightOpen ? rightPanelWidthClass : "w-0 border-l-0"}`}>
      <div className={`flex flex-col h-full shrink-0 ${rightPanelWidthClass}`}>
        
        {/* Right Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-subtle/40 px-4 bg-panel/50 z-10">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-6 w-6 rounded-md bg-input border border-subtle flex items-center justify-center text-muted">
              {activePreview ? getSourceIcon(activePreview.type) : <Captions className="h-3 w-3" />}
            </div>
            <span className="truncate text-[12px] font-bold text-txt uppercase tracking-wide" title={activePreview?.title}>{activePreview ? activePreview.title : "Viewer"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {activePreview?.contentUrl && <a href={activePreview.contentUrl} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-muted hover:bg-input hover:text-txt transition-colors"><ExternalLink className="h-3.5 w-3.5" /></a>}
            <button onClick={() => setRightOpen(false)} className="rounded-lg p-1.5 text-muted hover:bg-input hover:text-txt transition-colors"><X className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        <div className={`flex flex-1 flex-col overflow-y-auto p-5 custom-thin-scrollbar ${isPodcastModeActive ? "bg-base/30" : ""}`}>
          <div className="flex-1 flex flex-col min-h-[50%] shrink-0">
            {!activePreview ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted py-10">
                <div className="w-full max-w-[260px] rounded-2xl border border-dashed border-subtle/80 p-8 bg-panel/30">
                  <Captions className="mx-auto mb-3 h-5 w-5 text-muted/50" />
                  <p className="text-[12px] leading-relaxed">Select a citation node or acoustic stream to preview.</p>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col gap-5 animate-in fade-in duration-500">
                
                {/* 🔥 PODCAST PLAYER (Purple Theme applied) */}
                {activePreview.type === "PODCAST" && activePreview.contentUrl && (
                  <div className="flex h-full flex-col">
                    <audio ref={audioRef} src={activePreview.contentUrl} autoPlay onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onEnded={() => setIsPlaying(false)} className="hidden" />

                    <div className="shrink-0 bg-panel border border-subtle/60 rounded-[24px] p-6 shadow-xl shadow-black/5 dark:shadow-black/20 relative overflow-hidden">
                      <div className="absolute -top-16 -right-16 w-40 h-40 bg-purple-500/20 blur-3xl rounded-full pointer-events-none" />
                      
                      <div className="flex items-center gap-4 relative z-10 mb-6">
                        <div className="h-16 w-16 shrink-0 bg-gradient-to-br from-purple-600 to-indigo-900 rounded-2xl flex items-center justify-center text-white shadow-inner"><Headphones className="h-7 w-7 opacity-90" /></div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[9px] font-black tracking-widest text-purple-500 uppercase mb-1.5">ChaiBook Original</span>
                          <h2 className="text-[16px] font-bold truncate leading-tight text-txt">{activePreview.title}</h2>
                          <span className="text-[11px] font-medium text-muted mt-1">Generated with Nova AI</span>
                        </div>
                      </div>

                      <div className="relative z-10 flex flex-col gap-2.5">
                        <input type="range" min="0" max="100" value={progress || 0} onChange={handleSeek} className="w-full h-1.5 bg-input rounded-full appearance-none cursor-pointer accent-purple-500" />
                        <div className="flex justify-between text-[10px] font-bold text-muted"><span>{formatTimestamp(currentTime)}</span><span>{formatTimestamp(duration)}</span></div>
                      </div>

                      <div className="relative z-10 flex justify-center items-center gap-8 mt-5">
                        <SkipBack onClick={() => { if (audioRef.current) { audioRef.current.currentTime -= 10; handleTimeUpdate(); } }} className="w-4 h-4 text-muted hover:text-txt cursor-pointer transition-colors" />
                        <button onClick={togglePlay} className="h-12 w-12 bg-txt rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md">
                          {isPlaying ? <Pause className="w-5 h-5 fill-base text-base" /> : <Play className="w-5 h-5 fill-base text-base translate-x-0.5" />}
                        </button>
                        <SkipForward onClick={() => { if (audioRef.current) { audioRef.current.currentTime += 10; handleTimeUpdate(); } }} className="w-4 h-4 text-muted hover:text-txt cursor-pointer transition-colors" />
                      </div>
                    </div>

                    {/* Micro-lyrics Transcript */}
                    <div className="flex-1 mt-6 overflow-y-auto custom-thin-scrollbar px-2 pb-10" ref={transcriptContainerRef}>
                      <div className="sticky top-0 bg-base/80 backdrop-blur-md pb-4 pt-1 z-10 border-b border-subtle/30 mb-4">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-purple-500">Live Transcript</h3>
                      </div>
                      <div className="flex flex-col gap-6">
                        {transcriptSentences.map((item: any, i: number) => {
                          const isActive = i === activeSentenceIndex;
                          const isPast = i < activeSentenceIndex;
                          const showSpeaker = item.isNewSpeaker || i === 0 || transcriptSentences[i - 1].speaker !== item.speaker;

                          return (
                            <div key={i} className="transcript-line flex flex-col relative" onClick={() => { if (audioRef.current && transcriptSentences.length > 0) { audioRef.current.currentTime = (i / transcriptSentences.length) * duration; } }}>
                              {isActive && <div className="absolute -left-3 top-2 bottom-2 w-0.5 rounded-full bg-purple-500" />}
                              {showSpeaker && (<span className={`text-[9px] font-black uppercase tracking-widest mb-2 transition-colors duration-500 ${isActive || isPast ? 'text-purple-500' : 'text-muted'}`}>{item.speaker}</span>)}
                              <p className={`text-[15px] sm:text-[17px] font-semibold leading-snug transition-all duration-500 ease-out cursor-pointer ${isActive ? 'text-txt opacity-100 scale-[1.01] origin-left' : isPast ? 'text-muted opacity-60' : 'text-muted opacity-30'}`}>{item.text}.</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* NORMAL SNIPPET DISPLAY */}
                {activePreview.type !== "PODCAST" && activePreview.snippet && (
                  <div className="rounded-2xl border border-subtle bg-panel p-5 shadow-sm">
                    <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted">Relevant Extract</h4>
                    <div className="text-[13px] leading-relaxed text-txt prose prose-sm max-w-none prose-p:mb-2 prose-invert"><ReactMarkdown>{activePreview.snippet}</ReactMarkdown></div>
                  </div>
                )}

                {/* LIVE PREVIEW for YT & PDF */}
                {(activePreview.type === "YOUTUBE" || activePreview.type === "PDF") && activePreview.contentUrl && (
                  <div className="overflow-hidden rounded-2xl border border-subtle bg-panel shadow-sm">
                    <div className="flex items-center border-b border-subtle/50 bg-panel/50 px-4 py-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Media Node</span>
                    </div>
                    {activePreview.type === "YOUTUBE" ? (
                      <div className="aspect-video w-full bg-black"><iframe className="h-full w-full" src={`${activePreview.contentUrl.replace("watch?v=", "embed/")}${activePreview.timestamp ? `?start=${activePreview.timestamp}&autoplay=1` : ""}`} allowFullScreen /></div>
                    ) : (
                      <div className="aspect-[1/1.3] w-full bg-input"><iframe src={`${activePreview.contentUrl}#view=FitH${activePreview.pageNumber ? `&page=${activePreview.pageNumber}` : ""}`} className="h-full w-full opacity-90" /></div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BOTTOM SECTION: EPISODE LIBRARY */}
          <div className={`mt-8 shrink-0 border-t pt-6 ${isPodcastModeActive ? "border-purple-500/20" : "border-subtle/60"}`}>
            <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${isPodcastModeActive ? "text-purple-500" : "text-muted"}`}>Acoustic Logs</h3>
            {podcastLibrary.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {[...podcastLibrary].reverse().map((pod: any, i: number) => {
                  const isActive = activePreview?.contentUrl === pod.audioUrl;
                  return (
                    <button key={i} onClick={() => setActivePreview({ title: pod.title, type: "PODCAST", contentUrl: pod.audioUrl, snippet: pod.script })} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all border ${isActive ? "bg-purple-500/5 border-purple-500/30 shadow-xs" : "bg-panel/50 border-subtle hover:bg-input hover:border-subtle/80"}`}>
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-purple-500 text-white' : 'bg-input text-muted'}`}>
                        <PlayCircle className="h-4 w-4" />
                      </div>
                      <div className="text-left overflow-hidden">
                        <h4 className={`text-[12px] font-semibold truncate max-w-[200px] ${isActive ? "text-purple-500" : "text-txt"}`}>{pod.title}</h4>
                        <span className="text-[10px] font-medium text-muted mt-0.5 block">{new Date(pod.createdAt).toLocaleDateString()}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-subtle p-5 text-center bg-panel/30">
                <p className="text-[12px] text-muted font-medium mb-3">No audio nodes found.</p>
                <button onClick={() => { setIsPodcastMode(true); setIsRoadmapMode(false); }} className="mx-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider text-purple-600 border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-all">
                  <Headphones className="w-3.5 h-3.5" /> Initialize Podcast
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT: WORKSPACE VIEW
// ==========================================
export default function WorkspaceClientView({ notebook, initialSources }: { notebook: any, initialSources: any[] }) {
  const router = useRouter();

  // Shared State
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePreview, setActivePreview] = useState<PreviewData>(null);
  
  const [isRoadmapMode, setIsRoadmapMode] = useState(false);
  const [isPodcastMode, setIsPodcastMode] = useState(false);
  const [podcastLibrary, setPodcastLibrary] = useState<any[]>(notebook.podcasts || []);
  const [currentCitations, setCurrentCitations] = useState<any[]>([]);

  useEffect(() => {
    const isAnySourceProcessing = initialSources.some(src => src.status === "INDEXING" || src.status === "PROCESSING");
    if (isAnySourceProcessing) {
      const interval = setInterval(() => { router.refresh(); }, 3000);
      return () => clearInterval(interval);
    }
  }, [initialSources, router]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-base">
      {mobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)} />}
      
      <LeftSidebar 
        notebook={notebook} initialSources={initialSources} leftOpen={leftOpen} 
        mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} 
        activePreview={activePreview} setActivePreview={setActivePreview} setRightOpen={setRightOpen} 
      />
      
      <ChatInterface 
        notebook={notebook} initialSources={initialSources} leftOpen={leftOpen} setLeftOpen={setLeftOpen} 
        rightOpen={rightOpen} setRightOpen={setRightOpen} setMobileMenuOpen={setMobileMenuOpen} 
        isRoadmapMode={isRoadmapMode} setIsRoadmapMode={setIsRoadmapMode} 
        isPodcastMode={isPodcastMode} setIsPodcastMode={setIsPodcastMode} 
        setActivePreview={setActivePreview} setPodcastLibrary={setPodcastLibrary} 
        currentCitations={currentCitations} setCurrentCitations={setCurrentCitations}
      />
      
      {initialSources.length > 0 && (
        <RightSidebar 
          activePreview={activePreview} setActivePreview={setActivePreview} 
          rightOpen={rightOpen} setRightOpen={setRightOpen} podcastLibrary={podcastLibrary} 
          setIsPodcastMode={setIsPodcastMode} setIsRoadmapMode={setIsRoadmapMode}
        />
      )}
    </div>
  );
}
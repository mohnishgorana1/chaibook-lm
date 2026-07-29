"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Link2, MessageSquare, Captions,
  FileType, Clock, CheckCircle2, Loader2,
  PanelLeftClose, PanelLeft, PanelRightClose, PanelRight, Menu, X, ExternalLink, Trash2,
  Sparkles, ArrowUp, Clock4, Globe, Map, PlayCircle, BookOpen, Headphones,
  Play, Pause, SkipBack, SkipForward
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
    case "READY": return <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-500"><CheckCircle2 className="h-3 w-3" /> Ready</div>;
    case "INDEXING":
    case "PROCESSING": return <div className="flex items-center gap-1.5 text-[11px] font-medium text-orange-500"><Loader2 className="h-3 w-3 animate-spin" /> Processing</div>;
    default: return <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted"><Clock className="h-3 w-3" /> Pending</div>;
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
    <div className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-subtle bg-panel/80 backdrop-blur-xl transition-all duration-300 ease-in-out lg:relative lg:z-0 ${leftOpen ? "w-[280px] translate-x-0" : "w-[280px] -translate-x-full lg:w-0 lg:-translate-x-full lg:border-r-0"} ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-subtle/50 px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <Link href="/notebook" className="shrink-0 rounded-full p-1 text-muted transition-colors hover:bg-input hover:text-txt"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="flex flex-col overflow-hidden">
            <h2 className="truncate text-[13px] font-semibold tracking-tight text-txt">{notebook.title}</h2>
            <span className="text-[10px] font-medium text-muted">{initialSources.length} Sources</span>
          </div>
        </div>
        <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-1.5 text-muted hover:text-txt"><X className="h-4 w-4" /></button>
      </div>

      <div className="p-4 shrink-0 add-source-wrapper">
        <AddSourceModal notebookId={notebook._id} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 custom-thin-scrollbar">
        <h3 className="mb-3 px-1 text-[10px] font-bold uppercase tracking-wider text-muted/80">Knowledge Base</h3>
        <div className="flex flex-col gap-1.5">
          {initialSources.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-subtle p-5 text-center"><p className="text-[12px] leading-relaxed text-muted">No sources yet.</p></div>
          ) : (
            initialSources.map((src: any) => (
              <div key={src._id} onClick={() => handleOpenPreview(src)} className={`group relative flex cursor-pointer items-start gap-3 rounded-2xl border p-2.5 transition-colors ${activePreview?.title === src.title ? "bg-input border-subtle" : "border-transparent hover:bg-input/50"}`}>
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-panel shadow-sm">{getSourceIcon(src.type)}</div>
                <div className="flex flex-col overflow-hidden pr-8">
                  <span className="truncate text-[13px] font-medium text-txt" title={src.title}>{src.title}</span>
                  {getStatusIndicator(src.status)}
                </div>
                <button onClick={(e) => handleDeleteSource(e, src)} disabled={deletingId === src._id} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1.5 text-muted hover:bg-red-500/10 hover:text-red-500 disabled:opacity-100">
                  {deletingId === src._id ? <Loader2 className="h-4 w-4 animate-spin text-red-500" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            ))
          )}
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
        setMessages((prev) => [...prev, { id: aiMessageId, role: "assistant", content: "🎙️ Scripting & recording your podcast..." }]);

        const res = await generatePodcastAction(notebook._id, userMessage.content);

        if (res.success) {
          setMessages((prev) => prev.map((msg) => msg.id === aiMessageId ? { ...msg, content: "✅ **Podcast ready!** Your Spotify-style player is open in the right panel." } : msg));
          if (res.podcastObj) setPodcastLibrary((prev: any) => [...prev, res.podcastObj]);

          setActivePreview({ title: `Podcast: ${userMessage.content.substring(0, 30)}...`, type: "PODCAST", contentUrl: res.audioUrl, snippet: res.script });
          setRightOpen(true);
        }
      } catch (error: any) {
        alert(error.message || "Podcast generation failed");
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: "❌ Failed to generate podcast." }]);
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
    if (window.innerWidth < 1024) setMobileMenuOpen(true); // Mobile view me left sidebar kholna padega
    setTimeout(() => {
      // Direct DOM manipulation trick to click the button inside AddSourceModal
      const btn = document.querySelector('.add-source-wrapper button') as HTMLButtonElement;
      if (btn) btn.click();
    }, 100);
  };

  return (
    <div className="relative flex flex-1 flex-col min-w-0 bg-base transition-all duration-300">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-subtle/50 bg-panel/40 px-4 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <button onClick={() => setLeftOpen(!leftOpen)} className="hidden rounded-xl p-1.5 text-muted transition-colors hover:bg-subtle hover:text-txt lg:block">
            {leftOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </button>
          <button onClick={() => setMobileMenuOpen(true)} className="rounded-xl p-1.5 text-muted transition-colors hover:bg-subtle hover:text-txt lg:hidden"><Menu className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center gap-2 text-txt">
          {isPodcastMode ? <Headphones className="h-4 w-4 text-purple-500" /> : <Sparkles className="h-4 w-4 text-emerald-500" />}
          <span className="text-[13px] font-bold tracking-wide">{isPodcastMode ? "AI Podcast Studio" : isRoadmapMode ? "Roadmap Architect" : "ChaiBookLM"}</span>
        </div>
        {initialSources.length > 0 && (
          <button onClick={() => setRightOpen(!rightOpen)} className="hidden rounded-xl p-1.5 text-muted transition-colors hover:bg-subtle hover:text-txt lg:block">
            {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-6 pb-44 custom-thin-scrollbar">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            {initialSources.length === 0 ? (
              <div className="flex flex-col items-center max-w-sm animate-in fade-in zoom-in duration-500">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-orange-500/10 border border-orange-500/20 shadow-inner">
                  <FileText className="h-10 w-10 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-txt mb-3">Welcome to your Notebook!</h2>
                <p className="text-[15px] leading-relaxed text-muted mb-8">
                  Your knowledge base is currently empty. To get started, add PDF documents, YouTube videos, or web articles from the left sidebar.
                </p>
                {/* 🔥 The Magic Button that opens Modal */}
                <button onClick={handleEmptyStateBtnClick} className="flex cursor-pointer items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-orange-500 bg-orange-500/10 px-5 py-2.5 rounded-full border border-orange-500/20 hover:bg-orange-500/20 transition-all">
                  <ArrowLeft className="h-4 w-4 animate-pulse hidden lg:block" />
                  <ArrowUp className="h-4 w-4 animate-pulse lg:hidden" />
                  Add your first source
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center animate-in fade-in duration-300">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-panel shadow-sm border border-subtle"><MessageSquare className="h-6 w-6 text-txt/40" /></div>
                <p className="text-[15px] font-medium text-txt">Your knowledge base is ready.</p>
                <p className="text-[13px] text-muted mt-1">Ask questions, create roadmaps, or generate a podcast.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {messages.map((m) => (
              m.role === "user" ? (
                <div key={m.id} className="flex w-full justify-end group">
                  <div className="max-w-[80%] rounded-[24px] rounded-tr-[4px] bg-subtle/30 border border-subtle px-5 py-3.5 text-[15px] leading-relaxed text-txt shadow-sm">{m.content}</div>
                </div>
              ) : (
                <div key={m.id} className="flex w-full items-start gap-4 py-2 group">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-sm"><Sparkles className="h-4 w-4 text-emerald-500" /></div>
                  <div className="flex-1 min-w-0 text-[15px] leading-relaxed text-txt">
                    <div className="prose prose-sm prose-invert max-w-none text-txt">
                      <ReactMarkdown components={{
                        p: ({ node, ...props }) => <div className="mb-4 leading-relaxed" {...props} />,
                        h3: ({ node, ...props }) => (
                          <div className="mt-8 mb-3 flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30 shadow-sm"><Map className="h-4 w-4 text-emerald-500" /></div>
                            <h3 className="text-[14px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest m-0" {...props} />
                          </div>
                        ),
                        a: ({ href, children }) => {
                          if (href?.startsWith("#cite-")) {
                            const sourceIndex = parseInt(href.replace("#cite-", "")) - 1;
                            const cite = currentCitations[sourceIndex];
                            if (!cite) return <span className="font-semibold text-emerald-500">{children}</span>;

                            if (isRoadmapMode) {
                              return (
                                <div className="mt-4 mb-2">
                                  <button type="button" onClick={() => { setActivePreview({ title: cite.title || `Source ${sourceIndex + 1}`, type: cite.type, contentUrl: cite.url, snippet: cite.snippet, pageNumber: cite.pageNumber ? Number(cite.pageNumber) : undefined, timestamp: cite.timestamp ? Number(cite.timestamp) : undefined }); setRightOpen(true); }} className="flex w-full max-w-md items-center justify-between gap-4 rounded-xl border border-subtle bg-panel px-4 py-3 text-left transition-all hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:shadow-md active:scale-[0.98] group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-base shadow-inner border border-subtle transition-colors">{getSourceIcon(cite.type)}</div>
                                      <div className="flex flex-col overflow-hidden">
                                        <span className="truncate text-[14px] font-bold text-txt transition-colors">{cite.title || `Source Document ${sourceIndex + 1}`}</span>
                                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted mt-0.5">
                                          {cite.type === "YOUTUBE" && cite.timestamp !== undefined ? <><Clock4 className="h-3 w-3 text-red-500/80" /> Starts at {formatTimestamp(cite.timestamp)}</> : null}
                                          {cite.type === "PDF" && cite.pageNumber !== undefined ? <><FileText className="h-3 w-3 text-rose-500/80" /> Reference: Page {cite.pageNumber}</> : null}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex shrink-0 items-center justify-center h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-all">{cite.type === "YOUTUBE" ? <PlayCircle className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}</div>
                                  </button>
                                </div>
                              );
                            }
                            return (
                              <button type="button" onClick={() => { setActivePreview({ title: cite.title || `Source ${sourceIndex + 1}`, type: cite.type, contentUrl: cite.url, snippet: cite.snippet, pageNumber: cite.pageNumber ? Number(cite.pageNumber) : undefined, timestamp: cite.timestamp ? Number(cite.timestamp) : undefined }); setRightOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all mx-1 shadow-sm active:scale-95">
                                {getSourceIcon(cite.type)}<span className="max-w-[120px] truncate" title={cite.title}>{cite.title || `Source ${sourceIndex + 1}`}</span>
                              </button>
                            );
                          }
                          return <a href={href} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{children}</a>;
                        }
                      }}>{m.content}</ReactMarkdown>
                    </div>

                    {!isRoadmapMode && !isPodcastMode && currentCitations.length > 0 && messages[messages.length - 1].id === m.id && (
                      <div className="mt-5 border-t border-subtle pt-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Grounded In Sources</span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {currentCitations.map((cite: any, i: number) => (
                            <button key={i} onClick={() => { setActivePreview({ title: cite.title || `Source ${i + 1}`, type: cite.type, contentUrl: cite.url, snippet: cite.snippet, pageNumber: cite.pageNumber ? Number(cite.pageNumber) : undefined, timestamp: cite.timestamp ? Number(cite.timestamp) : undefined }); setRightOpen(true); }} className="group/btn flex items-center gap-1.5 rounded-lg border border-subtle bg-panel px-2.5 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-subtle hover:text-txt">
                              {getSourceIcon(cite.type)}<span className="max-w-[120px] truncate" title={cite.title}>{cite.title || `Source ${i + 1}`}</span>
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
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-panel border border-subtle shadow-sm"><Loader2 className="h-4 w-4 animate-spin text-muted" /></div>
                <div className="flex-1 mt-1 text-[14px] font-medium text-muted animate-pulse">{isPodcastMode ? "Writing script and synthesizing OpenAI audio voice..." : isRoadmapMode ? "Architecting your personalized learning path..." : "Retrieving insights..."}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 w-full pointer-events-none">
        <div className="h-32 w-full bg-gradient-to-t from-base via-base/80 to-transparent" />
        <div className="bg-base px-4 sm:px-8 pb-6 pt-2 pointer-events-auto">
          <form onSubmit={handleChatSubmit} className="mx-auto max-w-3xl">
            <div className={`relative flex items-center rounded-[24px] border ${isRoadmapMode ? 'border-emerald-500/10 bg-emerald-500/5 ring-2 ring-emerald-500/10' : isPodcastMode ? 'border-purple-500/10 bg-purple-500/5 ring-2 ring-purple-500/10' : 'border-subtle bg-panel focus-within:border-txt/30 hover:border-txt/20'} p-1.5 shadow-sm transition-all`}>
              <button type="button" onClick={() => { setIsRoadmapMode(!isRoadmapMode); setIsPodcastMode(false); }} className={`ml-1 flex h-10 text-xs px-3 shrink-0 items-center justify-center rounded-full transition-colors ${isRoadmapMode ? 'bg-emerald-500 text-white shadow-md' : 'bg-input text-muted hover:text-txt'}`} disabled={initialSources.length === 0}>Roadmaps</button>
              <button type="button" onClick={() => { setIsPodcastMode(!isPodcastMode); setIsRoadmapMode(false); }} className={`ml-1 flex h-10 text-xs px-3 shrink-0 items-center justify-center gap-1.5 rounded-full transition-colors ${isPodcastMode ? 'bg-purple-500 text-white shadow-md' : 'bg-input text-muted hover:text-txt'}`} disabled={initialSources.length === 0}><Headphones className="h-3.5 w-3.5" /> Podcast</button>
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={isPodcastMode ? "What topic should the podcast cover?" : isRoadmapMode ? "What do you want a roadmap for?" : "Message ChaiBookLM..."} disabled={initialSources.length === 0 || isLoading} className={`w-full bg-transparent px-4 py-3 text-[15px] ${isPodcastMode ? 'text-purple-500 placeholder:text-purple-500/50' : isRoadmapMode ? 'text-emerald-500 placeholder:text-emerald-500/50' : 'text-txt placeholder:text-muted/60'} outline-none disabled:opacity-50`} />
              <button type="submit" disabled={initialSources.length === 0 || isLoading || !input.trim()} className={`mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${isPodcastMode ? 'bg-purple-500' : isRoadmapMode ? 'bg-emerald-500' : 'bg-neutral-950'}`}><ArrowUp className="h-5 w-5 text-white" /></button>
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
  const rightPanelWidthClass = isPodcastModeActive ? "w-[450px] xl:w-[550px]" : "w-[400px] xl:w-[500px]";

  return (
    <div className={`hidden flex-col border-l border-subtle bg-panel/30 transition-all duration-300 ease-in-out lg:flex ${rightOpen ? `${rightPanelWidthClass} opacity-100` : "w-0 overflow-hidden opacity-0 border-l-0"}`}>
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-subtle/50 px-4 bg-panel/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-2 overflow-hidden">
          {activePreview ? getSourceIcon(activePreview.type) : <Captions className="h-4 w-4 text-muted" />}
          <span className="truncate text-[13px] font-semibold text-txt" title={activePreview?.title}>{activePreview ? activePreview.title : "Source Viewer"}</span>
        </div>
        <div className="flex items-center gap-1">
          {activePreview?.contentUrl && <a href={activePreview.contentUrl} target="_blank" rel="noreferrer" className="rounded-full p-1.5 text-muted hover:bg-input hover:text-txt"><ExternalLink className="h-4 w-4" /></a>}
          <button onClick={() => setRightOpen(false)} className="rounded-full p-1.5 text-muted hover:bg-input hover:text-txt"><X className="h-4 w-4" /></button>
        </div>
      </div>

      <div className={`flex flex-1 flex-col overflow-y-auto p-4 custom-thin-scrollbar ${isPodcastModeActive ? "bg-neutral-950" : ""}`}>
        <div className="flex-1 flex flex-col min-h-[50%] shrink-0">
          {!activePreview ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted py-10">
              <div className="w-full max-w-[280px] rounded-[24px] border border-dashed border-subtle p-8 bg-base/50">
                <Captions className="mx-auto mb-3 h-6 w-6 text-muted/40" />
                <p className="text-[13px] leading-relaxed">Click a citation source<br />or generate a podcast to preview here.</p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col gap-4 animate-in fade-in duration-300">
              {activePreview.type === "PODCAST" && activePreview.contentUrl && (
                <div className="flex h-full flex-col">
                  <audio ref={audioRef} src={activePreview.contentUrl} autoPlay onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onEnded={() => setIsPlaying(false)} className="hidden" />

                  <div className="shrink-0 bg-neutral-900/80 backdrop-blur-xl rounded-[32px] p-6 text-white border border-white/10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-purple-500/20 blur-3xl rounded-full" />
                    <div className="flex items-center gap-5 relative z-10">
                      <div className="w-16 h-16 shrink-0 bg-gradient-to-br from-purple-600 to-indigo-900 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-900/20"><Headphones className="w-8 h-8 text-white/50" /></div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold tracking-widest text-purple-400 uppercase mb-1">ChaiBook Original</span>
                        <h2 className="text-lg font-bold truncate leading-tight mb-1">{activePreview.title}</h2>
                        <span className="text-xs text-neutral-400">Generated with Nova AI</span>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-2 relative z-10">
                      <input type="range" min="0" max="100" value={progress || 0} onChange={handleSeek} className="w-full h-1.5 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-purple-500" />
                      <div className="flex justify-between text-[11px] font-medium text-neutral-400"><span>{formatTimestamp(currentTime)}</span><span>{formatTimestamp(duration)}</span></div>
                    </div>

                    <div className="mt-2 flex justify-center items-center gap-6 relative z-10">
                      <SkipBack onClick={() => { if (audioRef.current) { audioRef.current.currentTime -= 10; handleTimeUpdate(); } }} className="w-4 h-4 text-neutral-400 hover:text-white cursor-pointer transition-colors" />
                      <button onClick={togglePlay} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-transform shadow-lg">{isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black translate-x-0.5" />}</button>
                      <SkipForward onClick={() => { if (audioRef.current) { audioRef.current.currentTime += 10; handleTimeUpdate(); } }} className="w-4 h-4 text-neutral-400 hover:text-white cursor-pointer transition-colors" />
                    </div>
                  </div>

                  <div className="flex-1 mt-6 overflow-y-auto custom-thin-scrollbar px-2 pb-10" ref={transcriptContainerRef}>
                    <div className="sticky top-0 bg-neutral-950/90 backdrop-blur-md pb-4 pt-2 z-10"><h3 className="text-[11px] font-bold uppercase tracking-widest text-purple-500">Live Transcript</h3></div>
                    <div className="flex flex-col gap-5 mt-2">
                      {transcriptSentences.map((item: any, i: number) => {
                        const isActive = i === activeSentenceIndex;
                        const isPast = i < activeSentenceIndex;
                        const showSpeaker = item.isNewSpeaker || i === 0 || transcriptSentences[i - 1].speaker !== item.speaker;

                        return (
                          <div key={i} className="transcript-line flex flex-col" onClick={() => { if (audioRef.current && transcriptSentences.length > 0) { audioRef.current.currentTime = (i / transcriptSentences.length) * duration; } }}>
                            {showSpeaker && (<span className={`text-[11px] font-black uppercase tracking-widest mb-1.5 transition-colors duration-500 ${isActive || isPast ? 'text-purple-400' : 'text-neutral-600'}`}>{item.speaker}</span>)}
                            <p className={`text-sm sm:text-lg font-bold leading-tight transition-all duration-500 ease-out cursor-pointer hover:text-white ${isActive ? 'text-white' : isPast ? 'text-neutral-500/80' : 'text-neutral-700'}`}>{item.text}.</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activePreview.type !== "PODCAST" && activePreview.snippet && (
                <div className="rounded-2xl border border-subtle bg-base p-4 shadow-sm">
                  <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Relevant Chunk</h4>
                  <div className="text-[13.5px] leading-relaxed text-txt prose prose-sm prose-invert max-w-none"><ReactMarkdown>{activePreview.snippet}</ReactMarkdown></div>
                </div>
              )}

              {(activePreview.type === "YOUTUBE" || activePreview.type === "PDF") && activePreview.contentUrl && (
                <div className="overflow-hidden rounded-2xl border border-subtle bg-base shadow-sm mt-4">
                  <div className="flex items-center justify-between border-b border-subtle bg-panel px-3 py-2"><span className="text-[11px] font-bold uppercase tracking-wider text-muted">Live Preview</span></div>
                  {activePreview.type === "YOUTUBE" ? (
                    <div className="aspect-video w-full bg-black"><iframe className="h-full w-full" src={`${activePreview.contentUrl.replace("watch?v=", "embed/")}${activePreview.timestamp ? `?start=${activePreview.timestamp}&autoplay=1` : ""}`} allowFullScreen /></div>
                  ) : (
                    <div className="aspect-[1/1.4] w-full bg-input"><iframe src={`${activePreview.contentUrl}#view=FitH${activePreview.pageNumber ? `&page=${activePreview.pageNumber}` : ""}`} className="h-full w-full opacity-90" /></div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`mt-6 shrink-0 border-t pt-6 ${isPodcastModeActive ? "border-white/10" : "border-subtle"}`}>
          <h3 className={`text-[11px] font-bold uppercase tracking-widest mb-4 ${isPodcastModeActive ? "text-purple-400" : "text-purple-500"}`}>Your Episodes</h3>
          {podcastLibrary.length > 0 ? (
            <div className="flex flex-col gap-2">
              {[...podcastLibrary].reverse().map((pod: any, i: number) => {
                const isActive = activePreview?.contentUrl === pod.audioUrl;
                return (
                  <button key={i} onClick={() => setActivePreview({ title: pod.title, type: "PODCAST", contentUrl: pod.audioUrl, snippet: pod.script })} className={`flex items-center gap-4 p-3 rounded-xl transition-all border ${isActive ? "bg-purple-500/10 border-purple-500/50" : isPodcastModeActive ? "bg-white/5 border-transparent hover:bg-white/10" : "bg-panel border-subtle hover:border-purple-500/30 shadow-sm"}`}>
                    <PlayCircle className={`w-8 h-8 shrink-0 ${isActive ? "text-purple-500" : isPodcastModeActive ? "text-neutral-500" : "text-muted"}`} />
                    <div className="text-left overflow-hidden">
                      <h4 className={`text-sm font-bold truncate max-w-[250px] ${isActive ? (isPodcastModeActive ? "text-purple-300" : "text-purple-600") : (isPodcastModeActive ? "text-white" : "text-txt")}`}>{pod.title}</h4>
                      <span className={`text-[10px] ${isPodcastModeActive ? "text-neutral-400" : "text-muted"}`}>{new Date(pod.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={`rounded-xl border border-dashed p-6 text-center flex flex-col items-center justify-center gap-3 transition-colors ${isPodcastModeActive ? "border-white/10 text-neutral-500" : "border-subtle text-muted"}`}>
              <Headphones className="w-8 h-8 opacity-50" />
              <p className="text-[13px]">No episodes generated yet.</p>
              <button onClick={() => { setIsPodcastMode(true); setIsRoadmapMode(false); }} className={`mt-1 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95 ${isPodcastModeActive ? "bg-purple-600 text-white" : "bg-purple-500/10 text-purple-600 border border-purple-500/20 hover:bg-purple-500 hover:text-white"}`}>
                <Sparkles className="w-3.5 h-3.5" /> Create Podcast
              </button>
            </div>
          )}
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
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-base">
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
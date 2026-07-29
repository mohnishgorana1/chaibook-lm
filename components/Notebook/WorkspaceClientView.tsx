"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Link2, MessageSquare, Captions,
  FileType, Clock, CheckCircle2, Loader2,
  PanelLeftClose, PanelLeft, PanelRightClose, PanelRight, Menu, X, ExternalLink, Trash2,
  Sparkles, ArrowUp, Clock4, Globe, Map, PlayCircle, BookOpen, Headphones,
  Play, Pause, SkipBack, SkipForward, Layers, Database, ChevronDown, MonitorPlay
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
    case "PDF": return <FileText className="h-4 w-4 text-primary" />;
    case "YOUTUBE": return <FaYoutube className="h-4 w-4 text-primary" />;
    case "TRANSCRIPT": return <Captions className="h-4 w-4 text-primary" />;
    case "URL":
    case "WEBSITE": return <Globe className="h-4 w-4 text-primary" />;
    case "TEXT": return <FileType className="h-4 w-4 text-primary" />;
    case "PODCAST": return <Headphones className="h-4 w-4 text-primary" />;
    default: return <Link2 className="h-4 w-4 text-primary" />;
  }
};

const getStatusIndicator = (status: string) => {
  switch (status) {
    case "READY": return <div className="flex items-center gap-1.5 text-[10px] font-medium text-primary"><CheckCircle2 className="h-3 w-3" /> Ready</div>;
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

// 🔥 SMART YOUTUBE URL PARSER
const getYouTubeEmbedUrl = (url?: string, timestamp?: number) => {
  if (!url) return '';
  let videoId = '';
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1);
    } else if (urlObj.hostname.includes('youtube.com')) {
      if (urlObj.pathname.startsWith('/embed/')) {
        videoId = urlObj.pathname.split('/')[2];
      } else {
        videoId = urlObj.searchParams.get('v') || '';
      }
    }
  } catch (e) {
    return url;
  }
  if (!videoId) return url;
  return `https://www.youtube.com/embed/${videoId}${timestamp ? `?start=${timestamp}&autoplay=1` : ''}`;
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
    <div className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-panel/60 backdrop-blur-2xl transition-all duration-300 ease-in-out lg:relative lg:z-0 overflow-hidden ${leftOpen ? "w-[260px] border-r border-subtle/60" : "w-0 border-r-0"} ${mobileMenuOpen ? "w-[260px] translate-x-0" : "lg:translate-x-0"}`}>
      <div className="w-[260px] flex flex-col h-full shrink-0">

        <div className="flex h-14 shrink-0 items-center justify-between border-b border-subtle/40 px-4 bg-panel/30">
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

        <div className="flex-1 overflow-y-auto px-4 pb-4 custom-thin-scrollbar">
          <div className="mb-3 flex items-center gap-2 px-1">
            <div className="h-1.5 w-1.5 rounded-full bg-primary/60"></div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">Knowledge Base</h3>
          </div>

          <div className="flex flex-col gap-1.5">
            {initialSources.length === 0 ? (
              <div className="rounded-xl border border-dashed border-subtle p-6 text-center bg-panel/30">
                <Layers className="mx-auto h-5 w-5 text-muted/40 mb-2" />
                <p className="text-[12px] leading-relaxed text-muted">Context empty.<br />Add sources to begin.</p>
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
const ChatInterface = ({ notebook, initialSources, leftOpen, setLeftOpen, rightOpen, setRightOpen, setMobileMenuOpen, isRoadmapMode, setIsRoadmapMode, isPodcastMode, setIsPodcastMode, setActivePreview, currentCitations, setCurrentCitations, setProcessingPodcasts }: any) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userTopic = input;
    setInput("");

    if (isPodcastMode) {
      try {
        setIsLoading(true);
        setProcessingPodcasts((prev: any) => [{ title: userTopic, createdAt: new Date(), status: 'processing', id: Date.now() }, ...prev]);
        setRightOpen(true);
        await generatePodcastAction(notebook._id, userTopic);
      } catch (error: any) {
        alert(error.message || "Podcast generation failed");
        setProcessingPodcasts((prev: any) => prev.filter((p: any) => p.title !== userTopic));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: userTopic };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setCurrentCitations([]);

    const apiEndpoint = isRoadmapMode ? "/api/roadmap" : "/api/chat";
    await fetchAndStream(apiEndpoint, { messages: updatedMessages, notebookId: notebook._id, topic: userTopic });
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

      <div className="flex h-14 shrink-0 items-center justify-between border-b border-subtle/40 bg-panel/30 px-4 backdrop-blur-xl z-10">
        <div className="flex items-center gap-2">
          <button onClick={() => setLeftOpen(!leftOpen)} className="hidden rounded-lg p-1.5 text-muted transition-colors hover:bg-input hover:text-txt lg:block">
            {leftOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </button>
          <button onClick={() => setMobileMenuOpen(true)} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-input hover:text-txt lg:hidden"><Menu className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center gap-2 text-txt">
          {isPodcastMode ? <Headphones className="h-4 w-4 text-primary" /> : isRoadmapMode ? <Map className="h-4 w-4 text-primary" /> : <Sparkles className="h-4 w-4 text-primary" />}
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

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-8 pb-44 custom-thin-scrollbar relative">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            {initialSources.length === 0 ? (
              <div className="flex flex-col items-center max-w-sm animate-in fade-in zoom-in duration-700 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/20 blur-[80px] rounded-full pointer-events-none"></div>
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-panel border border-primary/20 shadow-xl shadow-primary/5 relative z-10">
                  <Database className="h-7 w-7 text-primary" />
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
                <div key={m.id} className="flex w-full justify-end group">
                  <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-subtle/30 border border-subtle px-5 py-3.5 text-[14px] leading-relaxed text-txt shadow-sm backdrop-blur-sm">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex w-full items-start gap-4 py-2 group">
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border shadow-xs bg-primary/5 border-primary/20">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
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
                                  <button type="button" onClick={() => { setActivePreview({ title: cite.title || `Source ${sourceIndex + 1}`, type: cite.type, contentUrl: cite.url, snippet: cite.snippet, pageNumber: cite.pageNumber ? Number(cite.pageNumber) : undefined, timestamp: cite.timestamp ? Number(cite.timestamp) : undefined }); setRightOpen(true); }} className="flex w-full max-w-md items-center justify-between gap-4 rounded-xl border border-subtle bg-panel/60 px-4 py-3 text-left transition-all hover:border-primary/30 hover:bg-panel hover:shadow-md group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-input border border-subtle transition-colors group-hover:bg-primary/10 group-hover:border-primary/20">{getSourceIcon(cite.type)}</div>
                                      <div className="flex flex-col overflow-hidden">
                                        <span className="truncate text-[13px] font-semibold text-txt transition-colors">{cite.title || `Source Document ${sourceIndex + 1}`}</span>
                                        <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted mt-0.5">
                                          {cite.type === "YOUTUBE" && cite.timestamp !== undefined ? <><Clock4 className="h-3 w-3" /> Starts at {formatTimestamp(cite.timestamp)}</> : null}
                                          {cite.type === "PDF" && cite.pageNumber !== undefined ? <><FileText className="h-3 w-3" /> Reference: Page {cite.pageNumber}</> : null}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex shrink-0 items-center justify-center h-7 w-7 rounded-full bg-subtle text-txt transition-all group-hover:bg-primary/10 group-hover:text-primary">{cite.type === "YOUTUBE" ? <PlayCircle className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}</div>
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

      <div className="absolute bottom-0 left-0 w-full pointer-events-none">
        <div className="h-32 w-full bg-gradient-to-t from-base via-base/90 to-transparent" />
        <div className="px-4 sm:px-8 pb-6 pt-2 pointer-events-auto">
          <form onSubmit={handleChatSubmit} className="mx-auto max-w-2xl">
            <div className={`relative flex items-center rounded-[20px] border border-subtle bg-panel/80 backdrop-blur-xl shadow-lg p-1.5 transition-all duration-300`}>

              <button type="button" onClick={() => { setIsRoadmapMode(!isRoadmapMode); setIsPodcastMode(false); }} className={`ml-1 flex h-9 text-[11px] font-semibold tracking-wide px-3.5 shrink-0 items-center justify-center rounded-xl transition-all ${isRoadmapMode ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-input text-muted hover:text-txt border border-transparent'}`} disabled={initialSources.length === 0}>
                Roadmaps
              </button>
              <button type="button" onClick={() => { setIsPodcastMode(!isPodcastMode); setIsRoadmapMode(false); }} className={`ml-1 flex h-9 text-[11px] font-semibold tracking-wide px-3.5 shrink-0 items-center justify-center gap-1.5 rounded-xl transition-all ${isPodcastMode ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-input text-muted hover:text-txt border border-transparent'}`} disabled={initialSources.length === 0}>
                <Headphones className="h-3.5 w-3.5" /> Podcast
              </button>

              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={isPodcastMode ? "Define podcast parameters..." : isRoadmapMode ? "Define structural roadmap..." : "Command ChaiBookLM..."} disabled={initialSources.length === 0 || isLoading} className={`w-full bg-transparent px-4 py-2 text-[13.5px] ${isPodcastMode || isRoadmapMode ? 'text-primary placeholder:text-primary/50' : 'text-txt placeholder:text-muted/50'} outline-none disabled:opacity-50 font-medium`} />

              <button type="submit" disabled={initialSources.length === 0 || isLoading || !input.trim()} className={`mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-base transition-all hover:scale-105 active:scale-95 disabled:opacity-50 bg-primary text-white`}>
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
// COMPONENT 3: RIGHT SIDEBAR (STRICT 2-TABS & SEPARATE SCROLL)
// ==========================================
const RightSidebar = ({ activePreview, setActivePreview, rightOpen, setRightOpen, podcastLibrary, processingPodcasts, setIsPodcastMode, setIsRoadmapMode }: any) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 🔥 TABS STATE: Only Media and Podcast
  const [activeTab, setActiveTab] = useState<"media" | "podcast">("media");
  const [isPodcastDropdownOpen, setIsPodcastDropdownOpen] = useState(false);

  // Auto-switch tabs based on what user clicks
  useEffect(() => {
    if (activePreview?.type === "PODCAST") {
      setActiveTab("podcast");
    } else {
      setActiveTab("media");
    }
  }, [activePreview]);

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
    if (activeTab === "podcast" && activePreview?.type === "PODCAST" && transcriptContainerRef.current) {
      const lines = transcriptContainerRef.current.querySelectorAll('.transcript-line');
      const activeElement = lines[activeSentenceIndex] as HTMLElement;
      if (activeElement) activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeSentenceIndex, activeTab, activePreview]);

  const hasPodcasts = podcastLibrary.length > 0 || processingPodcasts.length > 0;
  const isPodcastActive = activePreview?.type === "PODCAST" && activePreview?.contentUrl;

  const rightPanelWidthClass = "w-[400px] xl:w-[450px]";

  return (
    <div className={`hidden lg:flex flex-col border-l border-subtle bg-panel/30 backdrop-blur-xl transition-all duration-500 overflow-hidden ${rightOpen ? rightPanelWidthClass : "w-0 border-l-0"}`}>
      <div className={`flex flex-col h-full min-h-0 shrink-0 ${rightPanelWidthClass}`}>

        {/* 🔥 TABS HEADER */}
        <div className="flex items-center justify-between px-3 pt-3 border-b border-subtle/50 bg-panel z-20 shrink-0">
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={() => setActiveTab("media")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-t-xl text-[12px] font-bold transition-all ${activeTab === "media" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted hover:bg-input hover:text-txt"}`}
            >
              <MonitorPlay className="h-4 w-4" /> Media
            </button>
            <button
              onClick={() => setActiveTab("podcast")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-t-xl text-[12px] font-bold transition-all ${activeTab === "podcast" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted hover:bg-input hover:text-txt"}`}
            >
              <Headphones className="h-4 w-4" /> Podcast
            </button>
          </div>
          <div className="shrink-0 pl-2 pb-1">
            <button onClick={() => setRightOpen(false)} className="rounded-lg p-2 text-muted hover:bg-input hover:text-txt transition-colors"><X className="h-4 w-4" /></button>
          </div>
        </div>

        {/* 🔥 MAIN CONTENT AREA */}
        <div className="flex-1 min-h-0 flex flex-col relative bg-base/50">

          {/* ================================== */}
          {/* TAB 1: MEDIA VIEW */}
          {/* ================================== */}
          {activeTab === "media" && (
            <div className="flex-1 flex flex-col min-h-0 p-5">
              {(!activePreview) ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-muted border border-dashed border-subtle rounded-3xl bg-panel/30 min-h-0">
                  <MonitorPlay className="mb-4 h-8 w-8 opacity-40" />
                  <p className="text-[13px] font-medium opacity-60 max-w-[200px]">Select a citation node to view content.</p>
                </div>
              ) : activePreview.type === "YOUTUBE" ? (
                <div className="flex flex-col min-h-0 rounded-2xl border border-subtle overflow-hidden bg-black/5 shadow-sm">
                  <div className="flex shrink-0 items-center justify-between border-b border-subtle/50 bg-panel/50 px-4 py-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted truncate">{activePreview.title}</span>
                    <a href={activePreview.contentUrl} target="_blank" rel="noreferrer" className="text-muted hover:text-txt"><ExternalLink className="h-3.5 w-3.5" /></a>
                  </div>
                  {/* 🔥 FIXED YOUTUBE IFRAME WITH HELPER */}
                  <div className="w-full bg-black flex-1 flex flex-col justify-center min-h-0"><iframe className="w-full aspect-video" src={getYouTubeEmbedUrl(activePreview.contentUrl, activePreview.timestamp)} allowFullScreen /></div>
                </div>
              ) : activePreview.type === "PDF" ? (
                <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-subtle overflow-hidden bg-black/5 shadow-sm">
                  <div className="flex shrink-0 items-center justify-between border-b border-subtle/50 bg-panel/50 px-4 py-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted truncate">{activePreview.title}</span>
                    <a href={activePreview.contentUrl} target="_blank" rel="noreferrer" className="text-muted hover:text-txt"><ExternalLink className="h-3.5 w-3.5" /></a>
                  </div>
                  <iframe src={`${activePreview.contentUrl}#view=FitH${activePreview.pageNumber ? `&page=${activePreview.pageNumber}` : ""}`} className="w-full h-full flex-1 bg-input" />
                </div>
              ) : activePreview.snippet ? (
                <div className="flex-1 flex flex-col bg-panel border border-subtle rounded-3xl p-6 shadow-sm overflow-y-auto custom-thin-scrollbar min-h-0">
                  <div className="flex shrink-0 items-center gap-2 mb-6 pb-4 border-b border-subtle/50">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="text-[12px] font-bold text-txt uppercase tracking-wider truncate">{activePreview.title}</h3>
                  </div>
                  <div className="text-[14px] leading-relaxed text-txt prose prose-sm max-w-none prose-p:mb-3 prose-invert"><ReactMarkdown>{activePreview.snippet}</ReactMarkdown></div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-muted border border-dashed border-subtle rounded-3xl bg-panel/30 min-h-0">
                  <MonitorPlay className="mb-4 h-8 w-8 opacity-40" />
                  <p className="text-[13px] font-medium opacity-60 max-w-[200px]">Content unavailable.</p>
                </div>
              )}
            </div>
          )}

          {/* ================================== */}
          {/* TAB 2: PODCAST LOGIC */}
          {/* ================================== */}
          {activeTab === "podcast" && (
            <div className="flex-1 flex flex-col min-h-0">

              {!hasPodcasts ? (
                <div className="flex-1 flex flex-col min-h-0 items-center justify-center text-center text-muted p-5">
                  <div className="w-full flex-1 border border-dashed border-primary/20 rounded-3xl bg-primary/5 flex flex-col items-center justify-center min-h-0">
                    <Headphones className="mb-4 h-10 w-10 text-primary/40" />
                    <p className="text-[14px] font-medium text-primary/60 mb-6 max-w-[200px]">Acoustic library is empty.</p>
                    <button onClick={() => { setIsPodcastMode(true); setIsRoadmapMode(false); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider text-white bg-primary hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95">
                      <Sparkles className="w-4 h-4" /> Generate Episode
                    </button>
                  </div>
                </div>
              ) :

                !isPodcastActive ? (
                  <div className="flex-1 min-h-0 overflow-y-auto custom-thin-scrollbar p-4">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4 text-primary">Acoustic Logs</h3>
                    <div className="flex flex-col gap-3">
                      {processingPodcasts.map((pod: any) => (
                        <div key={`proc-${pod.id}`} className="flex items-center gap-4 p-4 rounded-2xl border border-primary/20 bg-primary/5 animate-pulse shadow-sm">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </div>
                          <div className="text-left overflow-hidden">
                            <h4 className="text-[13px] font-bold truncate text-primary">{pod.title}</h4>
                            <span className="text-[11px] font-semibold text-primary/70 mt-1 block">Synthesizing audio nodes...</span>
                          </div>
                        </div>
                      ))}
                      {[...podcastLibrary].reverse().map((pod: any, i: number) => (
                        <button key={i} onClick={() => { setActivePreview({ title: pod.title, type: "PODCAST", contentUrl: pod.audioUrl, snippet: pod.script }); }} className="group flex w-full items-center gap-4 p-4 rounded-2xl transition-all border bg-panel border-subtle hover:border-primary/30 hover:bg-primary/5 hover:shadow-md">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-base border border-subtle text-muted group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                            <PlayCircle className="h-5 w-5" />
                          </div>
                          <div className="text-left overflow-hidden">
                            <h4 className="text-[13px] font-bold truncate text-txt group-hover:text-primary transition-colors">{pod.title}</h4>
                            <span className="text-[11px] font-medium text-muted mt-1 block">{new Date(pod.createdAt).toLocaleDateString()}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) :

                  (
                    <div className="flex-1 flex flex-col min-h-0 relative">

                      {/* DROPDOWN SELECTOR HEADER */}
                      <div className="shrink-0 relative px-5 py-4 border-b border-subtle/40 z-20 bg-panel">
                        <button
                          onClick={() => setIsPodcastDropdownOpen(!isPodcastDropdownOpen)}
                          className="flex items-center justify-between w-full bg-input/50 border border-subtle rounded-lg px-3 py-2.5 hover:bg-input transition-all"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Headphones className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-[12px] font-semibold text-txt truncate">{activePreview.title}</span>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-muted transition-transform shrink-0 ${isPodcastDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isPodcastDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsPodcastDropdownOpen(false)}></div>
                            <div className="absolute top-[calc(100%+4px)] left-5 right-5 bg-panel border border-subtle rounded-xl shadow-xl z-20 overflow-y-auto max-h-[250px] p-1.5 flex flex-col gap-0.5 custom-thin-scrollbar">
                              {[...podcastLibrary].reverse().map((pod: any, i: number) => {
                                const isSelected = activePreview?.contentUrl === pod.audioUrl;
                                return (
                                  <button
                                    key={i}
                                    onClick={() => { setActivePreview({ title: pod.title, type: "PODCAST", contentUrl: pod.audioUrl, snippet: pod.script }); setIsPodcastDropdownOpen(false); }}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors text-left ${isSelected ? "bg-primary/10 text-primary" : "text-muted hover:bg-input hover:text-txt"}`}
                                  >
                                    <Headphones className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-primary" : "opacity-50"}`} />
                                    <span className="truncate">{pod.title}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </>
                        )}
                      </div>

                      {/* PLAYER & TRANSCRIPT WRAPPER */}
                      <div className="flex-1 flex flex-col min-h-0 p-5 gap-5">

                        {/* PREMIUM SPOTIFY-STYLE PLAYER (Pinned at top) */}
                        <div className="shrink-0 bg-panel border border-subtle/80 rounded-[24px] p-6 shadow-xl relative overflow-hidden mb-2">
                          {/* Cinematic Ambient Blurs */}
                          <div className="absolute -top-24 -right-24 w-56 h-56 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
                          <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />

                          <audio ref={audioRef} src={activePreview.contentUrl} autoPlay onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onEnded={() => setIsPlaying(false)} className="hidden" />

                          {/* Cover Art & Title */}
                          <div className="flex items-center gap-5 relative z-10 mb-8">
                            <div className="h-20 w-20 shrink-0 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20 ring-1 ring-white/10 dark:ring-white/5">
                              <Headphones className="h-8 w-8 opacity-100 drop-shadow-md" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[10px] font-black tracking-widest text-primary uppercase mb-1.5 drop-shadow-sm">ChaiBook Original</span>
                              <h2 className="text-[16px] md:text-[18px] font-bold truncate leading-snug text-txt">{activePreview.title}</h2>
                              <span className="text-[12px] font-medium text-muted mt-1">Generated with Nova AI</span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="relative z-10 flex flex-col gap-3">
                            <input type="range" min="0" max="100" value={progress || 0} onChange={handleSeek} className="w-full h-1.5 bg-input rounded-full appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all" />
                            <div className="flex justify-between text-[11px] font-bold text-muted">
                              <span>{formatTimestamp(currentTime)}</span>
                              <span>{formatTimestamp(duration)}</span>
                            </div>
                          </div>

                          {/* Controls */}
                          <div className="relative z-10 flex justify-center items-center gap-10 mt-6">
                            <SkipBack onClick={() => { if (audioRef.current) { audioRef.current.currentTime -= 10; handleTimeUpdate(); } }} className="w-5 h-5 text-muted hover:text-primary cursor-pointer transition-colors" />

                            <button onClick={togglePlay} className="h-14 w-14 bg-txt text-base rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10 dark:shadow-black/40 hover:bg-primary hover:text-white group">
                              {isPlaying
                                ? <Pause className="w-6 h-6 fill-current" />
                                : <Play className="w-6 h-6 fill-current translate-x-0.5" />
                              }
                            </button>

                            <SkipForward onClick={() => { if (audioRef.current) { audioRef.current.currentTime += 10; handleTimeUpdate(); } }} className="w-5 h-5 text-muted hover:text-primary cursor-pointer transition-colors" />
                          </div>
                        </div>

                        {/* SEPARATE SCROLLING TRANSCRIPT BOX */}
                        <div className="flex-1 min-h-0 bg-panel border border-subtle/60 rounded-[20px] p-5 overflow-y-auto custom-thin-scrollbar shadow-sm" ref={transcriptContainerRef}>
                          <div className="flex flex-col gap-6">
                            {transcriptSentences.map((item: any, i: number) => {
                              const isActive = i === activeSentenceIndex;
                              const isPast = i < activeSentenceIndex;
                              const showSpeaker = item.isNewSpeaker || i === 0 || transcriptSentences[i - 1].speaker !== item.speaker;
                              return (
                                <div key={i} className="transcript-line flex flex-col relative pl-4 border-l-2 transition-all" onClick={() => { if (audioRef.current && transcriptSentences.length > 0) { audioRef.current.currentTime = (i / transcriptSentences.length) * duration; } }} style={{ borderColor: isActive ? 'var(--color-primary)' : 'transparent' }}>
                                  {showSpeaker && (<span className={`text-[10px] font-black uppercase tracking-widest mb-1.5 transition-colors duration-500 ${isActive || isPast ? 'text-primary' : 'text-muted'}`}>{item.speaker}</span>)}
                                  <p className={`text-[14px] sm:text-[15px] font-medium leading-relaxed transition-all duration-500 ease-out cursor-pointer ${isActive ? 'text-txt opacity-100' : isPast ? 'text-muted opacity-60' : 'text-muted opacity-30'}`}>{item.text}.</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
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

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePreview, setActivePreview] = useState<PreviewData>(null);

  const [isRoadmapMode, setIsRoadmapMode] = useState(false);
  const [isPodcastMode, setIsPodcastMode] = useState(false);

  const [podcastLibrary, setPodcastLibrary] = useState<any[]>(notebook.podcasts || []);
  const [processingPodcasts, setProcessingPodcasts] = useState<any[]>([]);

  const [currentCitations, setCurrentCitations] = useState<any[]>([]);

  useEffect(() => {
    if (notebook.podcasts) {
      setPodcastLibrary(notebook.podcasts);
      setProcessingPodcasts(prev => prev.filter(p => !notebook.podcasts.some((dbP: any) => dbP.title === p.title)));
    }
  }, [notebook.podcasts]);

  useEffect(() => {
    const isAnySourceProcessing = initialSources.some(src => src.status === "INDEXING" || src.status === "PROCESSING");
    const isAnyPodcastProcessing = processingPodcasts.length > 0;

    if (isAnySourceProcessing || isAnyPodcastProcessing) {
      const interval = setInterval(() => { router.refresh(); }, 3000);
      return () => clearInterval(interval);
    }
  }, [initialSources, processingPodcasts.length, router]);

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
        setActivePreview={setActivePreview} setProcessingPodcasts={setProcessingPodcasts}
        currentCitations={currentCitations} setCurrentCitations={setCurrentCitations}
      />

      {(initialSources.length > 0 || processingPodcasts.length > 0 || podcastLibrary.length > 0 || activePreview !== null) && (
        <RightSidebar
          activePreview={activePreview} setActivePreview={setActivePreview}
          rightOpen={rightOpen} setRightOpen={setRightOpen}
          podcastLibrary={podcastLibrary} processingPodcasts={processingPodcasts}
          setIsPodcastMode={setIsPodcastMode} setIsRoadmapMode={setIsRoadmapMode}
        />
      )}
    </div>
  );
}
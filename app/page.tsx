"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ArrowRight, Sparkles, Layers, ShieldCheck, Cpu, 
  Headphones, FileText, Link2, Search, PlayCircle,
  CheckCircle2, ArrowUp, SkipBack, Play, SkipForward
} from "lucide-react";
import Logo from "@/components/Logo";

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 500, damping: 35 } },
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-base overflow-x-hidden">
      <main className="relative flex flex-1 flex-col">
        
        {/* Subtle Architectural Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border-subtle)_1px,transparent_1px),linear-gradient(to_bottom,var(--border-subtle)_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_40%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none -z-20 opacity-50"></div>
        
        {/* Elegant Ray-traced Ambient Backlight */}
        <div className="absolute left-1/2 top-0 -z-10 h-[38rem] w-[55rem] -translate-x-1/2 -translate-y-1/3 rounded-[100%] bg-primary blur-[150px] opacity-[0.07] pointer-events-none"></div>

        {/* HERO HEADER */}
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-6 pt-36 pb-12 text-center">
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col items-center w-full z-10">
            
            {/* Context Badge */}
            <motion.div variants={itemVariants} className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3.5 py-1 text-[11px] font-medium tracking-wider uppercase text-primary backdrop-blur-md">
              <Sparkles className="h-3 w-3" />
              <span>Engineered Synthesis Environment</span>
            </motion.div>

            {/* Typography-driven Headline */}
            <motion.h1 variants={itemVariants} className="text-4xl font-semibold tracking-tight text-txt sm:text-6xl max-w-3xl leading-[1.12]">
              Intelligence, layered and <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-txt to-muted">absolute.</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="mx-auto mt-6 max-w-lg text-[15px] leading-relaxed text-muted font-medium">
              A private, minimalist canvas built to absorb cross-platform documentation, orchestrate structural roadmaps, and vocalize insights.
            </motion.p>

            {/* Action Matrix */}
            <motion.div variants={itemVariants} className="mt-8 flex items-center justify-center gap-3">
              <Link
                href="/notebook"
                className="group relative flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-[13px] font-semibold text-white transition-all hover:bg-primary-hover active:scale-[0.98] shadow-sm shadow-primary/20"
              >
                Launch app
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              
              <a
                href="https://github.com/mohnishgorana1"
                target="_blank"
                rel="noreferrer"
                className="flex h-10 items-center justify-center rounded-lg border border-subtle bg-panel px-4 text-[13px] font-medium text-txt transition-all hover:bg-input shadow-2xs"
              >
                Repository
              </a>
            </motion.div>
          </motion.div>

          {/* 🔥 HIGH-END PREMIUM COMPANY STYLE ABSTRACT APP PREVIEW */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.4, type: "spring", stiffness: 400, damping: 32 }}
            className="mt-20 w-full max-w-5xl relative z-10 hidden md:block"
          >
            {/* Architectural Border Glow */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/15 to-transparent opacity-60"></div>
            
            {/* The Glass Container Mockup */}
            <div className="relative flex h-[460px] w-full rounded-2xl border border-subtle bg-panel/30 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.4)] overflow-hidden">
              
              {/* COMPONENT PREVIEW: INDEX BAR (Left) */}
              <div className="flex flex-col w-[230px] border-r border-subtle/60 p-4 bg-panel/10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-2 w-2 rounded-full bg-primary/60"></div>
                  <div className="h-2 w-20 rounded bg-txt/10"></div>
                </div>
                
                <div className="w-full h-8 rounded-lg border border-dashed border-subtle flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted bg-panel/40 mb-6">
                  <Layers size={12}/> Context Chunks
                </div>
                
                <div className="flex flex-col gap-2.5">
                  <div className="h-10 w-full rounded-xl bg-input/40 border border-subtle/50 p-2.5 flex items-center gap-3">
                    <div className="h-5 w-5 rounded-md bg-panel border border-subtle flex items-center justify-center text-primary"><FileText size={11}/></div>
                    <div className="h-2 w-24 rounded bg-txt/10"></div>
                  </div>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 w-full rounded-xl p-2.5 flex items-center gap-3 opacity-50">
                      <div className="h-5 w-5 rounded-md bg-panel border border-subtle flex items-center justify-center text-muted"><Link2 size={11}/></div>
                      <div className="h-2 w-28 rounded bg-txt/5"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* COMPONENT PREVIEW: SYNTHESIS CANVAS (Middle) */}
              <div className="flex-1 flex flex-col bg-panel/5">
                <div className="h-11 border-b border-subtle/60 flex items-center justify-between px-4 text-[11px] font-bold uppercase tracking-wider text-muted">
                  <div className="flex items-center gap-1.5"><Cpu size={12} className="text-primary"/> Knowledge Map</div>
                  <div className="h-1.5 w-12 rounded bg-subtle"></div>
                </div>
                
                <div className="flex-1 p-6 flex flex-col gap-6 overflow-hidden">
                  <div className="self-end bg-input/60 border border-subtle/60 rounded-2xl rounded-tr-xs px-4 py-2.5 max-w-[70%]">
                    <div className="h-2.5 w-32 rounded bg-txt/10"></div>
                  </div>
                  
                  <div className="flex gap-3.5 max-w-[85%]">
                    <div className="h-7 w-7 shrink-0 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-center text-primary shadow-sm"><Sparkles size={12}/></div>
                    <div className="flex flex-col gap-2.5 pt-1.5 w-full">
                      <div className="h-2.5 w-full rounded bg-txt/10"></div>
                      <div className="h-2.5 w-[92%] rounded bg-txt/10"></div>
                      <div className="h-2.5 w-[85%] rounded bg-txt/10"></div>
                      
                      <div className="flex gap-2 mt-3">
                        <div className="h-5 w-24 rounded bg-primary/10 border border-primary/10 flex items-center justify-center gap-1 text-[10px] font-semibold text-primary"><CheckCircle2 size={10}/> Source Ref</div>
                        <div className="h-5 w-20 rounded bg-subtle border border-subtle/40"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Command Palette Input */}
                <div className="p-4 w-full max-w-xl mx-auto">
                  <div className="h-10 w-full bg-panel border border-subtle rounded-xl flex items-center px-2 gap-2 shadow-xs">
                    <div className="h-6 w-16 rounded-md bg-input text-[10px] font-medium flex items-center justify-center text-muted">Nodes</div>
                    <div className="h-6 w-16 rounded-md bg-input text-[10px] font-medium flex items-center justify-center text-muted gap-1"><Headphones size={10}/> Stream</div>
                    <div className="h-1.5 w-24 rounded bg-txt/5 ml-2"></div>
                    <div className="h-6 w-6 rounded-md bg-txt ml-auto flex items-center justify-center shadow-xs"><ArrowUp size={12} className="text-panel"/></div>
                  </div>
                </div>
              </div>

              {/* COMPONENT PREVIEW: ACOUSTIC MATRIX (Right) */}
              <div className="flex flex-col w-[280px] border-l border-subtle/60 bg-panel/10 p-4">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted mb-4">
                  <Headphones size={12} className="text-primary"/> Acoustic Engine
                </div>
                
                {/* Minimalist Player Widget */}
                <div className="bg-panel border border-subtle/80 rounded-2xl p-4 shadow-sm relative overflow-hidden mb-5">
                  <div className="flex gap-3 items-center mb-4">
                    <div className="h-11 w-11 shrink-0 bg-gradient-to-tr from-primary to-primary-hover rounded-xl flex items-center justify-center text-white shadow-inner"><Headphones size={16}/></div>
                    <div className="flex flex-col gap-1.5">
                      <div className="h-2 w-28 rounded bg-txt/10"></div>
                      <div className="h-1.5 w-16 rounded bg-txt/5"></div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <div className="h-1 w-full bg-input rounded-full overflow-hidden"><div className="h-full w-2/5 bg-primary rounded-full"></div></div>
                    <div className="flex justify-between text-[8px] font-medium text-muted"><span>01:14</span><span>04:02</span></div>
                  </div>
                  
                  <div className="flex justify-center items-center gap-4 mt-3 opacity-60">
                    <SkipBack size={12} className="text-muted"/>
                    <div className="h-8 w-8 rounded-full bg-txt flex items-center justify-center"><Play size={10} className="fill-panel text-panel translate-x-[0.5px]"/></div>
                    <SkipForward size={12} className="text-muted"/>
                  </div>
                </div>

                {/* Micro-lyrics Timeline */}
                <div className="flex flex-col gap-3.5 mt-2 overflow-hidden opacity-80">
                  <div className="flex flex-col gap-1.5 border-l-2 border-primary pl-2.5">
                    <div className="h-1.5 w-8 rounded bg-primary/40"></div>
                    <div className="h-2.5 w-full rounded bg-txt/10"></div>
                    <div className="h-2.5 w-[80%] rounded bg-txt/10"></div>
                  </div>
                  <div className="flex flex-col gap-1.5 opacity-30 pl-3">
                    <div className="h-1.5 w-8 rounded bg-txt/20"></div>
                    <div className="h-2.5 w-[90%] rounded bg-txt/10"></div>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        </div>

        {/* METRIC / BENTO FEATURES GRID */}
        <div className="mx-auto w-full max-w-5xl px-6 py-24 border-t border-subtle/40">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left"
          >
            <div className="group flex flex-col justify-between rounded-xl border border-subtle bg-panel/40 backdrop-blur-sm p-6 transition-all duration-300 hover:border-primary/20 hover:shadow-xs">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-subtle bg-input mb-4 transition-colors group-hover:bg-primary/5 group-hover:border-primary/20">
                <Layers className="h-3.5 w-3.5 text-txt transition-colors group-hover:text-primary" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-txt">Multi-modal Ingestion</h3>
                <p className="mt-1.5 text-[13px] leading-normal text-muted">Seamless aggregation across multi-format literature files, web nodes, and stream logs.</p>
              </div>
            </div>

            <div className="group flex flex-col justify-between rounded-xl border border-subtle bg-panel/40 backdrop-blur-sm p-6 transition-all duration-300 hover:border-primary/20 hover:shadow-xs">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-subtle bg-input mb-4 transition-colors group-hover:bg-primary/5 group-hover:border-primary/20">
                <ShieldCheck className="h-3.5 w-3.5 text-txt transition-colors group-hover:text-primary" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-txt">Clean Boundary States</h3>
                <p className="mt-1.5 text-[13px] leading-normal text-muted">Vector operations run inside fully isolated runtime sandboxes to shield domain cross-leaks.</p>
              </div>
            </div>

            <div className="group flex flex-col justify-between rounded-xl border border-subtle bg-panel/40 backdrop-blur-sm p-6 transition-all duration-300 hover:border-primary/20 hover:shadow-xs">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-subtle bg-input mb-4 transition-colors group-hover:bg-primary/5 group-hover:border-primary/20">
                <Cpu className="h-3.5 w-3.5 text-txt transition-colors group-hover:text-primary" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-txt">Granular Index Trace</h3>
                <p className="mt-1.5 text-[13px] leading-normal text-muted">Every synthesis payload maps to explicit semantic timestamps and paragraph pointers.</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* FOOTER */}
        <footer className="w-full bg-base py-6 mt-auto z-10 border-t border-subtle">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
            <Logo showText={true} textSize="12px" />
            <p className="text-[12px] text-muted font-medium">
              &copy; {new Date().getFullYear()} Mohnish Gorana. Built for GenAI 2026.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
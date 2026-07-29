"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, FileText, Link2, ArrowRight, Sparkles, Database, FileSearch } from "lucide-react";
import Logo from "@/components/Logo";
import { FaYoutube } from 'react-icons/fa'

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  };

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-base overflow-hidden selection:bg-orange-500/20">

      <main className="relative flex flex-1 flex-col overflow-y-auto custom-thin-scrollbar">
        {/* Modern Grid Background & Glowing Orbs - Orange/Amber theme for 'Chai' */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none -z-20"></div>
        <div className="absolute left-1/2 top-0 -z-10 h-[30rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-[100px] pointer-events-none"></div>

        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-6 py-20 text-center">

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col items-center w-full"
          >
            {/* Project Pill */}
            <motion.div variants={itemVariants} className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-orange-600 shadow-sm backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              <span>GenAI with JS 2026 Assignment</span>
            </motion.div>

            {/* Hero Text */}
            <motion.h1 variants={itemVariants} className="font-sans text-5xl font-black tracking-tighter text-txt md:text-7xl">
              Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">ChaiBookLM</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-muted md:text-[17px]">
              Your AI-powered research assistant. Upload PDFs, Text files, URLs, or YouTube videos. Ask natural language questions and get grounded answers with pinpoint citations directly from your isolated knowledge base.
            </motion.p>

            {/* Call to Actions */}
            <motion.div variants={itemVariants} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/notebook"
                className="group flex h-11 items-center gap-2 rounded-xl bg-txt px-6 text-[14px] font-bold text-base transition-all hover:scale-105 shadow-[0_0_20px_rgba(249,115,22,0.2)]"
              >
                View Notebooks
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="https://github.com/mohnishgorana1"
                target="_blank"
                rel="noreferrer"
                className="flex h-11 items-center justify-center rounded-xl border border-subtle bg-panel px-6 text-[14px] font-semibold text-txt transition-colors hover:bg-subtle"
              >
                View Repository
              </a>
            </motion.div>
          </motion.div>

          {/* Module Cards Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 30 }}
            className="mt-24 grid w-full max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3"
          >
            {/* Feature 1: Multi-Source Ingestion */}
            <div className="group relative flex flex-col items-start gap-4 rounded-2xl border border-subtle bg-panel/50 p-6 text-left transition-all hover:bg-subtle/50 hover:shadow-lg hover:-translate-y-1 backdrop-blur-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-subtle bg-base shadow-sm group-hover:border-orange-500/30 transition-colors">
                <Database className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-txt">Multi-Source RAG</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">Ingest data from PDFs, plain text, website URLs, and YouTube videos. Content is automatically chunked and embedded.</p>
              </div>
              <div className="mt-2 flex gap-2 text-muted">
                <FileText className="h-4 w-4" />
                <Link2 className="h-4 w-4" />
                <FaYoutube className="h-4 w-4" />
              </div>
            </div>

            {/* Feature 2: Isolated Notebooks */}
            <div className="group relative flex flex-col items-start gap-4 rounded-2xl border border-subtle bg-panel/50 p-6 text-left transition-all hover:bg-subtle/50 hover:shadow-lg hover:-translate-y-1 backdrop-blur-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-subtle bg-base shadow-sm group-hover:border-amber-500/30 transition-colors">
                <BookOpen className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-txt">Isolated Notebooks</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">Create multiple workspaces. Each notebook maintains its own isolated knowledge base and vector index to prevent cross-contamination.</p>
              </div>
            </div>

            {/* Feature 3: Citations */}
            <div className="group relative flex flex-col items-start gap-4 rounded-2xl border border-subtle bg-panel/50 p-6 text-left transition-all hover:bg-subtle/50 hover:shadow-lg hover:-translate-y-1 backdrop-blur-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-subtle bg-base shadow-sm group-hover:border-orange-500/30 transition-colors">
                <FileSearch className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-txt">Source Citations</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">Never guess where an answer came from. Click any inline citation to open the exact PDF section or YouTube timestamp.</p>
              </div>
            </div>
          </motion.div>

        </div>

        <footer className="w-full bg-base py-5 mt-auto z-10 border-t border-subtle">
          <div className="mx-auto flex w-full flex-col items-center justify-between gap-6 px-6 md:flex-row">
            <Logo />
            <p className="text-[13px] text-muted">
              &copy; {new Date().getFullYear()} Mohnish Gorana. Built for GenAI 2026.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
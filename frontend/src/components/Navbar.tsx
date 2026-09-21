"use client";

import React from "react";
import {
  Bot,
  CheckCircle2,
  AlertCircle,
  Download,
  Terminal,
  FileCode,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HealthResponse, getZipDownloadUrl } from "@/lib/api";

interface NavbarProps {
  health: HealthResponse | null;
  filesCount: number;
  isGenerating: boolean;
}

export function Navbar({ health, filesCount, isGenerating }: NavbarProps) {
  const isOnline = Boolean(health);
  const hasGroq = Boolean(health?.groq_configured);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 shadow-lg shadow-indigo-500/25">
            <Bot className="h-6 w-6 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span
                className={`inline-flex h-full w-full rounded-full ${
                  isOnline ? "bg-emerald-400" : "bg-red-400"
                } opacity-75 animate-ping`}
              />
              <span
                className={`relative inline-flex h-3 w-3 rounded-full ${
                  isOnline ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                CodeBuddy
                <span className="text-xs font-normal text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-800/60">
                  v2.0
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Autonomous Multi-Agent Software Engineer
            </p>
          </div>
        </div>

        {/* Backend & Status Badges */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Health Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-800 bg-slate-900 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                isOnline ? "bg-emerald-500 shadow-sm shadow-emerald-500" : "bg-rose-500"
              }`}
            />
            <span className="text-slate-300 font-medium hidden md:inline">
              FastAPI:
            </span>
            <span className={isOnline ? "text-emerald-400" : "text-rose-400"}>
              {isOnline ? "127.0.0.1:8000" : "Offline"}
            </span>
          </div>

          {/* Groq Key Status */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-800 bg-slate-900 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-slate-400">Groq:</span>
            <span
              className={hasGroq ? "text-amber-300 font-medium" : "text-slate-500"}
            >
              {hasGroq ? "Connected" : "Key Missing"}
            </span>
          </div>

          {/* Download Zip Action */}
          {filesCount > 0 && (
            <a
              href={getZipDownloadUrl()}
              download="codebuddy_project.zip"
              className="inline-flex"
            >
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1.5 border-indigo-500/40 hover:border-indigo-500 text-indigo-300 hover:bg-indigo-950/40"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export ZIP</span>
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-900/60 text-[10px]">
                  {filesCount}
                </span>
              </Button>
            </a>
          )}

          {/* FastAPI Docs Link */}
          <a
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex"
          >
            <Button variant="ghost" size="sm" className="text-xs h-8 gap-1 text-slate-400 hover:text-white">
              <Terminal className="h-3.5 w-3.5" />
              API Docs
              <ExternalLink className="h-3 w-3 opacity-60" />
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
}

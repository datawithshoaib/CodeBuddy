"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Play,
  RotateCcw,
  StopCircle,
  Sliders,
  Code,
  Layers,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface PromptInputProps {
  onGenerate: (prompt: string, recursionLimit: number) => void;
  onReset: () => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

const PRESET_PROMPTS = [
  {
    title: "Todo App",
    desc: "HTML, CSS & Vanilla JS with local storage",
    prompt:
      "Create a modern, responsive Todo list application using HTML, CSS, and vanilla JavaScript with dark mode and localStorage persistence.",
  },
  {
    title: "FastAPI Blog API",
    desc: "FastAPI + SQLite + Pydantic models",
    prompt:
      "Create a simple blog API in FastAPI with a SQLite database, CRUD endpoints for posts, and Pydantic validation schemas.",
  },
  {
    title: "Calculator App",
    desc: "Interactive calculator with history",
    prompt:
      "Create an elegant web calculator application in HTML, CSS, and JavaScript with calculation history and keyboard support.",
  },
  {
    title: "Markdown Note App",
    desc: "Markdown preview and note taker",
    prompt:
      "Build a markdown note-taking web app in HTML, CSS, and JS with live side-by-side preview and export to text.",
  },
];

export function PromptInput({
  onGenerate,
  onReset,
  onStop,
  isGenerating,
  disabled = false,
}: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [recursionLimit, setRecursionLimit] = useState(100);
  const [showOptions, setShowOptions] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating || disabled) return;
    onGenerate(prompt.trim(), recursionLimit);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectPreset = (pText: string) => {
    setPrompt(pText);
  };

  return (
    <Card className="p-4 sm:p-5 bg-slate-900/80 border-slate-800">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center justify-between">
          <label
            htmlFor="project-prompt"
            className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            Project Prompt
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <Sliders className="h-3 w-3" />
              <span>Config ({recursionLimit})</span>
            </button>

            <button
              type="button"
              onClick={onReset}
              disabled={isGenerating}
              className="text-xs text-slate-400 hover:text-rose-300 flex items-center gap-1 transition-colors disabled:opacity-40"
              title="Reset workspace folder"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Configuration panel */}
        {showOptions && (
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs flex items-center gap-4 animate-in fade-in duration-200">
            <label className="text-slate-300 flex items-center gap-2">
              <span>LangGraph Recursion Limit:</span>
              <input
                type="number"
                min={20}
                max={300}
                value={recursionLimit}
                onChange={(e) => setRecursionLimit(Number(e.target.value) || 100)}
                className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-center focus:outline-none focus:border-indigo-500"
              />
            </label>
            <span className="text-[11px] text-slate-500">
              Default is 100 steps. Increase for larger multi-file projects.
            </span>
          </div>
        )}

        {/* Text Area */}
        <div className="relative">
          <textarea
            id="project-prompt"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating || disabled}
            placeholder="e.g. Build a modern todo app in html, css, and js with a sleek dark theme..."
            className="w-full resize-none rounded-xl border border-slate-700/80 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 font-sans"
          />
          <div className="absolute bottom-2.5 right-3 text-[11px] text-slate-500 hidden sm:block">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">Ctrl+Enter</kbd> to run
          </div>
        </div>

        {/* Presets */}
        <div className="space-y-1.5">
          <div className="text-[11px] text-slate-400 font-medium">
            Quick Templates:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {PRESET_PROMPTS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(preset.prompt)}
                disabled={isGenerating}
                className="text-left p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/40 hover:bg-slate-800/60 hover:border-slate-700 transition-all text-xs group disabled:opacity-50 cursor-pointer"
              >
                <div className="font-semibold text-slate-200 group-hover:text-indigo-300">
                  {preset.title}
                </div>
                <div className="text-[11px] text-slate-400 line-clamp-1">
                  {preset.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {isGenerating ? (
            <Button
              type="button"
              variant="destructive"
              size="default"
              onClick={onStop}
              className="gap-2"
            >
              <StopCircle className="h-4 w-4" />
              Stop Generation
            </Button>
          ) : (
            <Button
              type="submit"
              variant="glow"
              size="default"
              disabled={!prompt.trim() || disabled}
              className="gap-2 px-6"
            >
              <Play className="h-4 w-4 fill-white" />
              Generate Project
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

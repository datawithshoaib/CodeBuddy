"use client";

import React, { useState } from "react";
import {
  FileCode2,
  Copy,
  Check,
  Download,
  ExternalLink,
  Code,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FileContentResponse } from "@/lib/api";

interface CodeViewerProps {
  fileData: FileContentResponse | null;
  isLoading: boolean;
}

export function CodeViewer({ fileData, isLoading }: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!fileData?.content) return;
    try {
      await navigator.clipboard.writeText(fileData.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code", err);
    }
  };

  const lines = fileData?.content ? fileData.content.split("\n") : [];

  return (
    <Card className="p-4 bg-slate-900/80 border-slate-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 truncate">
          <Code className="h-4 w-4 text-pink-400 shrink-0" />
          {fileData ? (
            <div className="flex items-center gap-2 truncate font-mono text-xs">
              <span className="text-white font-semibold truncate">
                {fileData.name}
              </span>
              <span className="text-slate-500 text-[11px] hidden sm:inline truncate">
                ({fileData.path})
              </span>
            </div>
          ) : (
            <span className="text-xs font-semibold text-slate-400">
              Code Preview
            </span>
          )}
        </div>

        {fileData && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
              {lines.length} lines
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-xs h-7 gap-1.5 border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-700"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Code Content */}
      <div className="flex-1 my-2 overflow-hidden rounded-xl bg-slate-950/90 border border-slate-800/80 flex flex-col">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-80 text-xs text-slate-400">
            <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span>Loading file content...</span>
          </div>
        ) : fileData ? (
          <div className="flex-1 overflow-auto max-h-[500px] flex font-mono text-xs leading-relaxed">
            {/* Line numbers gutter */}
            <div className="py-3 pl-3 pr-2 select-none text-right text-slate-600 bg-slate-950/60 border-r border-slate-800/80 sticky left-0 shrink-0 min-w-[40px]">
              {lines.map((_, i) => (
                <div key={i} className="text-[11px]">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code lines */}
            <pre className="p-3 text-slate-200 overflow-x-auto whitespace-pre flex-1 text-[12px] font-mono">
              <code>{fileData.content}</code>
            </pre>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-80 text-center text-slate-500 text-xs p-6">
            <FileCode2 className="h-10 w-10 mb-3 opacity-30 text-indigo-400" />
            <span className="font-semibold text-slate-400 text-sm">
              No file selected
            </span>
            <span className="text-[11px] text-slate-500 mt-1 max-w-xs">
              Select any generated file from the Workspace Files explorer on the left to inspect its code.
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

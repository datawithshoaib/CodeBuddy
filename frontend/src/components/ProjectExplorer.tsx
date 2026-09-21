"use client";

import React from "react";
import {
  Folder,
  FileCode2,
  FileText,
  FileJson,
  FileCode,
  Download,
  RefreshCw,
  FolderTree,
  File,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProjectFile, getZipDownloadUrl } from "@/lib/api";

interface ProjectExplorerProps {
  files: ProjectFile[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

function getFileIcon(extension: string) {
  switch (extension) {
    case ".html":
      return <FileCode2 className="h-4 w-4 text-orange-400" />;
    case ".css":
      return <FileCode className="h-4 w-4 text-sky-400" />;
    case ".js":
    case ".jsx":
      return <FileCode className="h-4 w-4 text-amber-400" />;
    case ".ts":
    case ".tsx":
      return <FileCode className="h-4 w-4 text-blue-400" />;
    case ".py":
      return <FileCode2 className="h-4 w-4 text-emerald-400" />;
    case ".json":
      return <FileJson className="h-4 w-4 text-yellow-300" />;
    case ".md":
      return <FileText className="h-4 w-4 text-purple-400" />;
    default:
      return <File className="h-4 w-4 text-slate-400" />;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function ProjectExplorer({
  files,
  selectedFile,
  onSelectFile,
  onRefresh,
  isLoading,
}: ProjectExplorerProps) {
  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <Card className="p-4 bg-slate-900/80 border-slate-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-indigo-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
            Workspace Files
          </h3>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-400 font-mono">
            {files.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
            title="Refresh file tree"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto max-h-[500px] my-2 space-y-1 pr-1">
        {files.length > 0 ? (
          files.map((file) => {
            const isSelected = selectedFile === file.path;

            return (
              <button
                key={file.path}
                type="button"
                onClick={() => onSelectFile(file.path)}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs font-mono transition-all cursor-pointer ${
                  isSelected
                    ? "bg-indigo-950/60 text-indigo-200 border border-indigo-500/40 shadow-sm"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {getFileIcon(file.extension)}
                  <span className="truncate">{file.path}</span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 ml-2 font-sans">
                  {formatBytes(file.size)}
                </span>
              </button>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500 text-xs">
            <Folder className="h-8 w-8 mb-2 opacity-30 text-indigo-400" />
            <span>Workspace empty</span>
            <span className="text-[11px] text-slate-600 mt-0.5">
              Files will appear here as Coder writes them
            </span>
          </div>
        )}
      </div>

      {/* Footer Info & Download */}
      {files.length > 0 && (
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Total: {formatBytes(totalBytes)}
          </span>

          <a href={getZipDownloadUrl()} download="codebuddy_project.zip">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1.5 border-indigo-500/30 text-indigo-300 hover:bg-indigo-950/30"
            >
              <Download className="h-3 w-3" />
              Download ZIP
            </Button>
          </a>
        </div>
      )}
    </Card>
  );
}

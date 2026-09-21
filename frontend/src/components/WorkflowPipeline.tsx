"use client";

import React from "react";
import {
  BrainCircuit,
  Network,
  Code2,
  CheckCircle2,
  Loader2,
  ArrowRight,
  AlertCircle,
  Cpu,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export type AgentStage =
  | "idle"
  | "planner"
  | "architect"
  | "coder"
  | "completed"
  | "error";

interface WorkflowPipelineProps {
  currentStage: AgentStage;
  currentStep: number;
  totalSteps: number;
  error?: string | null;
}

export function WorkflowPipeline({
  currentStage,
  currentStep,
  totalSteps,
  error,
}: WorkflowPipelineProps) {
  const stages = [
    {
      id: "planner",
      title: "Planner Agent",
      role: "System Specifications & Blueprint",
      description: "Analyzes prompt, determines tech stack & architecture",
      icon: BrainCircuit,
      color: "from-blue-600 to-cyan-500",
      accent: "text-cyan-400",
      border: "border-cyan-500/30",
    },
    {
      id: "architect",
      title: "Architect Agent",
      role: "Task Decomposition & Dependencies",
      description: "Generates explicit, ordered implementation steps",
      icon: Network,
      color: "from-indigo-600 to-purple-600",
      accent: "text-indigo-400",
      border: "border-indigo-500/30",
    },
    {
      id: "coder",
      title: "Coder Agent",
      role: "Tool-Driven Synthesis & File Writing",
      description: "Executes tasks, writes full files, resolves dependencies",
      icon: Code2,
      color: "from-purple-600 to-pink-600",
      accent: "text-purple-400",
      border: "border-pink-500/30",
    },
  ];

  const getStageStatus = (stageId: string) => {
    if (currentStage === "error") return "error";
    if (currentStage === "completed") return "done";
    if (currentStage === "idle") return "idle";

    if (stageId === "planner") {
      if (currentStage === "planner") return "active";
      if (currentStage === "architect" || currentStage === "coder") return "done";
    }

    if (stageId === "architect") {
      if (currentStage === "planner") return "pending";
      if (currentStage === "architect") return "active";
      if (currentStage === "coder") return "done";
    }

    if (stageId === "coder") {
      if (currentStage === "coder") return "active";
      return "pending";
    }

    return "idle";
  };

  const getProgressPercentage = () => {
    if (currentStage === "idle") return 0;
    if (currentStage === "planner") return 20;
    if (currentStage === "architect") return 45;
    if (currentStage === "coder") {
      if (totalSteps > 0) {
        return 45 + Math.round((currentStep / totalSteps) * 50);
      }
      return 60;
    }
    if (currentStage === "completed") return 100;
    return 0;
  };

  return (
    <Card className="p-4 sm:p-5 bg-slate-900/60 border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Cpu className="h-4 w-4 text-indigo-400" />
            LangGraph Multi-Agent Pipeline
          </h2>
          <p className="text-xs text-slate-400">
            Coordinated autonomous agents converting natural language into working code
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentStage === "idle" && (
            <Badge variant="outline" className="text-xs">
              Waiting to start
            </Badge>
          )}
          {currentStage === "planner" && (
            <Badge variant="cyan" className="text-xs animate-pulse">
              Planner Thinking...
            </Badge>
          )}
          {currentStage === "architect" && (
            <Badge variant="default" className="text-xs animate-pulse">
              Architecting Tasks...
            </Badge>
          )}
          {currentStage === "coder" && (
            <Badge variant="purple" className="text-xs animate-pulse">
              Coding ({currentStep}/{totalSteps || "?"})
            </Badge>
          )}
          {currentStage === "completed" && (
            <Badge variant="emerald" className="text-xs">
              ✓ All Agents Completed
            </Badge>
          )}
          {currentStage === "error" && (
            <Badge variant="destructive" className="text-xs">
              Workflow Error
            </Badge>
          )}
        </div>
      </div>

      {/* Progress line */}
      <div className="mb-4">
        <Progress value={getProgressPercentage()} className="h-1.5 bg-slate-800" />
      </div>

      {/* Agents cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 relative">
        {stages.map((stage, idx) => {
          const status = getStageStatus(stage.id);
          const Icon = stage.icon;
          const isActive = status === "active";
          const isDone = status === "done";

          return (
            <div
              key={stage.id}
              className={`relative rounded-xl border p-4 transition-all duration-300 ${
                isActive
                  ? `border-indigo-500 bg-indigo-950/20 ring-2 ring-indigo-500/30 agent-active-glow`
                  : isDone
                  ? `border-emerald-500/40 bg-emerald-950/10`
                  : `border-slate-800 bg-slate-950/40 opacity-70`
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${
                    stage.color
                  } shadow-md ${
                    isActive ? "animate-bounce" : ""
                  }`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>

                <div>
                  {isActive && (
                    <span className="flex items-center gap-1 text-xs text-indigo-400 font-medium">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Active
                    </span>
                  )}
                  {isDone && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Ready
                    </span>
                  )}
                  {status === "pending" && (
                    <span className="text-xs text-slate-500">Queued</span>
                  )}
                  {status === "idle" && (
                    <span className="text-xs text-slate-500">Step {idx + 1}</span>
                  )}
                </div>
              </div>

              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                {stage.title}
              </h3>
              <p className="text-[11px] font-medium text-slate-300 mt-0.5">
                {stage.role}
              </p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {stage.description}
              </p>

              {/* Extra details when coder is active */}
              {stage.id === "coder" && isActive && totalSteps > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-pink-300 flex items-center justify-between">
                  <span>Executing Step {currentStep} of {totalSteps}</span>
                  <span className="font-mono font-semibold">
                    {Math.round((currentStep / totalSteps) * 100)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-300 text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold">Pipeline Error: </span>
            {error}
          </div>
        </div>
      )}
    </Card>
  );
}

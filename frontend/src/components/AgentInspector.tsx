"use client";

import React from "react";
import {
  FileText,
  ListTodo,
  Terminal,
  CheckCircle2,
  Clock,
  Code,
  Tag,
  Check,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProjectPlan, TaskPlan } from "@/lib/api";

export interface ActivityLog {
  id: string;
  time: string;
  agent: string;
  message: string;
  type: "info" | "success" | "warn" | "error";
  details?: any;
}

interface AgentInspectorProps {
  plan: ProjectPlan | null;
  taskPlan: TaskPlan | null;
  currentStep: number;
  logs: ActivityLog[];
}

export function AgentInspector({
  plan,
  taskPlan,
  currentStep,
  logs,
}: AgentInspectorProps) {
  const steps = taskPlan?.implementation_steps || [];

  return (
    <Card className="p-4 sm:p-5 bg-slate-900/80 border-slate-800 flex flex-col h-full">
      <Tabs defaultValue="plan" className="flex flex-col flex-1">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <TabsList>
            <TabsTrigger value="plan" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              Plan Blueprint
              {plan && (
                <span className="ml-1 h-2 w-2 rounded-full bg-cyan-400" />
              )}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5">
              <ListTodo className="h-3.5 w-3.5 text-indigo-400" />
              Architect Tasks
              {steps.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
                  {steps.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-pink-400" />
              Live Stream
              {logs.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
                  {logs.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* PLAN TAB */}
        <TabsContent value="plan" className="flex-1 overflow-y-auto max-h-[520px] pr-1 space-y-4 pt-1">
          {plan ? (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {plan.name}
                  </h3>
                  <Badge variant="cyan" className="text-xs">
                    {plan.techstack}
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {plan.description}
                </p>
              </div>

              {/* Features */}
              {plan.features && plan.features.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Key Features
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {plan.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80 text-xs text-slate-200"
                      >
                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files Blueprint */}
              {plan.files && plan.files.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-indigo-400" />
                    Target Files Architecture ({plan.files.length})
                  </div>
                  <div className="space-y-2">
                    {plan.files.map((file, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                      >
                        <span className="font-mono text-indigo-300 font-medium">
                          {file.path}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {file.purpose}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500 text-xs">
              <Sparkles className="h-8 w-8 mb-2 opacity-30 text-indigo-400" />
              <span>No active plan generated yet.</span>
              <span>Submit a prompt to start planning your app.</span>
            </div>
          )}
        </TabsContent>

        {/* TASKS TAB */}
        <TabsContent value="tasks" className="flex-1 overflow-y-auto max-h-[520px] pr-1 space-y-2.5 pt-1">
          {steps.length > 0 ? (
            <div className="space-y-2.5">
              {steps.map((task, idx) => {
                const stepNum = idx + 1;
                const isCompleted = currentStep > stepNum;
                const isCurrent = currentStep === stepNum;
                const isPending = currentStep < stepNum;

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border text-xs transition-all ${
                      isCurrent
                        ? "border-indigo-500 bg-indigo-950/20 ring-1 ring-indigo-500"
                        : isCompleted
                        ? "border-emerald-500/30 bg-emerald-950/10"
                        : "border-slate-800 bg-slate-950/40 opacity-70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                            isCompleted
                              ? "bg-emerald-500 text-white"
                              : isCurrent
                              ? "bg-indigo-600 text-white animate-pulse"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {isCompleted ? "✓" : stepNum}
                        </span>
                        <span className="font-mono font-medium text-slate-200">
                          {task.filepath}
                        </span>
                      </div>

                      <div>
                        {isCompleted && (
                          <Badge variant="emerald" className="text-[10px]">
                            Completed
                          </Badge>
                        )}
                        {isCurrent && (
                          <Badge variant="default" className="text-[10px] animate-pulse">
                            Writing Code...
                          </Badge>
                        )}
                        {isPending && (
                          <Badge variant="secondary" className="text-[10px]">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-slate-300 text-[11px] leading-relaxed pl-7">
                      {task.task_description}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500 text-xs">
              <ListTodo className="h-8 w-8 mb-2 opacity-30 text-indigo-400" />
              <span>No architect tasks yet.</span>
              <span>The Architect Agent will decompose the plan into steps here.</span>
            </div>
          )}
        </TabsContent>

        {/* LOGS TAB */}
        <TabsContent value="logs" className="flex-1 overflow-y-auto max-h-[520px] font-mono text-xs space-y-1.5 pt-1 pr-1 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
          {logs.length > 0 ? (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 text-[11px] py-0.5 leading-snug border-b border-slate-900/60 last:border-0"
              >
                <span className="text-slate-500 shrink-0 select-none">
                  [{log.time}]
                </span>
                <span
                  className={`font-semibold shrink-0 ${
                    log.agent === "Planner"
                      ? "text-cyan-400"
                      : log.agent === "Architect"
                      ? "text-indigo-400"
                      : log.agent === "Coder"
                      ? "text-purple-400"
                      : "text-slate-400"
                  }`}
                >
                  [{log.agent}]:
                </span>
                <span
                  className={`break-all ${
                    log.type === "error"
                      ? "text-rose-400"
                      : log.type === "success"
                      ? "text-emerald-300"
                      : log.type === "warn"
                      ? "text-amber-300"
                      : "text-slate-300"
                  }`}
                >
                  {log.message}
                </span>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500 text-xs">
              <Terminal className="h-8 w-8 mb-2 opacity-30 text-slate-400" />
              <span>Log stream idle. Events will appear in real time here.</span>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}

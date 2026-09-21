"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { WorkflowPipeline, AgentStage } from "@/components/WorkflowPipeline";
import { PromptInput } from "@/components/PromptInput";
import { AgentInspector, ActivityLog } from "@/components/AgentInspector";
import { ProjectExplorer } from "@/components/ProjectExplorer";
import { CodeViewer } from "@/components/CodeViewer";
import {
  checkHealth,
  getProjectFiles,
  getFileContent,
  resetProject,
  streamProjectGeneration,
  HealthResponse,
  ProjectFile,
  FileContentResponse,
  ProjectPlan,
  TaskPlan,
  AgentEvent,
} from "@/lib/api";

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedFileData, setSelectedFileData] = useState<FileContentResponse | null>(null);
  const [isFileLoading, setIsFileLoading] = useState<boolean>(false);
  const [isFilesRefreshing, setIsFilesRefreshing] = useState<boolean>(false);

  const [stage, setStage] = useState<AgentStage>("idle");
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [totalSteps, setTotalSteps] = useState<number>(0);
  const [plan, setPlan] = useState<ProjectPlan | null>(null);
  const [taskPlan, setTaskPlan] = useState<TaskPlan | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const abortStreamRef = useRef<(() => void) | null>(null);

  const addLog = useCallback(
    (
      agent: string,
      message: string,
      type: "info" | "success" | "warn" | "error" = "info",
      details?: any
    ) => {
      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0];
      const newLog: ActivityLog = {
        id: `${Date.now()}-${Math.random()}`,
        time: timeStr,
        agent,
        message,
        type,
        details,
      };
      setLogs((prev) => [newLog, ...prev]);
    },
    []
  );

  // Poll health and files
  const refreshHealth = useCallback(async () => {
    try {
      const data = await checkHealth();
      setHealth(data);
    } catch {
      setHealth(null);
    }
  }, []);

  const refreshFilesList = useCallback(async () => {
    setIsFilesRefreshing(true);
    try {
      const list = await getProjectFiles();
      setFiles(list);
      return list;
    } catch (err) {
      console.error("Failed to load files", err);
      return [];
    } finally {
      setIsFilesRefreshing(false);
    }
  }, []);

  // Fetch file content
  const handleSelectFile = useCallback(async (path: string) => {
    setSelectedFilePath(path);
    setIsFileLoading(true);
    try {
      const data = await getFileContent(path);
      setSelectedFileData(data);
    } catch (err) {
      console.error("Failed to fetch file content", err);
    } finally {
      setIsFileLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshHealth();
    refreshFilesList().then((list) => {
      if (list && list.length > 0) {
        handleSelectFile(list[0].path);
      }
    });

    const interval = setInterval(refreshHealth, 15000);
    return () => clearInterval(interval);
  }, [refreshHealth, refreshFilesList, handleSelectFile]);

  // Handle generation start
  const handleGenerate = async (promptText: string, recursionLimit: number) => {
    setError(null);
    setIsGenerating(true);
    setStage("planner");
    setCurrentStep(0);
    setTotalSteps(0);
    setPlan(null);
    setTaskPlan(null);

    addLog("System", `Starting generation for prompt: "${promptText}"`, "info");
    addLog("Planner", "Analyzing prompt requirements and designing blueprint...", "info");

    const abortFn = await streamProjectGeneration(
      promptText,
      recursionLimit,
      (event: AgentEvent) => {
        if (event.type === "start") {
          setStage("planner");
        } else if (event.type === "planner_completed") {
          const p = event.data?.plan as ProjectPlan;
          setPlan(p);
          setStage("architect");
          addLog(
            "Planner",
            `Plan blueprint established: "${p?.name || "Project"}" with tech stack [${p?.techstack || "Default"}]`,
            "success"
          );
          addLog("Architect", "Breaking down plan into engineering implementation tasks...", "info");
        } else if (event.type === "architect_completed") {
          const tp = event.data?.task_plan as TaskPlan;
          const stepsCount =
            event.data?.total_steps || tp?.implementation_steps?.length || 0;
          setTaskPlan(tp);
          setTotalSteps(stepsCount);
          setStage("coder");
          addLog(
            "Architect",
            `Decomposed plan into ${stepsCount} sequential engineering tasks with context carryover`,
            "success"
          );
          addLog("Coder", "Initializing coder agent with file tool capabilities...", "info");
        } else if (event.type === "coder_step") {
          const stepIdx = event.data?.step_index || 0;
          const task = event.data?.current_task;
          const filesSnap = event.data?.files as ProjectFile[];
          const isDone = event.data?.status === "DONE";

          setCurrentStep(stepIdx);
          if (filesSnap && filesSnap.length > 0) {
            setFiles(filesSnap);
          }

          if (task) {
            addLog(
              "Coder",
              `Step ${stepIdx}: Modified/Created "${task.filepath}"`,
              "info"
            );
          }

          if (isDone) {
            setStage("completed");
          }
        } else if (event.type === "completed") {
          setStage("completed");
          setIsGenerating(false);
          addLog(
            "System",
            "Project build completed! All files have been successfully created.",
            "success"
          );
          refreshFilesList().then((list) => {
            if (list && list.length > 0) {
              handleSelectFile(list[0].path);
            }
          });
        } else if (event.type === "error") {
          setStage("error");
          setIsGenerating(false);
          const msg = event.data?.message || "Unknown error occurred";
          setError(msg);
          addLog("System", `Error encountered: ${msg}`, "error");
        }
      },
      (err: Error) => {
        setStage("error");
        setIsGenerating(false);
        setError(err.message);
        addLog("System", `Stream error: ${err.message}`, "error");
      },
      () => {
        setIsGenerating(false);
      }
    );

    abortStreamRef.current = abortFn;
  };

  const handleStop = () => {
    if (abortStreamRef.current) {
      abortStreamRef.current();
      abortStreamRef.current = null;
    }
    setIsGenerating(false);
    setStage("idle");
    addLog("System", "Generation stopped by user.", "warn");
  };

  const handleResetWorkspace = async () => {
    if (confirm("Are you sure you want to clean the generated_project workspace?")) {
      try {
        await resetProject();
        setFiles([]);
        setSelectedFilePath(null);
        setSelectedFileData(null);
        setPlan(null);
        setTaskPlan(null);
        setStage("idle");
        setCurrentStep(0);
        setTotalSteps(0);
        setError(null);
        addLog("System", "Workspace reset. All files cleared.", "info");
      } catch (err: any) {
        addLog("System", `Failed to reset workspace: ${err.message}`, "error");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 selection:bg-indigo-500/30">
      {/* Top Navbar */}
      <Navbar
        health={health}
        filesCount={files.length}
        isGenerating={isGenerating}
      />

      {/* Main Container */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Visual Pipeline */}
        <WorkflowPipeline
          currentStage={stage}
          currentStep={currentStep}
          totalSteps={totalSteps}
          error={error}
        />

        {/* Prompt Input & Config */}
        <PromptInput
          onGenerate={handleGenerate}
          onReset={handleResetWorkspace}
          onStop={handleStop}
          isGenerating={isGenerating}
          disabled={!health}
        />

        {/* Lower Workspace: Inspector & Explorer & Code Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Agent Blueprint & Tasks & Stream (5 cols) */}
          <div className="lg:col-span-5 h-[620px]">
            <AgentInspector
              plan={plan}
              taskPlan={taskPlan}
              currentStep={currentStep}
              logs={logs}
            />
          </div>

          {/* Right Column: Files Explorer (3 cols) + Code Viewer (4 cols) or Combined (7 cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-12 gap-4 h-[620px]">
            {/* File Explorer (5 of 12 cols) */}
            <div className="md:col-span-5 h-full">
              <ProjectExplorer
                files={files}
                selectedFile={selectedFilePath}
                onSelectFile={handleSelectFile}
                onRefresh={refreshFilesList}
                isLoading={isFilesRefreshing}
              />
            </div>

            {/* Code Viewer (7 of 12 cols) */}
            <div className="md:col-span-7 h-full">
              <CodeViewer
                fileData={selectedFileData}
                isLoading={isFileLoading}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Built with Next.js, shadcn/ui, Tailwind CSS & FastAPI for LangGraph CodeBuddy
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>LangGraph 1.2</span>
            <span>•</span>
            <span>FastAPI</span>
            <span>•</span>
            <span>Groq Llama / GPT-OSS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

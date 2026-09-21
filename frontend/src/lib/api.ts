export interface HealthResponse {
  status: string;
  service: string;
  groq_configured: boolean;
  project_root: string;
  files_count: number;
}

export interface ProjectFile {
  path: string;
  name: string;
  size: number;
  extension: string;
}

export interface FileContentResponse {
  path: string;
  name: string;
  extension: string;
  size: number;
  content: string;
}

export interface PlanFile {
  path: string;
  purpose: string;
}

export interface ProjectPlan {
  name: string;
  description: string;
  techstack: string;
  features: string[];
  files: PlanFile[];
}

export interface ImplementationTask {
  filepath: string;
  task_description: string;
}

export interface TaskPlan {
  implementation_steps: ImplementationTask[];
}

export interface AgentEvent {
  type:
    | "start"
    | "planner_completed"
    | "architect_completed"
    | "coder_step"
    | "completed"
    | "error";
  data: any;
}

const rawBase = process.env.NEXT_PUBLIC_API_URL?.trim();
export const API_BASE =
  rawBase !== undefined && rawBase !== ""
    ? rawBase.replace(/\/+$/, "")
    : typeof window !== "undefined"
    ? ""
    : "http://127.0.0.1:8000";

export function getApiBaseUrl(): string {
  return API_BASE;
}

export function getApiDocsUrl(): string {
  return API_BASE ? `${API_BASE}/docs` : "/docs";
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function getProjectFiles(): Promise<ProjectFile[]> {
  const res = await fetch(`${API_BASE}/api/project/files`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to list files: ${res.statusText}`);
  const data = await res.json();
  return data.files || [];
}

export async function getFileContent(path: string): Promise<FileContentResponse> {
  const res = await fetch(
    `${API_BASE}/api/project/file?path=${encodeURIComponent(path)}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Failed to fetch file content: ${res.statusText}`);
  return res.json();
}

export async function resetProject(): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/project/reset`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to reset project: ${res.statusText}`);
  return res.json();
}

export function getZipDownloadUrl(): string {
  return `${API_BASE}/api/project/download`;
}

export async function streamProjectGeneration(
  prompt: string,
  recursionLimit: number = 100,
  onEvent: (event: AgentEvent) => void,
  onError: (err: Error) => void,
  onComplete: () => void
): Promise<() => void> {
  const controller = new AbortController();

  try {
    const res = await fetch(`${API_BASE}/api/generate/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        recursion_limit: recursionLimit,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}: ${res.statusText}`);
    }

    if (!res.body) {
      throw new Error("No response body received from stream.");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const processStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const block of lines) {
            const dataLine = block
              .split("\n")
              .find((line) => line.startsWith("data: "));

            if (dataLine) {
              const jsonStr = dataLine.replace(/^data:\s*/, "").trim();
              if (jsonStr) {
                try {
                  const parsed = JSON.parse(jsonStr) as AgentEvent;
                  onEvent(parsed);
                } catch (e) {
                  console.warn("Failed to parse SSE line:", jsonStr, e);
                }
              }
            }
          }
        }
        onComplete();
      } catch (err: any) {
        if (err.name !== "AbortError") {
          onError(err);
        }
      }
    };

    processStream();
  } catch (err: any) {
    if (err.name !== "AbortError") {
      onError(err);
    }
  }

  return () => controller.abort();
}

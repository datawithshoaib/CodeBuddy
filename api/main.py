import asyncio
import io
import json
import os
import shutil
import zipfile
from pathlib import Path
from typing import AsyncGenerator, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field

# Load environment variables
load_dotenv()

from agent.graph import agent
from agent.states import WorkflowState, Plan, TaskPlan, CoderState
from agent.tools import PROJECT_ROOT, init_project_root, safe_path_for_project

app = FastAPI(
    title="CodeBuddy API",
    description="FastAPI backend for CodeBuddy autonomous multi-agent software engineer",
    version="1.0.0",
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows frontend on any local port (3000, 3001, etc.)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    prompt: str = Field(..., description="Natural language description of the project to build")
    recursion_limit: int = Field(100, description="Max recursion limit for LangGraph agent")


def get_project_file_tree() -> List[Dict]:
    """Helper to retrieve all files in PROJECT_ROOT with metadata."""
    if not PROJECT_ROOT.exists():
        return []

    file_list = []
    for p in sorted(PROJECT_ROOT.glob("**/*")):
        if p.is_file():
            rel_path = p.relative_to(PROJECT_ROOT).as_posix()
            try:
                size = p.stat().st_size
            except Exception:
                size = 0
            file_list.append({
                "path": rel_path,
                "name": p.name,
                "size": size,
                "extension": p.suffix.lower(),
            })
    return file_list


@app.get("/api/health")
async def health_check():
    """Health check and configuration status."""
    load_dotenv(override=True)
    groq_key = os.getenv("GROQ_API_KEY", "").strip().strip('"').strip("'")
    has_api_key = bool(groq_key) and not groq_key.startswith("your_groq_api_key")
    return {
        "status": "online",
        "service": "CodeBuddy AI Engineer API",
        "groq_configured": has_api_key,
        "project_root": str(PROJECT_ROOT),
        "files_count": len(get_project_file_tree()),
    }


@app.get("/api/project/files")
async def list_project_files():
    """Lists all files in generated_project."""
    init_project_root()
    files = get_project_file_tree()
    return {
        "files": files,
        "total_files": len(files),
        "project_root": str(PROJECT_ROOT),
    }


@app.get("/api/project/file")
async def get_project_file(path: str = Query(..., description="Relative path to file in generated_project")):
    """Get the text content of a generated file."""
    try:
        target_path = safe_path_for_project(path)
        if not target_path.exists() or not target_path.is_file():
            raise HTTPException(status_code=404, detail=f"File '{path}' not found.")

        try:
            content = target_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            # Fallback for binary or non-utf8 files
            content = f"// [Binary file or non-UTF-8 encoding: {target_path.stat().st_size} bytes]"

        return {
            "path": path,
            "name": target_path.name,
            "extension": target_path.suffix.lower(),
            "size": target_path.stat().st_size,
            "content": content,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/project/reset")
async def reset_project():
    """Wipes the generated_project folder for a clean start."""
    try:
        if PROJECT_ROOT.exists():
            shutil.rmtree(PROJECT_ROOT)
        init_project_root()
        return {"status": "success", "message": "Project workspace reset successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset workspace: {str(e)}")


@app.get("/api/project/download")
async def download_project_zip():
    """Creates a downloadable .zip archive of the generated project."""
    init_project_root()
    files = get_project_file_tree()
    if not files:
        raise HTTPException(status_code=404, detail="No files found in generated project to download.")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for f in PROJECT_ROOT.glob("**/*"):
            if f.is_file():
                rel_path = f.relative_to(PROJECT_ROOT).as_posix()
                zip_file.write(f, arcname=rel_path)

    zip_buffer.seek(0)
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="codebuddy_project.zip"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


def format_sse(event_type: str, data: dict) -> str:
    """Helper to format Server-Sent Event message."""
    payload = json.dumps({"type": event_type, "data": data})
    return f"data: {payload}\n\n"


async def generate_project_events(prompt: str, recursion_limit: int) -> AsyncGenerator[str, None]:
    """Generator running the LangGraph agent and emitting SSE events."""
    load_dotenv(override=True)
    init_project_root()

    yield format_sse("start", {
        "prompt": prompt,
        "message": "Starting CodeBuddy multi-agent workflow...",
    })

    try:
        # Run agent stream in worker thread to prevent blocking FastAPI event loop
        loop = asyncio.get_event_loop()

        def run_sync_stream():
            events = []
            for chunk in agent.stream(
                {"user_prompt": prompt},
                {"recursion_limit": recursion_limit}
            ):
                events.append(chunk)
            return events

        # Because agent nodes may invoke external APIs (Groq), we yield as nodes complete
        # We can iterate over the stream generator via a queue or by running stream chunks
        # Using a queue with a background thread allows real-time SSE streaming:
        queue = asyncio.Queue()

        def stream_worker():
            try:
                for chunk in agent.stream(
                    {"user_prompt": prompt},
                    {"recursion_limit": recursion_limit}
                ):
                    loop.call_soon_threadsafe(queue.put_nowait, ("chunk", chunk))
                loop.call_soon_threadsafe(queue.put_nowait, ("done", None))
            except Exception as e:
                loop.call_soon_threadsafe(queue.put_nowait, ("error", e))

        # Start thread
        worker_task = loop.run_in_executor(None, stream_worker)

        last_step_idx = -1
        total_steps = 0
        current_plan_data = None
        current_task_plan_data = None

        while True:
            msg_type, payload = await queue.get()

            if msg_type == "error":
                raw_err = str(payload)
                if (
                    "invalid_api_key" in raw_err.lower()
                    or "401" in raw_err
                    or "authenticationerror" in raw_err.lower()
                ):
                    friendly_msg = (
                        "Invalid Groq API Key (401). Please check your GROQ_API_KEY in the .env file. "
                        "You can generate a free API key at https://console.groq.com/keys"
                    )
                elif "groq_api_key is not set" in raw_err.lower():
                    friendly_msg = (
                        "GROQ_API_KEY is not set. Please add GROQ_API_KEY=your_key in your .env file."
                    )
                else:
                    friendly_msg = raw_err

                yield format_sse("error", {
                    "message": friendly_msg,
                    "details": repr(payload),
                })
                break

            if msg_type == "done":
                # Final check
                current_files = get_project_file_tree()
                yield format_sse("completed", {
                    "message": "Project development completed successfully!",
                    "files": current_files,
                    "plan": current_plan_data,
                    "task_plan": current_task_plan_data,
                })
                break

            if msg_type == "chunk":
                chunk = payload
                # chunk is a dict like {'planner': {...}}, {'architect': {...}}, or {'coder': {...}}
                if "planner" in chunk:
                    plan_obj = chunk["planner"].get("plan")
                    if isinstance(plan_obj, Plan):
                        current_plan_data = plan_obj.model_dump()
                    elif isinstance(plan_obj, dict):
                        current_plan_data = plan_obj
                    else:
                        current_plan_data = str(plan_obj)

                    yield format_sse("planner_completed", {
                        "agent": "Planner",
                        "plan": current_plan_data,
                    })

                elif "architect" in chunk:
                    task_plan_obj = chunk["architect"].get("task_plan")
                    if isinstance(task_plan_obj, TaskPlan):
                        current_task_plan_data = task_plan_obj.model_dump()
                    elif isinstance(task_plan_obj, dict):
                        current_task_plan_data = task_plan_obj
                    else:
                        current_task_plan_data = str(task_plan_obj)

                    if isinstance(current_task_plan_data, dict) and "implementation_steps" in current_task_plan_data:
                        total_steps = len(current_task_plan_data["implementation_steps"])

                    yield format_sse("architect_completed", {
                        "agent": "Architect",
                        "task_plan": current_task_plan_data,
                        "total_steps": total_steps,
                    })

                elif "coder" in chunk:
                    coder_res = chunk["coder"]
                    coder_state = coder_res.get("coder_state")
                    status = coder_res.get("status")

                    step_idx = 0
                    current_task = None
                    if isinstance(coder_state, CoderState):
                        step_idx = coder_state.current_step_idx
                        steps = coder_state.task_plan.implementation_steps
                        total_steps = len(steps)
                        if step_idx - 1 >= 0 and step_idx - 1 < len(steps):
                            current_task = steps[step_idx - 1].model_dump()
                    elif isinstance(coder_state, dict):
                        step_idx = coder_state.get("current_step_idx", 0)

                    files_snapshot = get_project_file_tree()

                    yield format_sse("coder_step", {
                        "agent": "Coder",
                        "step_index": step_idx,
                        "total_steps": total_steps,
                        "current_task": current_task,
                        "status": status,
                        "files": files_snapshot,
                    })

        await worker_task

    except Exception as e:
        yield format_sse("error", {"message": f"Unexpected error during generation: {str(e)}"})


@app.post("/api/generate/stream")
async def stream_generation(req: GenerateRequest):
    """Server-Sent Events endpoint streaming project generation progress in real time."""
    return StreamingResponse(
        generate_project_events(req.prompt, req.recursion_limit),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/generate")
async def generate_project(req: GenerateRequest):
    """Synchronous generation endpoint (non-streaming fallback)."""
    init_project_root()
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: agent.invoke(
                {"user_prompt": req.prompt},
                {"recursion_limit": req.recursion_limit}
            )
        )
        files = get_project_file_tree()
        return {
            "status": "success",
            "result": result,
            "files": files,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="127.0.0.1", port=8000, reload=True)

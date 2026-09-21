#!/usr/bin/env python3
"""
CodeBuddy Web Application Runner
Starts both the FastAPI backend and the Next.js frontend concurrently.
"""

import argparse
import os
import shutil
import subprocess
import sys
import time
import webbrowser
from pathlib import Path
from typing import List, Optional

ROOT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT_DIR / "frontend"


def check_env_file():
    """Checks for .env file and Groq API key."""
    env_path = ROOT_DIR / ".env"
    if not env_path.exists():
        print("⚠️  Warning: .env file not found in root directory!")
        print("   Please create a .env file containing: GROQ_API_KEY=your_key")
    else:
        with open(env_path, "r", encoding="utf-8") as f:
            content = f.read()
            if "GROQ_API_KEY" not in content or 'GROQ_API_KEY=""' in content:
                print("⚠️  Warning: GROQ_API_KEY does not seem to be configured in .env.")


def ensure_frontend_deps(npm_cmd: str):
    """Ensures frontend dependencies are installed."""
    node_modules = FRONTEND_DIR / "node_modules"
    if not node_modules.exists():
        print("📦 Installing frontend dependencies (npm install)...")
        res = subprocess.run([npm_cmd, "install"], cwd=str(FRONTEND_DIR), shell=(os.name == "nt"))
        if res.returncode != 0:
            print("❌ Failed to install frontend dependencies.")
            sys.exit(1)
        print("✅ Frontend dependencies installed.")


def kill_proc_tree(proc: subprocess.Popen):
    """Cleanly terminates a process and all its children."""
    if proc.poll() is not None:
        return

    pid = proc.pid
    if os.name == "nt":
        # On Windows, kill process tree cleanly
        try:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        except Exception:
            pass
    else:
        try:
            proc.terminate()
            proc.wait(timeout=3)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass


def main():
    parser = argparse.ArgumentParser(description="Start CodeBuddy web application")
    parser.add_argument("--api-port", type=int, default=8000, help="FastAPI backend port (default: 8000)")
    parser.add_argument("--port", type=int, default=3000, help="Next.js frontend port (default: 3000)")
    parser.add_argument("--backend-only", action="store_true", help="Start only FastAPI backend")
    parser.add_argument("--frontend-only", action="store_true", help="Start only Next.js frontend")
    parser.add_argument("--no-browser", action="store_true", help="Do not open browser automatically")

    args = parser.parse_args()

    check_env_file()

    npm_path = shutil.which("npm") or shutil.which("npm.cmd")
    if not args.backend_only and not npm_path:
        print("❌ Error: 'npm' was not found on your PATH. Please install Node.js.")
        sys.exit(1)

    processes: List[subprocess.Popen] = []

    print("\n" + "=" * 58)
    print(" 🚀 Starting CodeBuddy Multi-Agent Development Studio")
    print("=" * 58)

    try:
        # 1. Start FastAPI Backend
        if not args.frontend_only:
            print(f"\n⚡ Starting FastAPI Backend on http://127.0.0.1:{args.api_port} ...")
            backend_cmd = [
                sys.executable,
                "-m",
                "uvicorn",
                "api.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(args.api_port),
                "--reload",
            ]
            backend_proc = subprocess.Popen(backend_cmd, cwd=str(ROOT_DIR))
            processes.append(backend_proc)

        # 2. Start Next.js Frontend
        if not args.backend_only:
            ensure_frontend_deps(npm_path)
            print(f"\n🌐 Starting Next.js Frontend on http://localhost:{args.port} ...")
            frontend_cmd = [npm_path, "run", "dev", "--", "-p", str(args.port)]
            frontend_proc = subprocess.Popen(
                frontend_cmd,
                cwd=str(FRONTEND_DIR),
                shell=(os.name == "nt"),
            )
            processes.append(frontend_proc)

        # Summary and links
        print("\n" + "-" * 58)
        if not args.frontend_only:
            print(f" • FastAPI Backend:    http://127.0.0.1:{args.api_port}")
            print(f" • Interactive API:    http://127.0.0.1:{args.api_port}/docs")
        if not args.backend_only:
            print(f" • Web App Dashboard:  http://localhost:{args.port}")
        print("-" * 58)
        print(" Press Ctrl+C at any time to stop all servers.\n")

        # Open browser after a brief startup delay
        if not args.no_browser and not args.backend_only:
            def open_browser():
                time.sleep(2.5)
                webbrowser.open(f"http://localhost:{args.port}")

            import threading
            threading.Thread(target=open_browser, daemon=True).start()

        # Monitor processes
        while True:
            for proc in processes:
                if proc.poll() is not None:
                    # One of the processes exited
                    code = proc.returncode
                    print(f"\n⚠️ Process (PID {proc.pid}) exited with code {code}.")
                    raise KeyboardInterrupt
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n🛑 Shutting down CodeBuddy servers...")
        for proc in processes:
            kill_proc_tree(proc)
        print("✅ All servers stopped. Goodbye!")
        sys.exit(0)


if __name__ == "__main__":
    main()

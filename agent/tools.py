import os
from pathlib import Path
import subprocess
import tempfile
from typing import Tuple
from langchain_core.tools import tool


def _resolve_project_root() -> Path:
    custom_root = os.environ.get("PROJECT_ROOT")
    if custom_root:
        return Path(custom_root).resolve()
    # In Vercel or AWS Lambda serverless environments, filesystem is read-only outside /tmp
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        return Path(tempfile.gettempdir()) / "generated_project"
    return (Path(__file__).resolve().parent.parent / "generated_project").resolve()


PROJECT_ROOT = _resolve_project_root()


def init_project_root() -> str:
    global PROJECT_ROOT
    try:
        PROJECT_ROOT.mkdir(parents=True, exist_ok=True)
    except OSError:
        # Fallback to temp directory if current location is read-only
        PROJECT_ROOT = Path(tempfile.gettempdir()) / "generated_project"
        PROJECT_ROOT.mkdir(parents=True, exist_ok=True)
    return str(PROJECT_ROOT)


def safe_path_for_project(path: str) -> Path:
    init_project_root()
    p = (PROJECT_ROOT / path).resolve()

    if (PROJECT_ROOT.resolve() not in p.parents
        and PROJECT_ROOT.resolve() != p.parent 
        and PROJECT_ROOT.resolve() != p
    ):
        raise ValueError("Attempt to write outside project root")

    return p


@tool
def write_file(path: str, content: str) -> str:
    """Writes content to a file at the specified path within the project root."""

    p = safe_path_for_project(path)
    p.parent.mkdir(parents=True, exist_ok=True)

    with open(p, "w", encoding="utf-8") as f:
        f.write(content)

    return f"WROTE:{p}"


@tool
def read_file(path: str) -> str:
    """Reads content from a file at the specified path within the project root."""

    p = safe_path_for_project(path)

    if not p.exists():
        return ""

    with open(p, "r", encoding="utf-8") as f:
        return f.read()


@tool
def get_current_directory() -> str:
    """Returns the current working directory."""

    return str(PROJECT_ROOT)


@tool
def list_files(directory: str = ".") -> str:
    """Lists all files in the specified directory within the project root."""

    p = safe_path_for_project(directory)

    if not p.is_dir():
        return f"ERROR: {p} is not a directory"

    files = [str(f.relative_to(PROJECT_ROOT)) for f in p.glob("**/*") if f.is_file()]

    return "\n".join(files) if files else "No files found."


@tool
def run_cmd(cmd: str, cwd: str = None, timeout: int = 30) -> Tuple[int, str, str]:
    """Runs a shell command in the specified directory and returns the result."""

    cwd_dir = safe_path_for_project(cwd) if cwd else PROJECT_ROOT

    try:
        res = subprocess.run(cmd, 
                             shell=True, 
                             cwd=str(cwd_dir), 
                             capture_output=True, 
                             text=True, 
                             timeout=timeout)
        return res.returncode, res.stdout, res.stderr
    except Exception as e:
        return 1, "", f"Command execution error: {str(e)}"



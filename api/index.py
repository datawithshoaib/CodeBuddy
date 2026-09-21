import sys
from pathlib import Path

# Ensure repository root is on sys.path so 'agent' and 'api' modules resolve
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from api.main import app

# Expose ASGI app for Vercel Serverless Function runtime
__all__ = ["app"]

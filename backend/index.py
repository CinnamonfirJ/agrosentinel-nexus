"""ASGI entrypoint when backend/ is the independent Vercel service root."""
import importlib.util
import sys
from pathlib import Path

if 'backend' not in sys.modules:
    root = Path(__file__).resolve().parent
    spec = importlib.util.spec_from_file_location('backend', root / '__init__.py', submodule_search_locations=[str(root)])
    package = importlib.util.module_from_spec(spec)
    sys.modules['backend'] = package
    spec.loader.exec_module(package)

from backend.main import app

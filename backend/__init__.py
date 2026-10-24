"""Load deployment secrets before initializing database or providers."""
import os
from pathlib import Path
from dotenv import load_dotenv

if not os.environ.get('AGRO_TESTING'):
    load_dotenv(Path(__file__).resolve().parent.parent / '.env', override=False)

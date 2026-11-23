"""
Pytest configuration for GazeConnect backend tests.
Suppresses starlette/httpx deprecation warnings and configures test client.
"""

import warnings
import pytest

# Suppress the starlette+httpx deprecation warning (we use the standard TestClient)
warnings.filterwarnings(
    "ignore",
    message=".*httpx.*starlette.*deprecated.*",
    category=DeprecationWarning,
)
warnings.filterwarnings(
    "ignore",
    category=DeprecationWarning,
    module="starlette",
)

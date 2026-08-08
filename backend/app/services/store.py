"""In-memory investigation store (MVP storage layer).

Pure domain, no framework deps. Swappable for SQLite/PostgreSQL later.
"""

from __future__ import annotations

import threading
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.investigation import Investigation


class InMemoryInvestigationStore:
    """Thread-safe in-memory store for Investigation aggregates."""

    def __init__(self) -> None:
        self._data: dict[str, Investigation] = {}
        self._lock = threading.RLock()

    def create(self, investigation: Investigation) -> Investigation:
        with self._lock:
            if investigation.id in self._data:
                raise ValueError(f"Investigation {investigation.id} already exists")
            self._data[investigation.id] = investigation
            return investigation

    def get(self, investigation_id: str) -> Investigation | None:
        with self._lock:
            return self._data.get(investigation_id)

    def update(self, investigation: Investigation) -> Investigation:
        with self._lock:
            if investigation.id not in self._data:
                raise ValueError(f"Investigation {investigation.id} not found")
            self._data[investigation.id] = investigation
            return investigation

    def list(self, limit: int = 100, offset: int = 0) -> list[Investigation]:
        with self._lock:
            all_inv = sorted(self._data.values(), key=lambda i: i.created_at, reverse=True)
            return all_inv[offset : offset + limit]

    def delete(self, investigation_id: str) -> bool:
        with self._lock:
            return self._data.pop(investigation_id, None) is not None


# Singleton instance
_store: InMemoryInvestigationStore | None = None


def get_investigation_store() -> InMemoryInvestigationStore:
    global _store
    if _store is None:
        _store = InMemoryInvestigationStore()
    return _store
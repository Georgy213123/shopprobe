"""Посаженные дефекты для демонстрации ShopProbe (включаются SEEDED_BUGS=1).

Серверная часть: битая картинка одного товара и нестабильный запрос рекомендаций.
Остальные дефекты (консоль, 404 стиля, горизонтальный скролл, два h1, контраст)
включает фронт, узнав флаг из GET /api/meta.
"""

import itertools
import threading

BROKEN_IMAGE_SLUG = "shu-puer-staroe-derevo"


class FlakyGate:
    """Каждый нечётный вызов — отказ. Детерминированная замена «падает через раз»."""

    def __init__(self) -> None:
        self._counter = itertools.count(1)
        self._lock = threading.Lock()

    def should_fail(self) -> bool:
        with self._lock:
            return next(self._counter) % 2 == 1

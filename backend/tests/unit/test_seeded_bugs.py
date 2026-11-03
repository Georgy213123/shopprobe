"""Посаженные дефекты на стороне сервера (FR-12)."""

import xml.etree.ElementTree as ET

import pytest

from app.images import BROKEN_SVG, product_svg
from app.seeded_bugs import FlakyGate


def test_flaky_gate_alternates() -> None:
    gate = FlakyGate()
    assert [gate.should_fail() for _ in range(4)] == [True, False, True, False]


def test_product_svg_is_valid_and_has_intrinsic_size() -> None:
    root = ET.fromstring(product_svg("Лунцзин <весенний>", "green"))
    assert root.get("width") == "480" and root.get("height") == "360"


def test_broken_svg_is_not_parseable() -> None:
    with pytest.raises(ET.ParseError):
        ET.fromstring(BROKEN_SVG)

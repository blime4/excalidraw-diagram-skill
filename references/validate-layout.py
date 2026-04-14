#!/usr/bin/env python3
"""Excalidraw layout validator — detect overlapping elements.

Usage:
    python validate-layout.py <file.excalidraw.md>
    python validate-layout.py --json '<raw JSON string>'
    echo '<json>' | python validate-layout.py --stdin

Exit codes:  0 = clean,  1 = overlaps found,  2 = input error.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
from dataclasses import dataclass, field
from typing import Optional


# ────────────────────── Configuration ──────────────────────
MIN_GAP_PX = 10          # minimum spacing between sibling elements
CONTAINER_PAD_PX = 15     # minimum padding inside a container
OVERLAP_IGNORE_PX = 2     # ignore overlaps smaller than this
CJK_CHAR_WIDTH_RATIO = 1.0   # width multiplier for CJK characters
LATIN_CHAR_WIDTH_RATIO = 0.55 # width multiplier for Latin characters


# ────────────────────── Data Structures ──────────────────────
@dataclass
class BBox:
    x: float
    y: float
    w: float
    h: float

    @property
    def x2(self) -> float:
        return self.x + self.w

    @property
    def y2(self) -> float:
        return self.y + self.h

    def overlaps(self, other: "BBox") -> bool:
        return (
            self.x < other.x2
            and self.x2 > other.x
            and self.y < other.y2
            and self.y2 > other.y
        )

    def overlap_size(self, other: "BBox") -> tuple[float, float]:
        ow = min(self.x2, other.x2) - max(self.x, other.x)
        oh = min(self.y2, other.y2) - max(self.y, other.y)
        return (max(0, ow), max(0, oh))

    def contains(self, other: "BBox") -> bool:
        return (
            self.x <= other.x
            and self.y <= other.y
            and self.x2 >= other.x2
            and self.y2 >= other.y2
        )


@dataclass
class Element:
    id: str
    type: str
    bbox: BBox
    container_id: Optional[str] = None
    bound_text_ids: list[str] = field(default_factory=list)
    font_size: float = 16
    text: str = ""


@dataclass
class Overlap:
    a_id: str
    b_id: str
    a_type: str
    b_type: str
    overlap_w: float
    overlap_h: float
    fix_hint: str


# ────────────────────── Text Width Estimation ──────────────────────
def _is_cjk(ch: str) -> bool:
    cp = ord(ch)
    return (
        0x4E00 <= cp <= 0x9FFF       # CJK Unified Ideographs
        or 0x3400 <= cp <= 0x4DBF    # CJK Ext A
        or 0x3000 <= cp <= 0x303F    # CJK Symbols
        or 0x3040 <= cp <= 0x309F    # Hiragana
        or 0x30A0 <= cp <= 0x30FF    # Katakana
        or 0xFF00 <= cp <= 0xFFEF   # Fullwidth
    )


def estimate_text_size(text: str, font_size: float, line_height: float = 1.25) -> tuple[float, float]:
    """Estimate (width, height) of a text element based on its content."""
    lines = text.split("\n")
    max_width = 0.0
    for line in lines:
        w = 0.0
        for ch in line:
            if _is_cjk(ch):
                w += font_size * CJK_CHAR_WIDTH_RATIO
            else:
                w += font_size * LATIN_CHAR_WIDTH_RATIO
        max_width = max(max_width, w)
    height = len(lines) * font_size * line_height
    return (max_width, height)


# ────────────────────── Parsing ──────────────────────
def parse_elements(data: dict) -> list[Element]:
    """Extract visual elements from Excalidraw JSON."""
    elements: list[Element] = []
    for raw in data.get("elements", []):
        if raw.get("isDeleted", False):
            continue
        etype = raw.get("type", "")
        if etype not in ("rectangle", "text", "ellipse", "diamond", "frame"):
            continue

        eid = raw.get("id", "")
        x, y = raw.get("x", 0), raw.get("y", 0)
        w, h = raw.get("width", 0), raw.get("height", 0)

        # For standalone text, estimate real width from content
        text_content = raw.get("text", "")
        font_size = raw.get("fontSize", 16)
        container_id = raw.get("containerId")

        if etype == "text" and not container_id:
            est_w, est_h = estimate_text_size(
                text_content, font_size, raw.get("lineHeight", 1.25)
            )
            # Use the larger of declared vs estimated size
            w = max(w, est_w)
            h = max(h, est_h)

        bound_texts = [
            b["id"]
            for b in raw.get("boundElements", []) or []
            if b.get("type") == "text"
        ]

        elements.append(
            Element(
                id=eid,
                type=etype,
                bbox=BBox(x, y, w, h),
                container_id=container_id,
                bound_text_ids=bound_texts,
                font_size=font_size,
                text=text_content,
            )
        )
    return elements


def _build_zone_set(elements: list[Element], threshold_area: float = 100000) -> set[str]:
    """Identify large 'zone' rectangles that act as group containers."""
    zones: set[str] = set()
    for el in elements:
        if el.type == "rectangle" and el.bbox.w * el.bbox.h >= threshold_area:
            zones.add(el.id)
    return zones


def _is_legitimate_pair(a: Element, b: Element, zones: set[str]) -> bool:
    """Return True if this pair should NOT be flagged as overlapping."""
    # Text inside its container
    if a.type == "text" and a.container_id == b.id:
        return True
    if b.type == "text" and b.container_id == a.id:
        return True
    # Either element is a zone box (large background rectangle)
    if a.id in zones or b.id in zones:
        return True
    return False


# ────────────────────── Core Detection ──────────────────────
def detect_overlaps(elements: list[Element]) -> list[Overlap]:
    zones = _build_zone_set(elements)
    overlaps: list[Overlap] = []

    for i, a in enumerate(elements):
        for j in range(i + 1, len(elements)):
            b = elements[j]
            if _is_legitimate_pair(a, b, zones):
                continue
            if not a.bbox.overlaps(b.bbox):
                continue
            ow, oh = a.bbox.overlap_size(b.bbox)
            if ow <= OVERLAP_IGNORE_PX or oh <= OVERLAP_IGNORE_PX:
                continue

            # Generate fix hint
            hint = _suggest_fix(a, b, ow, oh)
            overlaps.append(
                Overlap(a.id, b.id, a.type, b.type, round(ow, 1), round(oh, 1), hint)
            )
    return overlaps


def _suggest_fix(a: Element, b: Element, ow: float, oh: float) -> str:
    """Suggest the minimum shift to resolve an overlap."""
    shift = max(ow, oh) + MIN_GAP_PX

    # Determine which direction to shift
    cx_a = a.bbox.x + a.bbox.w / 2
    cy_a = a.bbox.y + a.bbox.h / 2
    cx_b = b.bbox.x + b.bbox.w / 2
    cy_b = b.bbox.y + b.bbox.h / 2

    if ow < oh:
        # Narrower horizontal overlap — shift horizontally
        if cx_b >= cx_a:
            return f"Move '{b.id}' right by {math.ceil(ow + MIN_GAP_PX)}px"
        else:
            return f"Move '{b.id}' left by {math.ceil(ow + MIN_GAP_PX)}px"
    else:
        # Narrower vertical overlap — shift vertically
        if cy_b >= cy_a:
            return f"Move '{b.id}' down by {math.ceil(oh + MIN_GAP_PX)}px"
        else:
            return f"Move '{b.id}' up by {math.ceil(oh + MIN_GAP_PX)}px"


# ────────────────────── Input Handling ──────────────────────
def load_json_from_file(path: str) -> dict:
    """Extract Excalidraw JSON from a .excalidraw.md file."""
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Try uncompressed json block
    m = re.search(r"```json\s*\n(.+?)\n```", content, re.DOTALL)
    if m:
        return json.loads(m.group(1))

    # Check for compressed-json (can't decompress here)
    if "```compressed-json" in content:
        print(
            "WARNING: File uses compressed-json format. "
            "Use --json with raw JSON or decompress first via Obsidian.",
            file=sys.stderr,
        )
        sys.exit(2)

    raise ValueError("No Excalidraw JSON block found in file")


def load_json_from_string(raw: str) -> dict:
    return json.loads(raw)


# ────────────────────── Report ──────────────────────
def print_report(overlaps: list[Overlap], total_elements: int) -> None:
    print(f"Elements checked: {total_elements}")
    if not overlaps:
        print("No overlaps detected.")
        return

    print(f"Overlaps detected: {len(overlaps)}\n")
    print(f"{'#':<4} {'Element A':<20} {'Element B':<20} {'Overlap':<14} {'Fix'}")
    print("-" * 90)
    for idx, o in enumerate(overlaps, 1):
        a_label = f"{o.a_id}({o.a_type})"
        b_label = f"{o.b_id}({o.b_type})"
        size = f"{o.overlap_w}x{o.overlap_h}px"
        print(f"{idx:<4} {a_label:<20} {b_label:<20} {size:<14} {o.fix_hint}")


# ────────────────────── Main ──────────────────────
def main() -> int:
    parser = argparse.ArgumentParser(description="Excalidraw layout overlap detector")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("file", nargs="?", help="Path to .excalidraw.md file")
    group.add_argument("--json", dest="json_str", help="Raw Excalidraw JSON string")
    group.add_argument("--stdin", action="store_true", help="Read JSON from stdin")
    args = parser.parse_args()

    try:
        if args.json_str:
            data = load_json_from_string(args.json_str)
        elif args.stdin:
            data = load_json_from_string(sys.stdin.read())
        else:
            data = load_json_from_file(args.file)
    except (json.JSONDecodeError, ValueError, FileNotFoundError) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 2

    elements = parse_elements(data)
    overlaps = detect_overlaps(elements)
    print_report(overlaps, len(elements))
    return 1 if overlaps else 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Static regression audit for the two authorized Nyra reference files."""
from __future__ import annotations

import base64
import re
import sys
from pathlib import Path

HTML = Path(__file__).resolve().parents[1] / "app/src/main/assets/www/index.html"
text = HTML.read_text(encoding="utf-8")

payload_match = re.search(
    r'const pages = \{items: "([^"]+)", character: "([^"]+)", animation: "([^"]+)"\};',
    text,
)
if not payload_match:
    print("FAIL: editor payload map is missing", file=sys.stderr)
    raise SystemExit(1)

pages = {
    key: base64.b64decode(value).decode("utf-8")
    for key, value in zip(("items", "character", "animation"), payload_match.groups())
}

required = {
    "items": {
        "ids": {
            "texture", "preview", "paintColor", "erasePixel", "resetTexture",
            "download", "downloadJson", "downloadAddon", "itemId", "toggleGrid",
            "face1", "face2", "face3",
        },
        "functions": {"matrixFor", "paintMatrix", "drawPreview", "editPixel", "saveMatrix", "downloadBlob", "slug"},
        "strings": {"JSZip", "Resource_Pack", "Behavior_Pack", "PNG"},
    },
    "character": {
        "ids": {
            "view", "partColor", "hue", "sat", "lum", "shapeType", "addShape",
            "dimX", "dimY", "dimZ", "posX", "posY", "posZ", "moveTool",
            "rotateTool", "scaleTool", "deleteSelected", "file", "save",
            "saveBBModel", "load", "restorePart",
        },
        "functions": {
            "project", "apply", "importBBModelFile", "buildBBModel", "resetToEmptyProject",
            "pushUndo", "undoLast", "addVoxel", "setVoxelMode", "selectVoxel",
        },
        "strings": {"THREE.WebGLRenderer", "OrbitControls", "TransformControls", "exportProject"},
    },
    "animation": {
        "ids": {
            "viewport", "joint", "jointButtons", "rx", "ry", "rz", "rxVal", "ryVal",
            "rzVal", "addFrame", "deleteFrame", "duplicateFrame", "play", "stop",
            "saveProject", "loadProject", "exportProject", "exportAnim", "speed",
            "samplePoses", "sampleEquipment", "backpackToggle",
        },
        "functions": {
            "getPose", "setPose", "interpolate", "projectData", "renderFrames",
            "playLoop", "stopPlayback", "equiparItem", "desequiparItem", "setEquipment",
        },
        "strings": {"OrbitControls", "requestAnimationFrame", "JSON.stringify"},
    },
}

errors = []
for key, page in pages.items():
    spec = required[key]
    ids = set(re.findall(r'\bid=["\']([^"\']+)', page))
    functions = set(re.findall(r'function\s+([A-Za-z_$][\w$]*)\s*\(', page))
    missing_ids = sorted(spec["ids"] - ids)
    missing_functions = sorted(spec["functions"] - functions)
    missing_strings = sorted(s for s in spec["strings"] if s not in page)
    if missing_ids or missing_functions or missing_strings:
        errors.append(
            f"{key}: missing IDs={missing_ids}; functions={missing_functions}; strings={missing_strings}"
        )
    print(
        f"{key}: {len(ids)} DOM IDs, {len(functions)} named functions, "
        f"{len(page)} decoded characters"
    )

# These URLs exist in the original reference pages; the Android adapter must redirect them
# to assets which are generated and hash-checked by the Gradle preBuild task.
for needle in (
    "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
    "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/",
):
    if needle not in text:
        errors.append(f"embedded source dependency not found: {needle}")
    if needle not in text[text.find("function addAndroidExportAdapter"):]:
        errors.append(f"Android dependency adapter no longer handles: {needle}")

for needle in (
    "/assets/www/vendor/jszip/jszip.min.js",
    "/assets/www/vendor/three/build/three.module.js",
    "/assets/www/vendor/three/examples/jsm/",
    "beginExport", "appendExportChunk", "finishExport",
):
    if needle not in text:
        errors.append(f"missing local runtime adapter: {needle}")

if errors:
    print("FAIL: regression audit detected issues:", file=sys.stderr)
    for error in errors:
        print(f" - {error}", file=sys.stderr)
    raise SystemExit(1)

print("PASS: reference editor payloads retain critical controls/functions; offline and Android export adapters are present.")

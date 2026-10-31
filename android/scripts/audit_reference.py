#!/usr/bin/env python3
"""Static regression audit for the two authorized Nyra reference files."""
from __future__ import annotations

import base64
import re
import sys
import subprocess
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
        "strings": {"THREE.WebGLRenderer", "OrbitControls", "TransformControls", "bbmodel"},
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
    "beginExport", "appendExportChunk", "finishExport", "HTMLAnchorElement.prototype.click",
):
    if needle not in text:
        errors.append(f"missing local runtime adapter: {needle}")


# Regression guards for Android adaptations and persistence that must not replace editor logic.
for needle in (
    "nyra.items.draft.v1",
    "nyra.character.draft.v1",
    "nyra.character.draft.mode.v1",
    "nyra3d-robotv-project",
    "Reimporte o arquivo .bbmodel",
    "function addAndroidExportAdapter",
    "beginExport", "appendExportChunk", "finishExport",
):
    if needle not in text:
        errors.append(f"missing Android adapter/persistence marker: {needle}")

java_path = Path(__file__).resolve().parents[1] / "app/src/main/java/com/nyra/studio/MainActivity.java"
java = java_path.read_text(encoding="utf-8")
for needle in ("onShowFileChooser", "FILE_CHOOSER_REQUEST", "ACTION_OPEN_DOCUMENT",
               "CREATE_DOCUMENT_REQUEST", "WebViewAssetLoader", "MAX_EXPORT_BYTES"):
    if needle not in java:
        errors.append(f"missing Android native file support: {needle}")

# There must be one literal close for the top-level document and escaped
# closes for nested scripts inside JavaScript string literals.
if text.lower().count("</script>") != 1 or text.count("<\\/script>") < 1:
    errors.append("outer HTML must have one literal closing tag and escaped nested module tags")


# Parse the outer bootstrap safely: the embedded Character Editor module's
# closing tag is escaped as <\\/script> inside the JavaScript string.
# This is syntax-only validation; WebGL still requires a real Android device.
def node_syntax_check(label: str, source: str) -> None:
    if not source.strip():
        return
    result = subprocess.run(
        ["node", "--check", "--input-type=module"],
        input=source,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode:
        errors.append(f"JavaScript syntax error in {label}: {result.stderr.strip() or result.stdout.strip()}")

script_open_match = re.search(r"<script\\b[^>]*>", text, flags=re.IGNORECASE)
script_close = text.rfind("</script>")
if script_open_match and script_close > script_open_match.end():
    outer_source = text[script_open_match.end():script_close]
    # The model I/O HTML/module is injected from a JS string. Check the outer
    # bootstrap independently; the assembled generated module is checked below.
    model_tools_start = outer_source.find("const modelTools = ")
    if model_tools_start >= 0:
        model_tools_end = outer_source.find('";\\n  const panelEnd', model_tools_start)
        if model_tools_end < 0:
            errors.append("could not isolate the model I/O template string")
        else:
            outer_source = outer_source[:model_tools_start] + 'const modelTools = "";' + outer_source[model_tools_end + 2:]
    node_syntax_check("outer app bootstrap", outer_source)
else:
    errors.append("could not isolate the outer app bootstrap script")

# Decode and parse each original editor's own scripts independently.
for key, page in pages.items():
    blocks = re.findall(r"<script\b([^>]*)>([\s\S]*?)</script>", page, flags=re.IGNORECASE)
    checked = 0
    for attrs, script in blocks:
        if "importmap" in attrs.lower() or not script.strip():
            continue
        checked += 1
        node_syntax_check(f"{key} inline script #{checked}", script)

if errors:
    print("FAIL: regression audit detected issues:", file=sys.stderr)
    for error in errors:
        print(f" - {error}", file=sys.stderr)
    raise SystemExit(1)

print("PASS: reference editor payloads retain critical controls/functions; offline and Android export adapters are present.")

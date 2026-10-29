#!/usr/bin/env python3
"""Verify the build artifact contains the required runtime assets, not just HTML."""
from __future__ import annotations

import hashlib
import sys
import zipfile
from pathlib import Path

apk = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("android/app/build/outputs/apk/debug/app-debug.apk")
if not apk.is_file():
    raise SystemExit(f"FAIL: APK not found: {apk}")

required = {
    "assets/www/index.html": None,
    "assets/www/vendor/three/build/three.module.js": "9052042d676cb0fdc1ddfefe193053f34b7ac0513a616fdac4535d49987812ea",
    "assets/www/vendor/three/build/three.core.js": "9edde002b066a9a05676a6127f67735b62baf399bdea529f2f7e31657da769e6",
    "assets/www/vendor/three/examples/jsm/controls/OrbitControls.js": "3d79d07ecb686b4e5d93232eedab255331c1beef711e13164eaa1f68655a5f2b",
    "assets/www/vendor/three/examples/jsm/controls/TransformControls.js": "151befe25bb0d68626f9a6b033625b7b0cf6848e39ba71623b7bed8e3df565d6",
    "assets/www/vendor/three/LICENSE": None,
    "assets/www/vendor/jszip/jszip.min.js": None,
    "assets/www/vendor/jszip/LICENSE.markdown": None,
}
with zipfile.ZipFile(apk) as z:
    names = set(z.namelist())
    errors = []
    for name, expected_hash in required.items():
        if name not in names:
            errors.append(f"missing {name}")
            continue
        data = z.read(name)
        if not data:
            errors.append(f"empty {name}")
            continue
        if expected_hash:
            actual = hashlib.sha256(data).hexdigest()
            if actual != expected_hash:
                errors.append(f"hash mismatch {name}: {actual}")
        print(f"OK {name}: {len(data)} bytes")
    if "assets/www/index.html" in names:
        html = z.read("assets/www/index.html").decode("utf-8")
        for marker in ("/assets/www/vendor/jszip/jszip.min.js",
                       "/assets/www/vendor/three/build/three.module.js",
                       "/assets/www/vendor/three/examples/jsm/",
                       "function addAndroidExportAdapter"):
            if marker not in html:
                errors.append(f"HTML missing local adapter marker: {marker}")
        if len(html) < 100_000:
            errors.append("integrated editor HTML is unexpectedly small")
    if errors:
        print("FAIL: APK audit failed:", file=sys.stderr)
        for error in errors:
            print(f" - {error}", file=sys.stderr)
        raise SystemExit(1)

print(f"PASS: {apk.name} contains all required offline dependencies and the integrated HTML.")

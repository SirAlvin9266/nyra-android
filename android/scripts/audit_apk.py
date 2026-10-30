#!/usr/bin/env python3
"""Verify the APK contains the pinned, local 3D runtime and editor assets."""
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
    "assets/www/vendor/three/examples/jsm/loaders/GLTFLoader.js": "131c0f78c01d19368ae495caa65b3adaa10487810a36a05bb5901b769a35ac16",
    "assets/www/vendor/three/examples/jsm/loaders/OBJLoader.js": "86c8384e269b75a21d502d438e3f0dc2e09dc61b6e6da6b81947f5b119112bf8",
    "assets/www/vendor/three/examples/jsm/loaders/FBXLoader.js": "7fb8586158a2cf98477b2ee40a82ebec10a81040c70369bb177043375c355322",
    "assets/www/vendor/three/examples/jsm/loaders/STLLoader.js": "023ed97f848b633d8bcd53d4db3b996d29d0c644088700691297c552257d480b",
    "assets/www/vendor/three/examples/jsm/exporters/GLTFExporter.js": "d766b04f233fa8bc72bfaebacaac5ecb832c30ca3695ce8d84bbb7dccccdc842",
    "assets/www/vendor/three/examples/jsm/exporters/OBJExporter.js": "2df529483eec685ec5c9a52f6a370acc654592aeeb495a8e862d8bb6d3d5063e",
    "assets/www/vendor/three/examples/jsm/exporters/STLExporter.js": "6508e5f79d120c7fdb677430342179609b27f59942dd6a2e215eef3ff60a7e60",
    "assets/www/vendor/three/examples/jsm/utils/BufferGeometryUtils.js": "9fb63427ce6641fa14fd0baff9cc4d1b5f9c3d85fd084bf2e90e803c44ec1797",
    "assets/www/vendor/three/examples/jsm/utils/SkeletonUtils.js": "b1632a703206c3d830de9fcbe515696770d04b71a15ee6b50afa6d2c3298c86f",
    "assets/www/vendor/three/examples/jsm/libs/fflate.module.js": "209a4412eb48ce609edb4391992a792ffcc3983d30ee7e2b0b89a8c470f3cd8a",
    "assets/www/vendor/three/examples/jsm/curves/NURBSCurve.js": "bef2607618a7778455e71a1f0bd206951c382d313e2e245808cc7d3533d60fb6",
    "assets/www/vendor/three/examples/jsm/curves/NURBSUtils.js": "c6bd7c4137d585098923f189687898ea3e8762ea3ecbe255d749a56353894379",
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
        for marker in (
            "/assets/www/vendor/jszip/jszip.min.js",
            "/assets/www/vendor/three/build/three.module.js",
            "/assets/www/vendor/three/examples/jsm/",
            "three/addons/loaders/GLTFLoader.js",
            "three/addons/loaders/FBXLoader.js",
            "three/addons/exporters/GLTFExporter.js",
            "NyraModelIO",
            "NyraModelIO",
            "function addAndroidExportAdapter",
        ):
            if marker not in html:
                errors.append(f"HTML missing local adapter marker: {marker}")
        if len(html) < 100_000:
            errors.append("integrated editor HTML is unexpectedly small")
    if errors:
        print("FAIL: APK audit failed:", file=sys.stderr)
        for error in errors:
            print(f" - {error}", file=sys.stderr)
        raise SystemExit(1)
print(f"PASS: {apk.name} contains the pinned local model IO dependencies and integrated HTML.")

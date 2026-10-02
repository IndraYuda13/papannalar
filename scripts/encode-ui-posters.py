"""Encode Blender's new transparent renders and update their asset manifest.

Offline authoring helper, not an application service. Requires Pillow.
Run after scripts/refine-ui-assets.py: python3 scripts/encode-ui-posters.py
"""

from pathlib import Path
import hashlib
import json

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DESIGN = ROOT / "design/pn-ui-v2"
PUBLIC = ROOT / "public/assets/pn-ui-v2"
receipt = json.loads((DESIGN / "blender-provenance.json").read_text())
original = json.loads((DESIGN / "originals/manifest.json").read_text())
assets = []
for item in receipt["models"]:
    asset = item["id"]
    target = PUBLIC / "posters" / (asset + ".webp")
    with Image.open(DESIGN / "renders" / (asset + ".png")) as image:
        assert image.mode == "RGBA" and image.size == (720, 540)
        assert image.getextrema()[3][0] == 0
        image.save(target, format="WEBP", quality=88, method=6, exact=True)
    old = next(value for value in original["assets"] if value["id"] == asset)
    assets.append({**old, **item, "posterBytes": target.stat().st_size,
                   "posterSha256": hashlib.sha256(target.read_bytes()).hexdigest(),
                   "posterSize": [720, 540], "maxModelBytes": 500000,
                   "origin": "Supplied CC0 geometry refined with Blender " + receipt["version"],
                   "applicationUsage": "3D otomatis saat scene terlihat dan preferensi memungkinkan; poster pada kartu/fallback.",
                   "externalResources": False})
manifest = {"assets": assets, "authoring": {
    "tool": "Blender", "version": receipt["version"], "renderEngine": "Cycles CPU",
    "script": "scripts/refine-ui-assets.py", "posterEncoder": "scripts/encode-ui-posters.py",
    "originals": "design/pn-ui-v2/originals/", "paidApiCalls": 0,
    "license": "CC0-1.0"}, "maxConcurrentCanvas": 1,
    "note": "Local browser coverage exercises all three real GLBs; physical devices and hosted deployment remain NOT_RUN."}
(PUBLIC / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"models": sum(a["bytes"] for a in assets),
                  "posters": sum(a["posterBytes"] for a in assets)}, indent=2))

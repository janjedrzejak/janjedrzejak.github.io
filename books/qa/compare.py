"""Generate measured keyframe comparisons from genuine captured browser viewports."""

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PHASES = [
    ("desktop-idle", "Półka w spoczynku"),
    ("desktop-next-mid", "Wybór sąsiada · 133 ms"),
    ("desktop-next", "Druga książka w centrum"),
    ("desktop-return-mid", "Powrót do pierwszej · 133 ms"),
    ("desktop-return", "Pierwsza książka w centrum"),
    ("desktop-open-mid", "Otwieranie · 525 ms"),
    ("desktop-details", "Szczegóły · 2400 ms"),
    ("desktop-close-mid", "Zamykanie · 400 ms"),
    ("desktop-restored", "Półka po powrocie"),
]


def font(size, bold=False):
    family = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    try:
        return ImageFont.truetype(family, size=size)
    except OSError:
        return ImageFont.load_default(size=size)


def plate(pairs, out, thumb_width):
    margin = 20
    gap = 14
    top = 44
    caption = 44
    bottom = 16
    width = thumb_width * 2 + gap + margin * 2
    rows = []
    for left, right, label in pairs:
        originals = [Image.open(f).convert("RGB") for f in (left, right)]
        if originals[0].size != originals[1].size:
            raise ValueError(
                f"Different captured viewport sizes for {label}: {[v.size for v in originals]}"
            )
        w, h = originals[0].size
        miniature = (thumb_width, round(h * thumb_width / w))
        rows.append(
            (
                [im.resize(miniature, Image.Resampling.LANCZOS) for im in originals],
                label,
            )
        )
    height = top + sum(caption + row[0][0].height + bottom for row in rows) + 8
    canvas = Image.new("RGB", (width, height), "#f0f1f1")
    draw = ImageDraw.Draw(canvas)
    for j, t in enumerate(["LAYOFFS & HIRES", "ENGINEERING SHELF"]):
        draw.text(
            (margin + j * (thumb_width + gap), 12),
            t,
            font=font(16, True),
            fill="#27333a",
        )
    y = top
    for images, label in rows:
        draw.text((margin, y + 6), label, font=font(17), fill="#263039")
        y += caption
        for j, im in enumerate(images):
            canvas.paste(im, (margin + j * (thumb_width + gap), y))
        y += images[0].height + bottom
    canvas.save(out, optimize=True)


def nearest_org(scene, index):
    candidates = [m for m in scene["visible"] if m["index"] % 14 == index]
    if not candidates:
        return None
    return min(
        candidates,
        key=lambda m: abs(m["front"][0] + m["front"][2] / 2 - scene["viewport"][0] / 2),
    )["front"]


def deltas(ref, app):
    ar = [app[k] for k in ["x", "y", "width", "height"]]
    edges = lambda b: [b[0], b[1], b[0] + b[2], b[1] + b[3]]
    return {
        "reference": ref,
        "app": [round(v, 3) for v in ar],
        "maxEdgeDeltaPx": round(
            max(abs(a - b) for a, b in zip(edges(ref), edges(ar))), 2
        ),
    }


def main(ref, clone, out):
    out.mkdir(parents=True, exist_ok=True)
    original = {f["name"]: f for f in json.loads((ref / "keyframes.json").read_text())}
    app = json.loads((clone / "results.json").read_text())
    delta = {}

    def pair(name, label):
        return (ref / (name + ".png"), clone / (name + ".png"), label)

    for name, label in PHASES:
        frame = app["frames"][name]["geometry"]
        ids = (
            [0, 1]
            if name in ["desktop-next-mid", "desktop-return-mid"]
            else [1 if name == "desktop-next" else 0]
        )
        comparisons = {}
        for i in ids:
            af = next((f["front"] for f in frame["faces"] if f["index"] == i), None)
            rf = nearest_org(original[name], i)
            if af and rf:
                comparisons[str(i)] = deltas(rf, af)
        delta[name] = comparisons
    plate(
        [pair("desktop-idle", "1440 × 900 · stan początkowy")],
        out / "desktop-porownanie.png",
        700,
    )
    plate(
        [
            pair("mobile-390-idle", "390 × 844 · półka"),
            pair("mobile-390-details", "390 × 844 · szczegóły"),
        ],
        out / "mobile-porownanie.png",
        305,
    )
    plate([pair(*p) for p in PHASES[:5]], out / "wybor-klatki.png", 470)
    plate(
        [pair(*p) for p in [PHASES[i] for i in (0, 5, 6, 7, 8)]],
        out / "otwieranie-klatki.png",
        470,
    )
    for w in [390, 393, 430, 768]:
        ref_phone = json.loads((ref / f"mobile-{w}-results.json").read_text())["idle"]
        clone_phone = app["frames"][f"mobile-{w}-idle"]["geometry"]["faces"][0]["front"]
        delta[f"mobile-{w}-idle"] = {
            "0": deltas(nearest_org(ref_phone, 0), clone_phone)
        }
    (out / "geometry-delta.json").write_text(json.dumps(delta, indent=2))
    print({k: {i: d["maxEdgeDeltaPx"] for i, d in v.items()} for k, v in delta.items()})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reference", type=Path)
    parser.add_argument("app", type=Path)
    parser.add_argument("out", type=Path)
    args = parser.parse_args()
    main(args.reference, args.app, args.out)

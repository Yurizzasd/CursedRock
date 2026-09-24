#!/usr/bin/env python3
"""Gera capas e showcases em SVG para o CursedRock (sem dependências externas).

Uso:  python scripts/make-art.py
Gera: public/images/addons/<id>.svg  +  public/images/showcase/<scene>.svg
"""
import hashlib
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ADDON_DIR = os.path.join(ROOT, "public", "images", "addons")
SHOW_DIR = os.path.join(ROOT, "public", "images", "showcase")

# id do addon -> (cor principal, motivo)
ADDONS = {
    "bloodmoon-arsenal": ("#e5322d", "swords"),
    "forgotten-dungeons": ("#b78a3e", "dungeon"),
    "dread-tide-horror": ("#7c1310", "eye"),
    "arcanum-spellbound": ("#a855f7", "rune"),
    "skyline-vehicles": ("#38bdf8", "road"),
    "fps-obsidian": ("#22d3ee", "bolt"),
    "netherite-tactical": ("#64748b", "crosshair"),
    "cursed-entities": ("#dc2626", "eye"),
    "redstone-machinery": ("#ef4444", "circuit"),
    "ironhold-furniture": ("#f59e0b", "chair"),
    "deep-dark-expansion": ("#0ea5e9", "cave"),
    "starfall-powers": ("#f472b6", "burst"),
    "katana-spirits": ("#e879f9", "swords"),
    "lucky-nether-block": ("#fbbf24", "dice"),
    "true-survival": ("#fb923c", "sun"),
    "smart-inventory": ("#94a3b8", "grid"),
    "cartographers-minimap": ("#4ade80", "compass"),
    "verdant-farming": ("#84cc16", "sprout"),
    "spirit-companions": ("#67e8f9", "ghost"),
    "arena-pvp-kits": ("#f87171", "trophy"),
    "cavernous-worldgen": ("#34d399", "cave"),
    "apocalypse-rig": ("#d97706", "road"),
    "twilight-decor": ("#c084fc", "moon"),
    "hollow-depths": ("#312e81", "eye"),
}

SHOWCASES = {
    "combat-1": "#e5322d", "combat-2": "#7c1310",
    "dungeon-1": "#b78a3e", "dungeon-2": "#8b5cf6",
    "horror-1": "#7c1310", "horror-2": "#1f1f28",
    "cave-1": "#0ea5e9", "magic-1": "#a855f7", "magic-2": "#67e8f9",
    "vehicle-1": "#38bdf8", "vehicle-2": "#d97706", "world-1": "#4ade80",
    "tech-1": "#22d3ee", "tech-2": "#64748b",
    "decor-1": "#f59e0b", "decor-2": "#c084fc",
    "anime-1": "#f472b6", "arena-1": "#f87171",
    "fun-1": "#fbbf24", "fun-2": "#84cc16",
    "farm-1": "#84cc16", "farm-2": "#4ade80",
    "survival-1": "#fb923c",
}


def rng(seed: str, n: int) -> list[int]:
    h = hashlib.sha256(seed.encode()).digest()
    out = []
    i = 0
    while len(out) < n:
        out.append(h[i % len(h)])
        i += 1
        if i % len(h) == 0:
            h = hashlib.sha256(h).digest()
    return out


def pixels(seed: str, count: int, w: int, h: int, size: int, color: str, opacity: float) -> str:
    r = rng(seed, count * 2)
    parts = []
    for i in range(count):
        x = (r[2 * i] / 255) * w
        y = (r[2 * i + 1] / 255) * h
        parts.append(
            f'<rect x="{x:.0f}" y="{y:.0f}" width="{size}" height="{size}" fill="{color}" opacity="{opacity}"/>'
        )
    return "".join(parts)


def mountains(seed: str, base_y: int, color: str, peak: int = 120) -> str:
    r = rng("m" + seed, 12)
    pts = [f"0,{450}"]
    x = 0
    for i in range(6):
        x += 90 + (r[i] % 80)
        y = base_y - (r[6 + i] % peak)
        pts.append(f"{x},{y}")
    pts.append("800,450")
    return f'<polygon points="{" ".join(pts)}" fill="{color}"/>'


def ground(accent: str) -> str:
    # fileira de blocos pixelados no rodapé
    cells = []
    for i in range(20):
        x = i * 40
        shade = "#17171e" if i % 2 == 0 else "#1e1e26"
        cells.append(f'<rect x="{x}" y="392" width="40" height="58" fill="{shade}"/>')
        cells.append(f'<rect x="{x}" y="392" width="40" height="10" fill="#26262f"/>')
        if i % 3 == 0:
            cells.append(f'<rect x="{x+14}" y="414" width="12" height="12" fill="{accent}" opacity="0.55"/>')
    return "".join(cells)


def motif(kind: str, accent: str) -> str:
    c = {"cx": 400, "cy": 200}
    if kind == "eye":
        return (
            f'<ellipse cx="400" cy="195" rx="120" ry="62" fill="none" stroke="{accent}" stroke-width="6"/>'
            f'<circle cx="400" cy="195" r="30" fill="{accent}"/>'
            f'<circle cx="400" cy="195" r="52" fill="none" stroke="{accent}" stroke-width="2" opacity="0.5"/>'
        )
    if kind == "swords":
        return (
            f'<rect x="360" y="90" width="14" height="200" rx="3" fill="{accent}" transform="rotate(24 367 190)"/>'
            f'<rect x="420" y="90" width="14" height="200" rx="3" fill="#d4d4d8" transform="rotate(-24 427 190)"/>'
            f'<rect x="330" y="270" width="140" height="12" rx="3" fill="#3a3a44"/>'
        )
    if kind == "rune":
        return (
            f'<circle cx="400" cy="195" r="95" fill="none" stroke="{accent}" stroke-width="5"/>'
            f'<circle cx="400" cy="195" r="70" fill="none" stroke="{accent}" stroke-width="2" opacity="0.6"/>'
            f'<rect x="388" y="130" width="24" height="130" fill="{accent}" opacity="0.85"/>'
            f'<rect x="335" y="183" width="130" height="24" fill="{accent}" opacity="0.85"/>'
        )
    if kind == "circuit":
        return (
            f'<rect x="280" y="150" width="240" height="90" fill="none" stroke="{accent}" stroke-width="5"/>'
            f'<circle cx="300" cy="195" r="14" fill="{accent}"/><circle cx="500" cy="195" r="14" fill="{accent}"/>'
            f'<rect x="340" y="120" width="10" height="150" fill="{accent}" opacity="0.7"/>'
            f'<rect x="450" y="120" width="10" height="150" fill="{accent}" opacity="0.7"/>'
        )
    if kind == "bolt":
        return f'<polygon points="420,80 340,210 390,210 370,310 470,180 415,180" fill="{accent}"/>'
    if kind == "moon":
        return (
            f'<circle cx="400" cy="190" r="70" fill="{accent}" opacity="0.9"/>'
            f'<circle cx="425" cy="170" r="60" fill="#0b0b10" opacity="0.85"/>'
        )
    if kind == "sun":
        return (
            f'<circle cx="400" cy="190" r="60" fill="{accent}"/>'
            + "".join(
                f'<rect x="{400 + int(95 * (1 if k % 2 == 0 else -1) * (k % 3 + 1) / 3)}" y="60" width="10" height="240" fill="{accent}" opacity="0.35" transform="rotate({k * 30} 400 190)"/>'
                for k in range(6)
            )
        )
    if kind == "dice":
        return (
            f'<rect x="330" y="120" width="140" height="140" rx="22" fill="{accent}"/>'
            f'<circle cx="365" cy="155" r="14" fill="#0b0b10"/><circle cx="435" cy="155" r="14" fill="#0b0b10"/>'
            f'<circle cx="400" cy="190" r="14" fill="#0b0b10"/>'
            f'<circle cx="365" cy="225" r="14" fill="#0b0b10"/><circle cx="435" cy="225" r="14" fill="#0b0b10"/>'
        )
    if kind == "ghost":
        return (
            f'<rect x="350" y="120" width="100" height="120" rx="46" fill="{accent}" opacity="0.9"/>'
            f'<circle cx="380" cy="170" r="10" fill="#0b0b10"/><circle cx="420" cy="170" r="10" fill="#0b0b10"/>'
            f'<rect x="350" y="215" width="100" height="25" fill="{accent}" opacity="0.9"/>'
        )
    if kind == "compass":
        return (
            f'<circle cx="400" cy="195" r="80" fill="none" stroke="{accent}" stroke-width="6"/>'
            f'<polygon points="400,130 418,195 400,260 382,195" fill="{accent}"/>'
        )
    if kind == "trophy":
        return (
            f'<rect x="375" y="120" width="50" height="70" fill="{accent}"/>'
            f'<rect x="365" y="190" width="70" height="14" fill="{accent}"/>'
            f'<rect x="380" y="204" width="40" height="40" fill="{accent}" opacity="0.7"/>'
            f'<rect x="360" y="244" width="80" height="12" fill="#3a3a44"/>'
        )
    if kind == "crosshair":
        return (
            f'<circle cx="400" cy="195" r="70" fill="none" stroke="{accent}" stroke-width="6"/>'
            f'<rect x="396" y="105" width="8" height="180" fill="{accent}"/>'
            f'<rect x="310" y="191" width="180" height="8" fill="{accent}"/>'
        )
    if kind == "grid":
        cells = []
        for ix in range(4):
            for iy in range(3):
                cells.append(
                    f'<rect x="{330 + ix * 38}" y="{120 + iy * 38}" width="30" height="30" rx="4" '
                    f'fill="{"%s" % accent if (ix + iy) % 3 == 0 else "#2a2a34"}"/>'
                )
        return "".join(cells)
    if kind == "sprout":
        return (
            f'<rect x="396" y="150" width="8" height="110" fill="{accent}"/>'
            f'<ellipse cx="370" cy="190" rx="34" ry="16" fill="{accent}" transform="rotate(-30 370 190)"/>'
            f'<ellipse cx="430" cy="170" rx="34" ry="16" fill="{accent}" transform="rotate(30 430 170)" opacity="0.7"/>'
        )
    if kind == "burst":
        pts = []
        for k in range(12):
            import math
            a = k * math.pi / 6
            r1 = 100 if k % 2 == 0 else 45
            pts.append(f'{400 + r1 * math.cos(a):.0f},{195 + r1 * math.sin(a):.0f}')
        return f'<polygon points="{" ".join(pts)}" fill="{accent}" opacity="0.9"/>'
    if kind == "dungeon":
        return (
            f'<rect x="340" y="140" width="120" height="130" fill="none" stroke="{accent}" stroke-width="8"/>'
            f'<rect x="375" y="190" width="50" height="80" fill="{accent}"/>'
            f'<rect x="330" y="120" width="140" height="18" fill="{accent}" opacity="0.6"/>'
        )
    if kind == "chair":
        return (
            f'<rect x="340" y="160" width="120" height="26" fill="{accent}"/>'
            f'<rect x="340" y="100" width="26" height="90" fill="{accent}" opacity="0.7"/>'
            f'<rect x="350" y="186" width="14" height="80" fill="#3a3a44"/>'
            f'<rect x="436" y="186" width="14" height="80" fill="#3a3a44"/>'
        )
    if kind == "road":
        return (
            f'<polygon points="370,270 430,270 480,392 320,392" fill="#2a2a34"/>'
            + "".join(f'<rect x="395" y="{280 + i * 24}" width="10" height="14" fill="{accent}"/>' for i in range(4))
        )
    # cave (default)
    return (
        f'<polygon points="300,270 350,150 400,220 450,130 500,270" fill="none" stroke="{accent}" stroke-width="6"/>'
        f'<circle cx="400" cy="240" r="16" fill="{accent}"/>'
    )


def cover(seed: str, accent: str, kind: str, title: str) -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
<defs>
<radialGradient id="g" cx="50%" cy="38%" r="75%">
<stop offset="0%" stop-color="{accent}" stop-opacity="0.28"/>
<stop offset="55%" stop-color="#101016" stop-opacity="1"/>
<stop offset="100%" stop-color="#08080b" stop-opacity="1"/>
</radialGradient>
<linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
<stop offset="55%" stop-color="black" stop-opacity="0"/>
<stop offset="100%" stop-color="black" stop-opacity="0.55"/>
</linearGradient>
</defs>
<rect width="800" height="450" fill="url(#g)"/>
{pixels(seed + "stars", 60, 800, 300, 3, "#ffffff", 0.25)}
{mountains(seed, 330, "#14141b", 130)}
{mountains(seed + "2", 370, "#1b1b23", 90)}
{motif(kind, accent)}
{ground(accent)}
<rect width="800" height="450" fill="url(#v)"/>
<rect x="24" y="24" width="150" height="10" fill="{accent}" opacity="0.9"/>
<rect x="24" y="40" width="90" height="6" fill="#3a3a44"/>
<text x="36" y="418" font-family="monospace" font-size="26" font-weight="bold" fill="#f0f0f3" letter-spacing="3">{title.upper()}</text>
</svg>"""


def main() -> None:
    os.makedirs(ADDON_DIR, exist_ok=True)
    os.makedirs(SHOW_DIR, exist_ok=True)
    for addon_id, (accent, kind) in ADDONS.items():
        title = addon_id.replace("-", " ")[:18]
        with open(os.path.join(ADDON_DIR, f"{addon_id}.svg"), "w", encoding="utf-8") as f:
            f.write(cover(addon_id, accent, kind, title))
    for scene, accent in SHOWCASES.items():
        with open(os.path.join(SHOW_DIR, f"{scene}.svg"), "w", encoding="utf-8") as f:
            f.write(cover(scene, accent, "cave", scene.replace("-", " ")))
    print(f"OK: {len(ADDONS)} capas + {len(SHOWCASES)} showcases")


if __name__ == "__main__":
    main()

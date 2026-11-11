"""Convert a TTF into three.js typeface JSON for a subset of characters."""
import json
import sys

from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont


class TypefacePen(BasePen):
    def __init__(self, glyph_set):
        super().__init__(glyph_set)
        self.cmds = []

    def _moveTo(self, p):
        self.cmds.append(f"m {round(p[0])} {round(p[1])}")

    def _lineTo(self, p):
        self.cmds.append(f"l {round(p[0])} {round(p[1])}")

    def _qCurveToOne(self, p1, p2):
        # typeface order: end point, then control point
        self.cmds.append(f"q {round(p2[0])} {round(p2[1])} {round(p1[0])} {round(p1[1])}")

    def _curveToOne(self, p1, p2, p3):
        self.cmds.append(
            f"b {round(p3[0])} {round(p3[1])} {round(p1[0])} {round(p1[1])} {round(p2[0])} {round(p2[1])}"
        )

    def _closePath(self):
        self.cmds.append("z")


def convert(src, dst, chars):
    font = TTFont(src)
    cmap = font.getBestCmap()
    glyph_set = font.getGlyphSet()
    hmtx = font["hmtx"]
    head = font["head"]
    hhea = font["hhea"]
    post = font["post"]
    glyphs = {}
    for ch in chars:
        name = cmap.get(ord(ch))
        if not name:
            continue
        pen = TypefacePen(glyph_set)
        glyph_set[name].draw(pen)
        advance, _ = hmtx[name]
        bounds = None
        try:
            from fontTools.pens.boundsPen import BoundsPen
            bp = BoundsPen(glyph_set)
            glyph_set[name].draw(bp)
            bounds = bp.bounds
        except Exception:
            pass
        glyphs[ch] = {
            "ha": advance,
            "x_min": round(bounds[0]) if bounds else 0,
            "x_max": round(bounds[2]) if bounds else advance,
            "o": " ".join(pen.cmds),
        }
    name_table = font["name"]
    family = name_table.getDebugName(1) or "Font"
    data = {
        "glyphs": glyphs,
        "familyName": family,
        "ascender": hhea.ascent,
        "descender": hhea.descent,
        "underlinePosition": post.underlinePosition,
        "underlineThickness": post.underlineThickness,
        "boundingBox": {"xMin": head.xMin, "yMin": head.yMin, "xMax": head.xMax, "yMax": head.yMax},
        "resolution": head.unitsPerEm,
        "original_font_information": {"license": "SIL Open Font License 1.1", "source": src.split("/")[-1]},
        "cssFontWeight": "normal",
        "cssFontStyle": "normal",
    }
    with open(dst, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(dst, len(glyphs), "glyphs")


if __name__ == "__main__":
    chars = "".join(chr(c) for c in range(32, 127)) + "→←·—★"
    convert(sys.argv[1], sys.argv[2], chars)

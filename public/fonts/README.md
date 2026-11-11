# 3D fonts

Typeface JSON for three.js `TextGeometry`, ASCII subset only.

- `archivo-condensed-black.typeface.json` — Archivo (wdth 62, wght 900), © Omnibus-Type, SIL Open Font License 1.1
- `jetbrains-mono-bold.typeface.json` — JetBrains Mono Bold, © The JetBrains Mono Project Authors, SIL Open Font License 1.1

Regenerate with `scripts/to_typeface.py <font.ttf> <out.json>` (needs `fonttools`).
Archivo is a variable font; instantiate it first:
`fonttools varLib.instancer Archivo[wdth,wght].ttf wght=900 wdth=62 -o ArchivoCondensed-Black.ttf`

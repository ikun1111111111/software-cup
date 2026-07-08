"""提取官方指南 DOCX 文本以便后续做 POI 种子。"""
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

XML_PATH = Path(r"C:\Users\11486\Desktop\ruanjianbei-main\ruanjianbei-main\backend\tmp_official_guide_unpacked\word\document.xml")
OUT_PATH = Path(r"C:\Users\11486\Desktop\ruanjianbei-main\ruanjianbei-main\backend\tmp_official_guide.txt")

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

tree = ET.parse(XML_PATH)
root = tree.getroot()

paragraphs = []
for p in root.iter(f"{{{NS['w']}}}p"):
    runs = [t.text or "" for t in p.iter(f"{{{NS['w']}}}t")]
    text = "".join(runs).strip()
    if text:
        paragraphs.append(text)

OUT_PATH.write_text("\n".join(paragraphs), encoding="utf-8")
print(f"wrote {len(paragraphs)} paragraphs, {OUT_PATH.stat().st_size} bytes")

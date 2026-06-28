"""
Normalize tat ca 13 badge ve cung kich thuoc canvas.
1. Crop sat content (alpha > 10)
2. Them padding deu 4 phia
3. Resize ve canvas chuan 600x390 (ti le ~3:2)
4. Luu lai -> tat ca badge hien thi cung kich thuoc CSS
"""
from pathlib import Path
from PIL import Image
import numpy as np

DIR = Path(r"D:\ReactJS\fco-hub\.claude\worktrees\upgrade-gauge-formula\client\public\upgrade-badges")

# Canvas chuan: ti le 3:2, du lon de giu chat luong
OUT_W, OUT_H = 600, 390
PADDING_RATIO = 0.06  # 6% moi canh

def get_content_bbox(data):
    alpha = data[:, :, 3]
    rows = np.any(alpha > 10, axis=1)
    cols = np.any(alpha > 10, axis=0)
    if not rows.any():
        return None
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    return cmin, rmin, cmax + 1, rmax + 1  # (left, top, right, bottom)

def normalize(img_path):
    img = Image.open(img_path).convert("RGBA")
    data = np.array(img)
    bbox = get_content_bbox(data)
    if bbox is None:
        print(f"  SKIP {img_path.name}: no content")
        return

    l, t, r, b = bbox
    cw, ch = r - l, b - t

    # Them padding tuong doi vao content
    pad_x = int(cw * PADDING_RATIO)
    pad_y = int(ch * PADDING_RATIO)
    pl = max(0, l - pad_x)
    pt = max(0, t - pad_y)
    pr = min(data.shape[1], r + pad_x)
    pb = min(data.shape[0], b + pad_y)

    # Crop
    cropped = img.crop((pl, pt, pr, pb))

    # Fit vao canvas chuan (letter-box / pillar-box de giu ti le)
    cropped_w, cropped_h = cropped.size
    scale = min(OUT_W / cropped_w, OUT_H / cropped_h)
    fit_w = int(cropped_w * scale)
    fit_h = int(cropped_h * scale)
    resized = cropped.resize((fit_w, fit_h), Image.LANCZOS)

    # Dan len canvas trong suot
    canvas = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    ox = (OUT_W - fit_w) // 2
    oy = (OUT_H - fit_h) // 2
    canvas.paste(resized, (ox, oy), resized)
    canvas.save(img_path)

    print(f"  OK {img_path.name}: {cw}x{ch} -> {fit_w}x{fit_h} on {OUT_W}x{OUT_H} canvas")

if __name__ == "__main__":
    files = sorted(DIR.glob("grade_*.png"), key=lambda p: int(p.stem.split("_")[1]))
    print(f"Normalizing {len(files)} badges to {OUT_W}x{OUT_H}...\n")
    for f in files:
        normalize(f)
    print("\nDone!")

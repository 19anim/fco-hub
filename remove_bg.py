"""
Xoa nen trang cua grade_*.png -> transparent PNG
Dung flood fill BFS tu 4 goc, lay mau background tu goc anh.
Nguong: khoang cach mau toi background < DIST_THRESHOLD la nen.
grade_6 va grade_7 dung nguong chat hon (bang tay).
"""
from pathlib import Path
from PIL import Image
import numpy as np
from collections import deque

BADGES_DIR = Path(r"D:\ReactJS\fco-hub\.claude\worktrees\upgrade-gauge-formula\client\public\upgrade-badges")

# Nguong khoang cach mau Euclidean toi mau background de bi coi la "nen"
# grade_6 badge mau xam sang ~210, bg ~253 -> khoang cach ~43 -> dung nguong nho hon 43
DEFAULT_DIST = 35   # cho cac badge thong thuong
TIGHT_DIST   = 28   # cho grade_6, grade_7 (badge sang mau)

TIGHT_GRADES = {6, 7}

def color_dist(p, ref):
    return float(np.sqrt(sum((int(p[i]) - int(ref[i])) ** 2 for i in range(3))))

def get_bg_color(data):
    """Lay mau background bang cach lay trung binh 4 goc."""
    corners = [data[0,0,:3], data[0,-1,:3], data[-1,0,:3], data[-1,-1,:3]]
    return np.mean(corners, axis=0)

def flood_fill_bg(data, dist_threshold):
    h, w = data.shape[:2]
    bg_color = get_bg_color(data)
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()

    # Seed tu 4 goc
    for y, x in [(0, 0), (0, w-1), (h-1, 0), (h-1, w-1)]:
        if not visited[y, x]:
            queue.append((y, x))
            visited[y, x] = True

    directions = [(-1,0),(1,0),(0,-1),(0,1)]
    while queue:
        y, x = queue.popleft()
        for dy, dx in directions:
            ny, nx = y+dy, x+dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                pixel = data[ny, nx, :3]
                if color_dist(pixel, bg_color) < dist_threshold:
                    visited[ny, nx] = True
                    queue.append((ny, nx))

    return visited

def remove_bg(img_path, grade_num):
    dist_threshold = TIGHT_DIST if grade_num in TIGHT_GRADES else DEFAULT_DIST

    img = Image.open(img_path).convert("RGBA")
    data = np.array(img)

    bg_mask = flood_fill_bg(data, dist_threshold)

    # Lam mem canh (anti-aliasing): giam alpha dan thay vi cat cung
    alpha = data[:, :, 3].copy()
    alpha[bg_mask] = 0
    data[:, :, 3] = alpha

    result = Image.fromarray(data)
    result.save(img_path)
    pct = bg_mask.sum() / (data.shape[0] * data.shape[1]) * 100
    print(f"  OK grade_{grade_num}.png: {bg_mask.sum()} px ({pct:.1f}%) transparent  [threshold={dist_threshold}]")

if __name__ == "__main__":
    files = sorted(BADGES_DIR.glob("grade_*.png"),
                   key=lambda p: int(p.stem.split("_")[1]))
    print(f"Processing {len(files)} images...\n")
    for f in files:
        grade_num = int(f.stem.split("_")[1])
        remove_bg(f, grade_num)
    print("\nDone!")

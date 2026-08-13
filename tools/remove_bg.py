#!/usr/bin/env python3
"""给 AI 生成的兵种立绘做透明底贴图（去背景）。

原理：背景梯度建模（最小二乘拟合边框像素）→ 从边缘连通域填充 → 软边缘
alpha → 贴边亮色光斑清理 → 内部孔洞填充。

用法:
  python remove_bg.py --src <立绘.png> --dst <贴图.png>
  python remove_bg.py --src-dir assets/Art/units --suffix _full --out-suffix _sprite

依赖: numpy, Pillow
"""

import argparse
import os

import numpy as np
from PIL import Image, ImageFilter


def flood_from_border(cond: np.ndarray) -> np.ndarray:
    """向量化洪水填充：从四边种子出发，沿 cond=True 的区域扩散。"""
    h, w = cond.shape
    fill = np.zeros((h, w), bool)
    fill[0, :] = cond[0, :]
    fill[h - 1, :] = cond[h - 1, :]
    fill[:, 0] |= cond[:, 0]
    fill[:, w - 1] |= cond[:, w - 1]
    while True:
        prev = fill.sum()
        grow = fill.copy()
        grow[1:, :] |= fill[:-1, :]
        grow[:-1, :] |= fill[1:, :]
        grow[:, 1:] |= fill[:, :-1]
        grow[:, :-1] |= fill[:, 1:]
        grow[1:, 1:] |= fill[:-1, :-1]
        grow[:-1, :-1] |= fill[1:, 1:]
        grow[1:, :-1] |= fill[:-1, 1:]
        grow[:-1, 1:] |= fill[1:, :-1]
        grow &= cond
        fill = grow
        if fill.sum() == prev:
            return fill


def remove_bg(path: str, dst: str, border: int = 24) -> None:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    a = np.asarray(im, dtype=np.float32)
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    bm = (xs < border) | (xs >= w - border) | (ys < border) | (ys >= h - border)
    X = np.stack([np.ones_like(xs), xs, ys, xs * xs, ys * ys, xs * ys], axis=-1)
    coef, *_ = np.linalg.lstsq(X[bm], a[bm], rcond=None)
    pred = X @ coef
    d = np.sqrt(((a - pred) ** 2).sum(axis=-1))
    lum = a.mean(axis=-1)
    sat = a.max(axis=-1) - a.min(axis=-1)

    bg = flood_from_border(d < 85)
    alpha = np.where(bg, np.clip((d - 50) / 35.0, 0, 1) * 255, 255.0).astype(np.uint8)

    # 贴边亮色低饱和光斑清理（不扩散进角色内部）
    edge_dist = np.minimum(np.minimum(xs, w - 1 - xs), np.minimum(ys, h - 1 - ys))
    glow = (lum > 140) & (sat < 150) & (edge_dist <= 90)
    alpha[glow] = 0

    out = Image.fromarray(np.dstack([a.astype(np.uint8), alpha]), "RGBA")
    al = out.split()[3].filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    arr = np.array(al, dtype=np.uint8).copy()

    # 内部孔洞填充：被角色包围的透明区恢复为不透明
    opaque = arr > 40
    bg_conn = flood_from_border(~opaque)
    arr[~opaque & ~bg_conn] = 255
    arr[arr < 8] = 0

    al = Image.fromarray(arr, "L").filter(ImageFilter.GaussianBlur(0.4))
    out.putalpha(al)
    out.save(dst)


def main() -> int:
    ap = argparse.ArgumentParser(description="AI 立绘去背景生成透明贴图")
    ap.add_argument("--src", help="输入立绘路径")
    ap.add_argument("--dst", help="输出贴图路径")
    ap.add_argument("--src-dir", help="批量模式：输入目录")
    ap.add_argument("--suffix", default="_full", help="批量模式：源文件后缀")
    ap.add_argument("--out-suffix", default="_sprite", help="批量模式：输出后缀")
    args = ap.parse_args()

    if args.src and args.dst:
        remove_bg(args.src, args.dst)
        print(f"OK: {args.dst}")
        return 0
    if args.src_dir:
        for f in sorted(os.listdir(args.src_dir)):
            if not f.endswith(args.suffix + ".png"):
                continue
            uid = f[: -len(args.suffix + ".png")]
            src = os.path.join(args.src_dir, f)
            dst = os.path.join(args.src_dir, uid + args.out_suffix + ".png")
            remove_bg(src, dst)
            print(f"OK: {dst}")
        return 0
    ap.print_help()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())

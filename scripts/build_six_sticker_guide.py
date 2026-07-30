from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output/pdf/六格观察法训练指南.pdf"
W, H = A4

INK = HexColor("#111214")
MUTED = HexColor("#6E6E73")
LIGHT = HexColor("#F5F5F7")
LINE = HexColor("#E5E5EA")
BLUE = HexColor("#007AFF")
GREEN = HexColor("#18A058")
RED = HexColor("#FF453A")
YELLOW = HexColor("#FFD60A")
ORANGE = HexColor("#FF9F0A")
WHITE = HexColor("#FFFFFF")
PURPLE = HexColor("#AF52DE")

pdfmetrics.registerFont(TTFont("CN", "/System/Library/Fonts/STHeiti Light.ttc", subfontIndex=0))
pdfmetrics.registerFont(TTFont("CNB", "/System/Library/Fonts/STHeiti Medium.ttc", subfontIndex=0))
pdfmetrics.registerFont(TTFont("AR", "/System/Library/Fonts/Supplemental/Arial.ttf"))
pdfmetrics.registerFont(TTFont("ARB", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"))


def txt(c, s, x, y, size=12, color=INK, font="CN", align="left"):
    c.setFillColor(color)
    c.setFont(font, size)
    if align == "center":
        c.drawCentredString(x, y, s)
    elif align == "right":
        c.drawRightString(x, y, s)
    else:
        c.drawString(x, y, s)


def pill(c, s, x, y, bg=LIGHT, fg=MUTED, width=None):
    width = width or pdfmetrics.stringWidth(s, "CNB", 9) + 20
    c.setFillColor(bg)
    c.roundRect(x, y, width, 22, 11, fill=1, stroke=0)
    txt(c, s, x + width / 2, y + 7, 9, fg, "CNB", "center")
    return width


def footer(c, page, section):
    c.setStrokeColor(LINE)
    c.line(42, 36, W - 42, 36)
    txt(c, section, 42, 20, 8, MUTED, "CN")
    txt(c, f"{page:02d}", W - 42, 20, 8, MUTED, "ARB", "right")


def title(c, kicker, heading, sub=None):
    txt(c, kicker.upper(), 42, H - 55, 9, BLUE, "CNB")
    txt(c, heading, 42, H - 96, 28, INK, "CNB")
    if sub:
        txt(c, sub, 42, H - 123, 11, MUTED, "CN")


def card(c, x, y, w, h, bg=WHITE, radius=16, stroke=None):
    c.setFillColor(bg)
    if stroke:
        c.setStrokeColor(stroke)
        c.roundRect(x, y, w, h, radius, fill=1, stroke=1)
    else:
        c.roundRect(x, y, w, h, radius, fill=1, stroke=0)


def sticker(c, x, y, size, color, label=None, dark=False):
    c.setFillColor(HexColor("#222326"))
    c.roundRect(x, y, size, size, size * .18, fill=1, stroke=0)
    inset = size * .07
    c.setFillColor(color)
    c.roundRect(x + inset, y + inset, size - 2 * inset, size - 2 * inset, size * .14, fill=1, stroke=0)
    if dark:
        c.setFillColor(HexColor("#000000"))
        c.setFillAlpha(.12)
        c.roundRect(x + inset, y + inset, size - 2 * inset, size - 2 * inset, size * .14, fill=1, stroke=0)
        c.setFillAlpha(1)
    if label:
        txt(c, label, x + size / 2, y + size / 2 - 4, 9, INK, "ARB", "center")


def six(c, x, y, colors, size=42, gap=5, labels=False):
    for i, color in enumerate(colors[:3]):
        sticker(c, x + i * (size + gap), y + size + gap, size, color, f"F{i+1}" if labels else None)
    for i, color in enumerate(colors[3:]):
        sticker(c, x + i * (size + gap), y, size, color, f"R{i+1}" if labels else None)
    txt(c, "FRONT", x, y + 2 * size + gap + 8, 7, MUTED, "ARB")
    txt(c, "RIGHT", x, y - 13, 7, MUTED, "ARB")


def wrap(c, text, x, y, max_chars=24, leading=18, size=11, color=MUTED, font="CN"):
    lines = []
    line = ""
    for ch in text:
        if ch == "\n":
            lines.append(line)
            line = ""
        elif len(line) >= max_chars:
            lines.append(line)
            line = ch
        else:
            line += ch
    if line:
        lines.append(line)
    for i, line in enumerate(lines):
        txt(c, line, x, y - i * leading, size, color, font)
    return y - len(lines) * leading


def cube_icon(c, x, y, s=150):
    top = [(x, y+s*.72), (x+s*.5, y+s), (x+s, y+s*.72), (x+s*.5, y+s*.44)]
    left = [(x, y+s*.72), (x+s*.5, y+s*.44), (x+s*.5, y), (x, y+s*.28)]
    right = [(x+s*.5, y+s*.44), (x+s, y+s*.72), (x+s, y+s*.28), (x+s*.5, y)]
    for poly, color in [(top, YELLOW), (left, GREEN), (right, ORANGE)]:
        c.setFillColor(color)
        c.setStrokeColor(WHITE)
        c.setLineWidth(4)
        p = c.beginPath()
        p.moveTo(*poly[0])
        for pt in poly[1:]:
            p.lineTo(*pt)
        p.close()
        c.drawPath(p, fill=1, stroke=1)
    c.setStrokeColor(HexColor("#FFFFFF"))
    c.setLineWidth(2)
    for t in (1/3, 2/3):
        c.line(x+s*.5*t, y+s*.72+s*.28*t, x+s*.5+s*.5*t, y+s*.44+s*.28*t)
        c.line(x+s*.5*t, y+s*.72-s*.44*t, x+s*.5*t, y+s*.28-s*.28*t)
        c.line(x+s*.5+s*.5*t, y+s*.44+s*.28*t, x+s*.5+s*.5*t, y+s*.0+s*.28*t)


def make_pdf():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=A4, pageCompression=1)
    c.setTitle("六格观察法训练指南")
    c.setAuthor("六格观察法训练")

    # 01 Cover
    c.setFillColor(LIGHT)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    pill(c, "21 PLL · TWO-SIDED RECOGNITION", 42, H - 72, WHITE, BLUE, 190)
    txt(c, "六格观察法", 42, H - 150, 42, INK, "CNB")
    txt(c, "训练指南", 42, H - 202, 42, INK, "CNB")
    wrap(c, "只看前、右两个侧面的 6 枚顶层贴纸，\n快速识别 21 种 PLL。", 44, H - 250, 28, 20, 13, MUTED)
    card(c, 42, 120, W - 84, 305, WHITE, 28)
    cube_icon(c, 205, 200, 190)
    six(c, 70, 152, [GREEN, RED, GREEN, ORANGE, ORANGE, BLUE], 34, 4)
    txt(c, "更少视线移动", 420, 174, 11, INK, "CNB", "center")
    txt(c, "更快模式匹配", 420, 153, 9, MUTED, "CN", "center")
    txt(c, "2026 · 精简版", 42, 62, 9, MUTED, "CN")
    c.showPage()

    # 02 Definition
    c.setFillColor(WHITE); c.rect(0, 0, W, H, fill=1, stroke=0)
    title(c, "01 · 核心概念", "六格，不是六种颜色", "OLL 已完成时，顶面信息固定；真正有区分度的是侧面顶层。")
    card(c, 42, 495, W - 84, 190, LIGHT, 22)
    six(c, 73, 535, [GREEN, RED, GREEN, ORANGE, ORANGE, BLUE], 48, 7, True)
    txt(c, "观察窗口", 365, 635, 10, BLUE, "CNB")
    txt(c, "F1 · F2 · F3", 365, 600, 20, INK, "ARB")
    txt(c, "+", 365, 568, 17, MUTED, "ARB")
    txt(c, "R1 · R2 · R3", 365, 535, 20, INK, "ARB")
    txt(c, "只读两个面的顶层横排", 365, 510, 10, MUTED, "CN")
    steps = [
        ("1", "找成对", "先找同色角块、1×2 小条、完整 1×3 条。"),
        ("2", "看结构", "判断图形是否对称、是否有“车灯”、条块朝哪边。"),
        ("3", "定方向", "最后用左右关系区分 a / b 与镜像情况。"),
    ]
    y = 404
    for n, h, body in steps:
        c.setFillColor(INK); c.circle(59, y+8, 16, fill=1, stroke=0)
        txt(c, n, 59, y+4, 10, WHITE, "ARB", "center")
        txt(c, h, 91, y+5, 15, INK, "CNB")
        txt(c, body, 176, y+5, 10, MUTED, "CN")
        y -= 72
    card(c, 42, 92, W - 84, 68, HexColor("#EEF6FF"), 14)
    txt(c, "原则", 60, 127, 9, BLUE, "CNB")
    txt(c, "先认“图形”，再认“颜色”。不要背某个绝对色块的位置。", 105, 123, 12, INK, "CNB")
    footer(c, 2, "六格观察法 · 核心概念")
    c.showPage()

    # 03 Vocabulary
    c.setFillColor(WHITE); c.rect(0, 0, W, H, fill=1, stroke=0)
    title(c, "02 · 视觉词典", "先学会看见这些形状", "把六格压缩成少数几个稳定特征。")
    samples = [
        ("车灯 Headlights", "同一侧两个角同色", [RED, GREEN, RED, ORANGE, BLUE, GREEN], RED),
        ("1×2 小条 Bar", "相邻两格同色", [GREEN, GREEN, RED, ORANGE, BLUE, RED], GREEN),
        ("1×3 完整条", "一个侧面三格同色", [BLUE, BLUE, BLUE, RED, GREEN, ORANGE], BLUE),
        ("交错 / 散点", "没有连续同色块", [RED, GREEN, ORANGE, BLUE, RED, GREEN], ORANGE),
    ]
    positions = [(42, 470), (307, 470), (42, 226), (307, 226)]
    for (name, desc, colors, accent), (x, y) in zip(samples, positions):
        card(c, x, y, 246, 202, LIGHT, 18)
        c.setFillColor(accent); c.roundRect(x, y+190, 246, 12, 6, fill=1, stroke=0)
        txt(c, name, x+18, y+160, 14, INK, "CNB")
        txt(c, desc, x+18, y+137, 9, MUTED, "CN")
        six(c, x+38, y+43, colors, 42, 4)
    card(c, 42, 92, W-84, 82, HexColor("#FFF8E5"), 16)
    txt(c, "快速扫描顺序", 60, 142, 10, ORANGE, "CNB")
    txt(c, "车灯  →  长条  →  小条  →  剩余散点", 60, 115, 16, INK, "CNB")
    footer(c, 3, "六格观察法 · 视觉词典")
    c.showPage()

    # 04 Decision
    c.setFillColor(WHITE); c.rect(0, 0, W, H, fill=1, stroke=0)
    title(c, "03 · 判断路径", "三问，把 21 种压缩成小组", "不要一次搜索 21 个答案。先把候选范围缩小。")
    nodes = [
        (42, 590, W-84, 80, "01", "六格里有车灯吗？", "有：优先检查 A / E / G / J / R / T；没有：看长条与对称。", BLUE),
        (42, 440, W-84, 80, "02", "有完整 1×3 或明显 1×2 吗？", "长条强：优先 U / J / T / F；条块少：检查 N / V / Y。", GREEN),
        (42, 290, W-84, 80, "03", "图形对称，还是有方向？", "对称：H / Z / E / N；有方向：用左右关系区分 a / b。", PURPLE),
    ]
    for x, y, w, h, n, q, a, color in nodes:
        card(c, x, y, w, h, LIGHT, 18)
        c.setFillColor(color); c.circle(x+34, y+h/2, 18, fill=1, stroke=0)
        txt(c, n, x+34, y+h/2-4, 9, WHITE, "ARB", "center")
        txt(c, q, x+68, y+47, 14, INK, "CNB")
        txt(c, a, x+68, y+23, 9, MUTED, "CN")
    c.setStrokeColor(LINE); c.setLineWidth(3)
    c.line(W/2, 590, W/2, 520); c.line(W/2, 440, W/2, 370)
    c.setFillColor(LINE)
    c.circle(W/2, 520, 5, fill=1, stroke=0); c.circle(W/2, 370, 5, fill=1, stroke=0)
    card(c, 42, 110, W-84, 104, INK, 18)
    txt(c, "终点不是“我见过”", 62, 170, 16, WHITE, "CNB")
    txt(c, "而是：我能说出它和最像的另一个 PLL 到底差在哪一格。", 62, 138, 11, HexColor("#D1D1D6"), "CN")
    footer(c, 4, "六格观察法 · 判断路径")
    c.showPage()

    # 05 Similar cases
    c.setFillColor(WHITE); c.rect(0, 0, W, H, fill=1, stroke=0)
    title(c, "04 · 易混组", "把相近答案放在一起练", "错误不是失败，它告诉你应该建立哪一条对比规则。")
    groups = [
        ("Aa · Ab · V", "先找车灯，再看邻面条块朝向；a / b 互为方向镜像。"),
        ("T · Jb · F", "都有强条块感。T 的结构最规整；Jb 有明显整条；F 更错位。"),
        ("Ga · Gb · Gc · Gd", "先固定车灯所在侧，再看旁边 1×2 条在左还是右。"),
        ("Ua · Ub · H · Z", "先看是否对称。H / Z 无方向；Ua / Ub 有循环方向。"),
        ("Na · Nb · Y", "条块少、交换跨度大；用角块关系与镜像方向作最后确认。"),
    ]
    colors = [BLUE, GREEN, ORANGE, PURPLE, RED]
    y = 626
    for i, ((name, body), color) in enumerate(zip(groups, colors), 1):
        card(c, 42, y-72, W-84, 88, LIGHT, 16)
        c.setFillColor(color); c.roundRect(42, y-72, 7, 88, 4, fill=1, stroke=0)
        txt(c, f"{i:02d}", 64, y-26, 9, color, "ARB")
        txt(c, name, 101, y-25, 15, INK, "ARB")
        txt(c, body, 101, y-51, 9, MUTED, "CN")
        y -= 106
    footer(c, 5, "六格观察法 · 易混组")
    c.showPage()

    # 06 AUF
    c.setFillColor(WHITE); c.rect(0, 0, W, H, fill=1, stroke=0)
    title(c, "05 · 四方向 AUF", "同一个 PLL，要认出四张脸", "U / U′ / U2 改变的是观察窗口，不是 PLL 身份。")
    auf = [("None", "正面窗口"), ("U", "顺时针一格"), ("U2", "旋转半圈"), ("U′", "逆时针一格")]
    xs = [42, 174, 306, 438]
    for idx, ((name, note), x) in enumerate(zip(auf, xs)):
        card(c, x, 470, 116, 180, LIGHT, 18)
        txt(c, name, x+58, 610, 18, INK, "ARB", "center")
        cols = [GREEN, RED, GREEN, ORANGE, ORANGE, BLUE]
        cols = cols[idx:] + cols[:idx]
        six(c, x+14, 505, cols, 27, 3)
        txt(c, note, x+58, 486, 8, MUTED, "CN", "center")
    card(c, 42, 286, W-84, 124, HexColor("#EEF6FF"), 20)
    txt(c, "练法", 62, 372, 10, BLUE, "CNB")
    txt(c, "每次看见答案后，主动说出另外三个方向的特征。", 62, 340, 17, INK, "CNB")
    txt(c, "例如：当前面有车灯；U 后车灯转到右面；U2 后两面只剩条块关系……", 62, 309, 10, MUTED, "CN")
    card(c, 42, 116, W-84, 120, INK, 20)
    txt(c, "不要用“黄色上、绿色前”记答案", 62, 190, 15, WHITE, "CNB")
    txt(c, "随机改变顶面与前面颜色，强迫大脑识别相对结构。", 62, 158, 11, HexColor("#D1D1D6"), "CN")
    footer(c, 6, "六格观察法 · 四方向 AUF")
    c.showPage()

    # 07 21 reference
    c.setFillColor(WHITE); c.rect(0, 0, W, H, fill=1, stroke=0)
    title(c, "06 · 21 PLL 地图", "按结构分组，而不是按字母背", "这张表用于复盘；实战仍以六格特征为准。")
    rows = [
        ("角块主导", "Aa · Ab · E", "车灯、对角与镜像方向"),
        ("边块主导", "Ua · Ub · H · Z", "整条、循环方向与对称"),
        ("J / T / F", "Ja · Jb · T · F", "强条块结构，比较错位位置"),
        ("G 家族", "Ga · Gb · Gc · Gd", "车灯 + 相邻小条的方向"),
        ("R 家族", "Ra · Rb", "条块与角块方向互为镜像"),
        ("N 家族", "Na · Nb", "远距离交换，整体稀疏、镜像"),
        ("特殊形", "V · Y", "角块关系突出，避免只看一条"),
    ]
    y = 634
    for i, (family, cases, clue) in enumerate(rows):
        bg = LIGHT if i % 2 == 0 else WHITE
        card(c, 42, y-55, W-84, 62, bg, 10)
        txt(c, family, 58, y-23, 11, INK, "CNB")
        txt(c, cases, 158, y-23, 11, BLUE, "ARB")
        txt(c, clue, 355, y-23, 9, MUTED, "CN")
        y -= 70
    card(c, 42, 91, W-84, 50, HexColor("#F3ECFF"), 14)
    txt(c, "21 = 3 + 4 + 4 + 4 + 2 + 2 + 2", W/2, 110, 13, PURPLE, "ARB", "center")
    footer(c, 7, "六格观察法 · 21 PLL 地图")
    c.showPage()

    # 08 Training plan
    c.setFillColor(WHITE); c.rect(0, 0, W, H, fill=1, stroke=0)
    title(c, "07 · 训练方案", "10 分钟，练对一件事", "先稳定正确率，再压缩识别时间。")
    plan = [
        ("2 min", "热身", "不计时，只说出“车灯 / 条块 / 方向”。"),
        ("4 min", "对比组", "只练一组易混 PLL，答后读观察复盘。"),
        ("3 min", "全量计时", "21 种混合；目标正确率 ≥ 90%。"),
        ("1 min", "错误回放", "把错误写成一句可执行的对比规则。"),
    ]
    y = 635
    for i, (duration, name, body) in enumerate(plan):
        c.setStrokeColor(LINE); c.setLineWidth(2)
        if i < 3: c.line(68, y-55, 68, y-105)
        c.setFillColor(BLUE if i < 3 else GREEN); c.circle(68, y-26, 15, fill=1, stroke=0)
        txt(c, str(i+1), 68, y-30, 9, WHITE, "ARB", "center")
        pill(c, duration, 101, y-39, LIGHT, BLUE, 58)
        txt(c, name, 178, y-28, 15, INK, "CNB")
        txt(c, body, 178, y-52, 9, MUTED, "CN")
        y -= 112
    card(c, 42, 120, W-84, 100, INK, 18)
    txt(c, "训练器快捷键", 62, 182, 9, HexColor("#8E8E93"), "CNB")
    pill(c, "1", 62, 141, HexColor("#2C2C2E"), WHITE, 28)
    txt(c, "到", 96, 149, 9, HexColor("#D1D1D6"), "CN")
    pill(c, "4", 117, 141, HexColor("#2C2C2E"), WHITE, 28)
    txt(c, "选择答案", 156, 149, 11, WHITE, "CNB")
    pill(c, "SPACE", 330, 141, HexColor("#2C2C2E"), WHITE, 62)
    txt(c, "下一题", 406, 149, 11, WHITE, "CNB")
    txt(c, "看得少一点，认得快一点。", W/2, 72, 15, INK, "CNB", "center")
    footer(c, 8, "六格观察法 · 训练方案")
    c.save()
    print(OUT)


if __name__ == "__main__":
    make_pdf()

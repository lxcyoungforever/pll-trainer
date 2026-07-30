"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Face = "U" | "D" | "F" | "B" | "R" | "L";
type Scheme = Record<Face, string>;
type PLL = {
  name: string;
  alg: string;
  hint: string;
  family: string;
  similar: string[];
  observations: string[];
};

const COLORS: Record<string, { label: string; hex: string; ink: string }> = {
  white: { label: "白色", hex: "#f4f2e8", ink: "#111" },
  yellow: { label: "黄色", hex: "#ffd500", ink: "#111" },
  green: { label: "绿色", hex: "#16a364", ink: "#fff" },
  blue: { label: "蓝色", hex: "#3478f6", ink: "#fff" },
  red: { label: "红色", hex: "#ef4444", ink: "#fff" },
  orange: { label: "橙色", hex: "#ff7a1a", ink: "#111" },
};

const OPPOSITE: Record<string, string> = {
  white: "yellow", yellow: "white", green: "blue",
  blue: "green", red: "orange", orange: "red",
};

const SIDE_RING = ["red", "green", "orange", "blue"];

type CubeOrientation = Record<Face, string>;
const START_ORIENTATION: CubeOrientation = {
  U: "white", D: "yellow", F: "green", B: "blue", R: "red", L: "orange",
};

function rotateOrientation(s: CubeOrientation, move: "x" | "y" | "z"): CubeOrientation {
  if (move === "x") return { U: s.F, F: s.D, D: s.B, B: s.U, R: s.R, L: s.L };
  if (move === "y") return { U: s.U, D: s.D, F: s.L, R: s.F, B: s.R, L: s.B };
  return { U: s.L, R: s.U, D: s.R, L: s.D, F: s.F, B: s.B };
}

function invertRotation(alg: string) {
  return alg.split(" ").filter(Boolean).reverse().map((move) => `${move}'`).join(" ");
}

const ORIENTATIONS = (() => {
  const found = new Map<string, { alg: string; inverse: string }>();
  const seen = new Set<string>();
  const queue: Array<{ state: CubeOrientation; moves: string[] }> = [{ state: START_ORIENTATION, moves: [] }];
  while (queue.length) {
    const current = queue.shift()!;
    const stateKey = (["U", "D", "F", "B", "R", "L"] as Face[]).map((face) => current.state[face]).join(":");
    if (seen.has(stateKey)) continue;
    seen.add(stateKey);
    const alg = current.moves.join(" ");
    found.set(`${current.state.U}:${current.state.F}`, { alg, inverse: invertRotation(alg) });
    for (const move of ["x", "y", "z"] as const) {
      queue.push({ state: rotateOrientation(current.state, move), moves: [...current.moves, move] });
    }
  }
  return found;
})();

/** 根据 U/F 两个相邻中心块，推导标准配色的六个面。 */
export function getCubeScheme(u: string, f: string): Scheme | null {
  if (u === f || OPPOSITE[u] === f) return null;
  const base = SIDE_RING.includes(u) ? SIDE_RING : ["white", ...SIDE_RING, "yellow"];
  const vectors: Record<string, [number, number, number]> = {
    white: [0, 1, 0], yellow: [0, -1, 0],
    green: [0, 0, 1], blue: [0, 0, -1],
    red: [-1, 0, 0], orange: [1, 0, 0],
  };
  const U = vectors[u], F = vectors[f];
  const cross = (a: number[], b: number[]) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const right = cross(U, F);
  const keyFor = (v: number[]) =>
    Object.keys(vectors).find((k) => vectors[k].every((n, i) => n === v[i]))!;
  return {
    U: u, D: OPPOSITE[u], F: f, B: OPPOSITE[f],
    R: keyFor(right), L: OPPOSITE[keyFor(right)],
  };
}

const SIMILAR: Record<string, string[]> = {
  Aa: ["Ab", "V", "F"], Ab: ["Aa", "V", "F"],
  E: ["Na", "Nb", "V"], F: ["T", "Jb", "Aa"], Ga: ["Gb", "Gc", "Gd"], Gb: ["Ga", "Gd", "Gc"],
  Gc: ["Gd", "Ga", "Gb"], Gd: ["Gc", "Gb", "Ga"], H: ["Z", "E", "Na"], Ja: ["Jb", "T", "Ra"],
  Jb: ["Ja", "T", "Rb"], Na: ["Nb", "V", "Y"], Nb: ["Na", "V", "Y"], Ra: ["Rb", "Ja", "Ga"],
  Rb: ["Ra", "Jb", "Gb"], T: ["Jb", "F", "Y"], V: ["Y", "Aa", "Ab"], Y: ["V", "T", "Na"],
  Ua: ["Ub", "Z", "H"], Ub: ["Ua", "Z", "H"], Z: ["H", "Ua", "Ub"],
};

const OBSERVATIONS: Record<string, [string, string, string, string]> = {
  Aa: ["正面无车灯；右面可见同色角块。先找右侧的角块色条。", "正面出现车灯；右面三格不同色。车灯在左手侧时判 Aa。", "正面同色角块；右面无车灯，与 Ab 的镜像方向相反。", "正面三格不同色；右面出现车灯。车灯在右手侧时仍为 Aa。"],
  Ab: ["正面无车灯；右面出现车灯，方向与 Aa 镜像。", "正面同色角块；右面三格不同色。注意角循环方向。", "正面出现车灯；右面无车灯，车灯落在左侧观察面。", "正面三格不同色；右面同色角块。与 Aa 对照判断。"],
  E: ["前、右两面都没有车灯或完整 1×3 色条。", "两面角块均不成对；重点确认四角同时错位。", "仍无车灯，正反观察完全对称。", "两面均为散色；排除只有一组角交换的 A/V。"],
  F: ["正面有 1×2 小色条；右面角块形成车灯线索。", "正面车灯；右面出现偏置 1×2 色条。", "正面小色条与首方向相对；右面无完整色条。", "正面散色；右面同时看到色条和相邻角块。"],
  Ga: ["左侧车灯配右面短色条；先锁定车灯方向。", "正面短色条在左；右面三色交错。", "车灯移到右侧面；正面只剩偏置色块。", "正面三色交错；右面短色条靠右。"],
  Gb: ["右侧车灯配左面短色条，是 Ga 的镜像。", "正面三色交错；右面短色条在左。", "车灯移到左侧面；正面只剩偏置色块。", "正面短色条靠右；右面三色交错。"],
  Gc: ["正面短色条靠左；右面能读到背侧车灯的延伸。", "正面无车灯；右面偏置色条靠右。", "正面车灯出现；右面短色条方向与 Ga 不同。", "正面偏置色条；右面无车灯，整体与 Gd 镜像。"],
  Gd: ["正面短色条靠右；右面线索与 Gc 镜像。", "正面偏置色条靠左；右面无车灯。", "正面车灯出现；右面短色条方向与 Gb 不同。", "正面无车灯；右面偏置色条靠左。"],
  H: ["两面都呈中心对称：中间贴纸与两角颜色成对。", "旋转后结构不变；没有车灯，只有对称边交换。", "前后完全对称，是 H 最强线索。", "四个方向观察一致；若见相邻色条则排除 Z。"],
  Ja: ["正面完整或近完整色条；左侧能找到车灯。", "正面车灯；右面是一组连续 1×2 色条。", "正面散色；右面完整色条落在相对侧。", "正面 1×2 色条；右面车灯，方向与 Jb 镜像。"],
  Jb: ["正面完整或近完整色条；右侧能找到车灯。", "正面 1×2 色条；右面车灯，方向与 Ja 镜像。", "正面散色；右面完整色条落在相对侧。", "正面车灯；右面是一组连续 1×2 色条。"],
  Na: ["两面各有斜向 1×2 关系，像两块沿对角互换。", "正面色条偏左；右面色条偏右。", "对角关系保持；没有单独车灯。", "正面色条偏右；右面色条偏左，与 Nb 镜像。"],
  Nb: ["两组反向对角 1×2 关系，与 Na 镜像。", "正面色条偏右；右面色条偏左。", "对角关系保持；角边成对方向与 Na 相反。", "正面色条偏左；右面色条偏右。"],
  Ra: ["左侧车灯，右侧只有一个突出的同色块。", "正面偏置色块；右面可见短色条。", "车灯转到右侧；突出块方向与 Rb 相反。", "正面短色条；右面偏置色块靠左。"],
  Rb: ["右侧车灯，左侧只有一个突出的同色块。", "正面短色条；右面偏置色块靠右。", "车灯转到左侧；突出块方向与 Ra 相反。", "正面偏置色块；右面可见反向短色条。"],
  T: ["一面车灯，邻面可见规整 1×2 色条。", "正面短色条；右面三格关系高度对称。", "正面出现完整色条；右面无车灯。", "正面无车灯；右面短色条指向车灯所在侧。"],
  V: ["一面有车灯；邻面两角呈对角色，不形成连续色条。", "正面散色；右面有一组偏置角块。", "车灯出现在相对侧；两边块仍呈对角关系。", "正面偏置角块；右面散色。用对角线索排除 A。"],
  Y: ["一面有车灯；邻面边块呈对角交换线索。", "正面 1×2 关系不连续；右面为散色。", "车灯移到相对侧；仍能看到对角边交换。", "正面散色；右面断开的 1×2 关系。用边块排除 V。"],
  Ua: ["三面已有完整色条；剩余一面的边块向顺时针方向循环。", "从箭头方向看，边块循环为左移；角块全部归位。", "完整色条换到对面；只观察边块即可排除 A/V。", "边块循环方向与 Ub 相反；确认没有角块交换。"],
  Ub: ["三面已有完整色条；剩余一面的边块向逆时针方向循环。", "从箭头方向看，边块循环为右移；角块全部归位。", "完整色条换到对面；只观察边块即可排除 A/V。", "边块循环方向与 Ua 相反；确认没有角块交换。"],
  Z: ["前、右两面各有相邻 1×2 色条，方向互相垂直。", "旋转后仍能同时看到两组相邻边交换。", "正面色条换到另一侧；结构不像 H 那样中心对称。", "右面色条换向；两面始终各保留一组相邻色。"],
};

export const PLLS: PLL[] = [
  ["Aa", "x R' U R' D2 R U' R' D2 R2 x'", "左侧车灯 · 三角循环", "Corners"],
  ["Ab", "x R2 D2 R U R' D2 R U' R x'", "右侧车灯 · 三角循环", "Corners"],
  ["E", "x' R U' R' D R U R' D' R U R' D R U' R' D' x", "四角对换 · 四面无完整色块", "Corners"],
  ["F", "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R", "前侧 1×2 色条 · 邻面车灯", "Mixed"],
  ["Ga", "R2 U R' U R' U' R U' R2 D U' R' U R D'", "左车灯 + 右侧 1×2 色条", "Mixed"],
  ["Gb", "R' U' R U D' R2 U R' U R U' R U' R2 D", "右车灯 + 左侧 1×2 色条", "Mixed"],
  ["Gc", "R2 U' R U' R U R' U R2 D' U R U' R' D", "左侧色条 · 后侧车灯", "Mixed"],
  ["Gd", "R U R' U' D R2 U' R U' R' U R' U R2 D'", "右侧色条 · 后侧车灯", "Mixed"],
  ["H", "M2 U M2 U2 M2 U M2", "四边对换 · 四面都是对称色条", "Edges"],
  ["Ja", "x R2 F R F' R U2 r' U r U2 x'", "左侧车灯 + 前侧色条", "Mixed"],
  ["Jb", "R U R' F' R U R' U' R' F R2 U' R' U'", "右侧车灯 + 前侧色条", "Mixed"],
  ["Na", "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'", "两组对角 1×2 色条", "Mixed"],
  ["Nb", "R' U R U' R' F' U' F R U R' F R' F' R U' R", "两组反向对角 1×2 色条", "Mixed"],
  ["Ra", "R U' R' U' R U R D R' U' R D' R' U2 R'", "左车灯 · 右侧块突出", "Mixed"],
  ["Rb", "R' U2 R U2 R' F R U R' U' R' F' R2", "右车灯 · 左侧块突出", "Mixed"],
  ["T", "R U R' U' R' F R2 U' R' U' R U R' F'", "一组车灯 + 对面完整色条", "Mixed"],
  ["Ua", "M2 U M U2 M' U M2", "三边循环 · 顺时针方向", "Edges"],
  ["Ub", "M2 U' M U2 M' U' M2", "三边循环 · 逆时针方向", "Edges"],
  ["V", "R' U R' U' R D' R' D R' U D' R2 U' R2 D R2", "一侧车灯 · 对角两色块", "Mixed"],
  ["Y", "F R U' R' U' R U R' F' R U R' U' R' F R F'", "一组车灯 · 对角边块交换", "Mixed"],
  ["Z", "M2 U M2 U M' U2 M2 U2 M' U2", "相邻两组边交换 · 两面同色条", "Edges"],
].map(([name, alg, hint, family]) => ({
  name, alg, hint, family, similar: SIMILAR[name] ?? [], observations: OBSERVATIONS[name],
}));

const AUFS = ["None", "U", "U′", "U2"];
const VIEW_LABELS = ["正面", "右转 90°", "背面", "左转 90°"];

function randomItem<T>(items: T[]) { return items[Math.floor(Math.random() * items.length)]; }

function exportTrainingSet() {
  const headers = ["PLL", "分类", "核心特征", "相近题型", "无 AUF", "U", "U′", "U2", "标准公式"];
  const escapeCell = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = PLLS.map((pll) => [
    pll.name,
    pll.family,
    pll.hint,
    pll.similar.join(" / "),
    ...pll.observations,
    pll.alg,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "PLL训练合集.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function makeQuestion(previous?: string) {
  const pool = PLLS.filter((p) => p.name !== previous);
  const pll = randomItem(pool);
  const preferred = pll.similar
    .map((name) => PLLS.find((p) => p.name === name))
    .filter((p): p is PLL => Boolean(p));
  const fallback = PLLS.filter((p) => p.name !== pll.name && !preferred.includes(p))
    .sort(() => Math.random() - .5);
  const others = [...preferred.sort(() => Math.random() - .5), ...fallback].slice(0, 3);
  return {
    pll,
    auf: randomItem(AUFS),
    view: Math.floor(Math.random() * 4),
    options: [pll, ...others].sort(() => Math.random() - .5),
    id: Date.now() + Math.random(),
  };
}

const INITIAL_QUESTION = {
  pll: PLLS[0],
  auf: "None",
  view: 0,
  options: [PLLS[0], PLLS[1], PLLS[18], PLLS[5]],
  id: 0,
};

function InteractiveCube({ pll, auf, view, topColor, frontColor, dragEnabled }: {
  pll: PLL; auf: string; view: number; topColor: string; frontColor: string; dragEnabled: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    let player: HTMLElement | null = null;
    const orientation = ORIENTATIONS.get(`${topColor}:${frontColor}`)!;
    const aufMove = auf === "None" ? "" : auf.replace("′", "'");
    Promise.all([import("cubing/twisty"), import("cubing/alg")]).then(([{ TwistyPlayer }, { Alg }]) => {
      if (disposed || !hostRef.current) return;
      const caseAlg = new Alg(pll.alg).invert().toString();
      const setupAlg = orientation.alg;
      const orientedCaseAlg = `${caseAlg} ${aufMove}`.trim();
      const twisty = new TwistyPlayer({
        puzzle: "3x3x3",
        alg: orientedCaseAlg,
        experimentalSetupAlg: setupAlg,
        background: "none",
        controlPanel: "none",
        hintFacelets: "none",
        experimentalDragInput: dragEnabled ? "auto" : "none",
        cameraLatitude: 24,
        cameraLongitude: -32 + view * 90,
        cameraDistance: 5.8,
      });
      player = twisty;
      twisty.className = "twisty-cube";
      twisty.setAttribute("aria-label", `${pll.name} PLL 可旋转三维魔方`);
      hostRef.current.replaceChildren(twisty);
      twisty.jumpToEnd();
    });
    return () => {
      disposed = true;
      player?.remove();
    };
  }, [auf, dragEnabled, frontColor, pll.alg, pll.name, topColor, view]);

  return (
    <div className="cube-stage">
      <div ref={hostRef} className={`twisty-host ${dragEnabled ? "" : "is-locked"}`} />
      <div className={`drag-tip ${dragEnabled ? "" : "locked"}`}>
        <span>{dragEnabled ? "↔" : "●"}</span>
        {dragEnabled ? "拖动魔方查看其他面" : "高级模式 · 视角已锁定"}
      </div>
    </div>
  );
}

export default function Home() {
  const [topColor, setTopColor] = useState("yellow");
  const [frontColor, setFrontColor] = useState("green");
  const [dragEnabled, setDragEnabled] = useState(true);
  const [question, setQuestion] = useState(INITIAL_QUESTION);
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [selected, setSelected] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [stats, setStats] = useState({ total: 0, correct: 0 });
  const startedAt = useRef(0);

  const next = useCallback(() => {
    setQuestion((q) => makeQuestion(q.pll.name));
    setStatus("idle"); setSelected(null); setElapsed(0);
    startedAt.current = performance.now();
  }, []);

  useEffect(() => {
    startedAt.current = performance.now();
    const tick = window.setInterval(() => {
      if (status === "idle") setElapsed(performance.now() - startedAt.current);
    }, 16);
    return () => window.clearInterval(tick);
  }, [question.id, status]);

  useEffect(() => {
    setQuestion(makeQuestion());
  }, []);

  const answer = useCallback((name: string) => {
    if (status !== "idle") return;
    const time = performance.now() - startedAt.current;
    const correct = name === question.pll.name;
    setElapsed(time); setSelected(name); setStatus(correct ? "correct" : "wrong");
    setStats((s) => ({
      total: s.total + 1, correct: s.correct + (correct ? 1 : 0),
    }));
  }, [next, question.pll.name, status]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["1", "2", "3", "4"].includes(e.key)) answer(question.options[Number(e.key) - 1].name);
      if ((e.key === " " || e.code === "Space") && status !== "idle") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, next, question.options, status]);

  const validFrontColors = useMemo(
    () => Object.keys(COLORS).filter((color) => color !== topColor && color !== OPPOSITE[topColor]),
    [topColor],
  );
  useEffect(() => {
    if (!validFrontColors.includes(frontColor)) setFrontColor(validFrontColors[0]);
  }, [frontColor, validFrontColors]);

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><i /><i /><i /><i /></span>
          <span><b>PLL 训练</b></span>
        </div>
        <div className="header-actions">
          <a className="guide-download" href="/six-sticker-pll-guide.pdf" download>
            六格观察指南 <span>PDF</span><b>↓</b>
          </a>
          <button className="export-button" onClick={exportTrainingSet}>
            导出训练合集 <span>CSV</span><b>↓</b>
          </button>
        </div>
        <div className="stats">
          <div><span>题目</span><b>{String(stats.total).padStart(2, "0")}</b></div>
          <div><span>正确率</span><b>{stats.total ? Math.round(stats.correct / stats.total * 100) : 0}<em>%</em></b></div>
        </div>
      </header>

      <section className="workspace">
        <div className="controls">
          <div className="mode-control">
            <span>观察模式</span>
            <div className="mode-switch" role="group" aria-label="魔方观察模式">
              <button className={dragEnabled ? "active" : ""} onClick={() => setDragEnabled(true)}>
                初级<small>可拖动</small>
              </button>
              <button className={!dragEnabled ? "active" : ""} onClick={() => setDragEnabled(false)}>
                高级<small>锁定</small>
              </button>
            </div>
          </div>
          <span className="control-line" />
          <label>顶面颜色
            <select value={topColor} onChange={(e) => setTopColor(e.target.value)}>
              {Object.entries(COLORS).map(([key, color]) => <option key={key} value={key}>{color.label}</option>)}
            </select>
          </label>
          <span className="control-line" />
          <label>前面颜色
            <select value={frontColor} onChange={(e) => setFrontColor(e.target.value)}>
              {validFrontColors.map((key) => <option key={key} value={key}>{COLORS[key].label}</option>)}
            </select>
          </label>
        </div>

        <div className="quiz-area">
          <div className="eyebrow"><span>观察角度</span> {VIEW_LABELS[question.view]} · <span>PRE-AUF</span> {question.auf}</div>
          <InteractiveCube pll={question.pll} auf={question.auf} view={question.view} topColor={topColor} frontColor={frontColor} dragEnabled={dragEnabled} />
          <div className={`timer ${status}`}><span>{(elapsed / 1000).toFixed(2)}</span><small>秒</small></div>
          <p className="instruction">只观察顶层的两个侧面，判断这是哪一种 PLL</p>
        </div>

        <div className="answer-panel">
          <div className="answer-heading"><span>你的答案</span><small>按 1–4 快速作答</small></div>
          <div className="answers">
            {question.options.map((option, i) => {
              const isCorrect = option.name === question.pll.name;
              const state = status !== "idle" && isCorrect ? "is-correct"
                : status === "wrong" && selected === option.name ? "is-wrong" : "";
              return (
                <button key={option.name} className={state} onClick={() => answer(option.name)}>
                  <kbd>{i + 1}</kbd><strong>{option.name}</strong><span>PLL</span>
                  <i>{state === "is-correct" ? "✓" : state === "is-wrong" ? "×" : "→"}</i>
                </button>
              );
            })}
          </div>
          {status === "correct" && <div className="success-toast">识别正确 · {(elapsed / 1000).toFixed(2)}s <span>按空格进入下一题</span></div>}
        </div>
        {status !== "idle" && (
          <section className="observation-guide">
            <div className="guide-heading">
              <div><span>{status === "correct" ? "识别正确 · 观察复盘" : "识别错误 · 观察复盘"}</span><h2>{question.pll.name} PLL · 四方向观察方法</h2><p>{question.pll.hint}</p></div>
              <button onClick={next}>下一题 <kbd>Space</kbd></button>
            </div>
            <div className="auf-grid">
              {AUFS.map((auf, i) => (
                <article key={auf} className={auf === question.auf ? "current-auf" : ""}>
                  <div><b>{auf === "None" ? "无 AUF" : auf}</b>{auf === question.auf && <em>本题方向</em>}</div>
                  <p>{question.pll.observations[i]}</p>
                </article>
              ))}
            </div>
            <div className="compare-tip"><b>排除干扰项：</b>本题优先与 {question.pll.similar.join("、")} 对照；先找车灯，再看 1×2 色条的位置和朝向。</div>
          </section>
        )}
      </section>
      <footer><span>21 种 PLL 全量训练</span><i /> <span>键盘快捷键已开启</span><b>专注观察 · 建立肌肉记忆</b></footer>
    </main>
  );
}

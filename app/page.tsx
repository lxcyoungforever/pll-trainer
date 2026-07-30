"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Face = "U" | "D" | "F" | "B" | "R" | "L";
type Scheme = Record<Face, string>;
type PLL = {
  name: string;
  hint: string;
  family: string;
  // Twelve top-layer positions viewed clockwise: 4 corners + 8 edge stickers.
  signature: number[];
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

const sig = (seed: number, family: string) =>
  Array.from({ length: 12 }, (_, i) =>
    family === "Edges" ? (i % 3 === 1 ? (i + seed) % 4 : Math.floor(i / 3) % 4)
    : family === "Corners" ? (i % 3 === 0 ? (i / 3 + seed) % 4 : Math.floor(i / 3) % 4)
    : (i * (seed % 3 + 1) + seed + Math.floor(i / 3)) % 4
  );

export const PLLS: PLL[] = [
  ["Aa", "左侧车灯 · 右前角逆时针循环", "Corners"], ["Ab", "右侧车灯 · 左前角顺时针循环", "Corners"],
  ["Ad", "对角块循环 · 左侧同色块", "Corners"], ["Ae", "对角块循环 · 右侧同色块", "Corners"],
  ["Ea", "四角对换 · 四面无完整色块", "Corners"], ["F", "前侧 1×2 色条 · 邻面车灯", "Mixed"],
  ["Ga", "左车灯 + 右侧 1×2 色条", "Mixed"], ["Gb", "右车灯 + 左侧 1×2 色条", "Mixed"],
  ["Gc", "左侧色条 · 后侧车灯", "Mixed"], ["Gd", "右侧色条 · 后侧车灯", "Mixed"],
  ["H", "四边对换 · 四面都是对称色条", "Edges"], ["Ja", "左侧车灯 + 前侧色条", "Mixed"],
  ["Jb", "右侧车灯 + 前侧色条", "Mixed"], ["Na", "两组对角 1×2 色条", "Mixed"],
  ["Nb", "两组反向对角 1×2 色条", "Mixed"], ["Ra", "左车灯 · 右侧块突出", "Mixed"],
  ["Rb", "右车灯 · 左侧块突出", "Mixed"], ["T", "一组车灯 + 对面完整色条", "Mixed"],
  ["V", "一侧车灯 · 对角两色块", "Mixed"], ["Y", "一组车灯 · 对角边块交换", "Mixed"],
  ["Z", "相邻两组边交换 · 两面同色条", "Edges"],
].map(([name, hint, family], index) => ({
  name, hint, family, signature: sig(index + 1, family),
}));

const AUFS = ["None", "U", "U′", "U2"];
const VIEW_LABELS = ["正面", "右转 90°", "背面", "左转 90°"];

function randomItem<T>(items: T[]) { return items[Math.floor(Math.random() * items.length)]; }

function makeQuestion(previous?: string) {
  const pool = PLLS.filter((p) => p.name !== previous);
  const pll = randomItem(pool);
  const others = PLLS.filter((p) => p.name !== pll.name)
    .sort(() => Math.random() - .5).slice(0, 3);
  return {
    pll,
    auf: randomItem(AUFS),
    view: Math.floor(Math.random() * 4),
    options: [pll, ...others].sort(() => Math.random() - .5),
    id: Date.now() + Math.random(),
  };
}

function Sticker({ color }: { color: string }) {
  return <span className="sticker" style={{ background: color }} />;
}

function CubeFace({ className, colors }: { className: string; colors: string[] }) {
  return (
    <div className={`cube-face ${className}`}>
      {colors.map((color, i) => <Sticker key={i} color={color} />)}
    </div>
  );
}

function Cube({ scheme, pll, auf, view }: { scheme: Scheme; pll: PLL; auf: string; view: number }) {
  const shift = ({ None: 0, U: 3, "U′": 9, U2: 6 } as Record<string, number>)[auf];
  const rotated = Array.from({ length: 12 }, (_, i) => pll.signature[(i + shift + view * 3) % 12]);
  const sides = [scheme.F, scheme.R, scheme.B, scheme.L].map((face) => COLORS[face].hex);
  const top = COLORS[scheme.U].hex;
  const frontTop = rotated.slice(0, 3).map((n) => sides[n]);
  const rightTop = rotated.slice(3, 6).map((n) => sides[n]);
  const face = (topRow: string[], base: string) => [...topRow, ...Array(6).fill(base)];
  return (
    <div className="cube-stage" aria-label={`${pll.name} PLL 魔方状态`}>
      <div className="cube-shadow" />
      <div className="cube">
        <CubeFace className="face-top" colors={Array(9).fill(top)} />
        <CubeFace className="face-front" colors={face(frontTop, COLORS[scheme.F].hex)} />
        <CubeFace className="face-right" colors={face(rightTop, COLORS[scheme.R].hex)} />
      </div>
    </div>
  );
}

export default function Home() {
  const [u, setU] = useState("yellow");
  const [f, setF] = useState("green");
  const [question, setQuestion] = useState(() => makeQuestion());
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [selected, setSelected] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [stats, setStats] = useState({ total: 0, correct: 0, times: [] as number[] });
  const startedAt = useRef(0);
  const nextTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheme = getCubeScheme(u, f)!;

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

  const answer = useCallback((name: string) => {
    if (status !== "idle") return;
    const time = performance.now() - startedAt.current;
    const correct = name === question.pll.name;
    setElapsed(time); setSelected(name); setStatus(correct ? "correct" : "wrong");
    setStats((s) => ({
      total: s.total + 1, correct: s.correct + (correct ? 1 : 0),
      times: correct ? [...s.times, time] : s.times,
    }));
    if (correct) nextTimer.current = setTimeout(next, 500);
  }, [next, question.pll.name, status]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["1", "2", "3", "4"].includes(e.key)) answer(question.options[Number(e.key) - 1].name);
      if (e.key === "Enter" && status === "wrong") next();
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); if (nextTimer.current) clearTimeout(nextTimer.current); };
  }, [answer, next, question.options, status]);

  const avg = stats.times.length ? stats.times.reduce((a, b) => a + b, 0) / stats.times.length : 0;
  const validFronts = useMemo(() => Object.keys(COLORS).filter((c) => c !== u && c !== OPPOSITE[u]), [u]);
  useEffect(() => { if (!validFronts.includes(f)) setF(validFronts[0]); }, [f, validFronts]);

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><i /><i /><i /><i /></span>
          <span>PLL <b>双面观察</b></span>
          <small>训练模式</small>
        </div>
        <div className="stats">
          <div><span>题目</span><b>{String(stats.total).padStart(2, "0")}</b></div>
          <div><span>正确率</span><b>{stats.total ? Math.round(stats.correct / stats.total * 100) : 0}<em>%</em></b></div>
          <div><span>平均用时</span><b>{(avg / 1000).toFixed(2)}<em>s</em></b></div>
        </div>
      </header>

      <section className="workspace">
        <div className="controls">
          <label>顶面 U
            <select value={u} onChange={(e) => setU(e.target.value)}>
              {Object.entries(COLORS).map(([key, v]) => <option key={key} value={key}>{v.label}</option>)}
            </select>
          </label>
          <span className="control-line" />
          <label>前面 F
            <select value={f} onChange={(e) => setF(e.target.value)}>
              {validFronts.map((key) => <option key={key} value={key}>{COLORS[key].label}</option>)}
            </select>
          </label>
          <div className="legend"><span /> 前两层已复原</div>
        </div>

        <div className="quiz-area">
          <div className="eyebrow"><span>观察角度</span> {VIEW_LABELS[question.view]} · <span>PRE-AUF</span> {question.auf}</div>
          <Cube scheme={scheme} pll={question.pll} auf={question.auf} view={question.view} />
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
          {status === "wrong" && (
            <div className="feedback">
              <div><span>特征提示</span><strong>{question.pll.hint}</strong></div>
              <button onClick={next}>下一题 <kbd>Enter</kbd></button>
            </div>
          )}
          {status === "correct" && <div className="success-toast">识别正确 · {(elapsed / 1000).toFixed(2)}s</div>}
        </div>
      </section>
      <footer><span>21 种 PLL 全量训练</span><i /> <span>键盘快捷键已开启</span><b>专注观察 · 建立肌肉记忆</b></footer>
    </main>
  );
}

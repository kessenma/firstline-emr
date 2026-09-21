"use client";

import React, { useRef, useEffect, useCallback } from "react";

/**
 * Generative Branching Tree canvas animation.
 * Renders an organic, painterly tree that grows, holds, fades, and regenerates.
 */
export function GenerativeTree() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runningRef = useRef(true);
  const stateRef = useRef<ReturnType<typeof initState> | null>(null);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = initState(canvas, ctx);
    stateRef.current = state;
    state.resize();
    state.createTree();
    runningRef.current = true;

    const onFrame = (time: number) => {
      if (!runningRef.current) return;
      state.frame(time);
      requestAnimationFrame(onFrame);
    };
    requestAnimationFrame(onFrame);
  }, []);

  useEffect(() => {
    init();

    const onVisibility = () => {
      if (document.hidden) {
        runningRef.current = false;
      } else if (!runningRef.current) {
        runningRef.current = true;
        const state = stateRef.current;
        if (state) {
          const onFrame = (time: number) => {
            if (!runningRef.current) return;
            state.frame(time);
            requestAnimationFrame(onFrame);
          };
          requestAnimationFrame(onFrame);
        }
      }
    };

    const onResize = () => stateRef.current?.resize();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);

    return () => {
      runningRef.current = false;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, [init]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ display: "block" }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  All mutable state + logic lives in a plain object (no React state) */
/* ------------------------------------------------------------------ */

interface Branch {
  x0: number;
  y0: number;
  angle: number;
  length: number;
  thickness: number;
  depth: number;
  growthProgress: number;
  growthSpeed: number;
  children: Branch[];
  spawned: boolean;
  swayPhase: number;
  swayAmp: number;
  curvature: number;
  colorShift: number;
  hueShift: number;
  parent: Branch | null;
  strokeSeeds: number[];
  tipDots: { ox: number; oy: number; size: number; alpha: number }[];
}

function initState(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  // --- Utilities ---
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const rand = (lo: number, hi: number) => Math.random() * (hi - lo) + lo;
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  // --- Configuration ---
  let MAX_DEPTH = 10;
  let GROWTH_SPEED_BASE = 0.006;

  // --- Mutable state ---
  let W = 0,
    H = 0;
  let allBranches: Branch[] = [];
  let treeAlpha = 1;
  let treeState: "growing" | "done" = "growing";

  // --- Color palette (navy trunk → teal tips, matching brand) ---
  // navy-950 → navy-700 → blue-500 → teal-500 → teal-400 → teal-300
  const PALETTE = [
    { r: 34, g: 42, b: 73 },    // navy-950 #222a49
    { r: 42, g: 56, b: 103 },   // navy-900 #2a3867
    { r: 61, g: 89, b: 127 },   // navy-700 → blue blend
    { r: 53, g: 157, b: 152 },  // teal-500 #359d98
    { r: 77, g: 180, b: 173 },  // teal-400 #4db4ad
    { r: 121, g: 207, b: 199 }, // teal-300 #79cfc7
  ];

  function colorForDepth(depth: number, hueShift: number) {
    const t = depth / MAX_DEPTH;
    const idx = t * (PALETTE.length - 1);
    const i0 = Math.floor(idx);
    const i1 = Math.min(PALETTE.length - 1, i0 + 1);
    const f = idx - i0;
    let r = lerp(PALETTE[i0].r, PALETTE[i1].r, f);
    let g = lerp(PALETTE[i0].g, PALETTE[i1].g, f);
    let b = lerp(PALETTE[i0].b, PALETTE[i1].b, f);

    if (hueShift !== undefined) {
      const strength = t * t * 18;
      // Shift towards blue (negative) or greener teal (positive)
      r += hueShift * strength * -0.3;
      g += hueShift * strength * 0.5;
      b += hueShift * strength * 0.8;
    }

    return { r, g, b };
  }

  // --- Branch logic ---
  function getSwayAngle(branch: Branch, time: number) {
    let total = 0;
    let b: Branch | null = branch;
    let depth = 0;
    while (b) {
      const a = b.swayAmp;
      total += Math.sin(time * 0.0005 + b.swayPhase) * a;
      total += Math.sin(time * 0.0003 + b.swayPhase * 1.7) * a * 0.6;
      total += Math.sin(time * 0.00012 + b.swayPhase * 0.4) * a * 0.35;
      depth++;
      b = b.parent;
    }
    return total;
  }

  function getBranchEnd(branch: Branch, progress: number, time: number) {
    const sway = getSwayAngle(branch, time);
    const angle = branch.angle + sway;
    const len = branch.length * progress;
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);
    const curveOff = branch.curvature * len;
    return {
      x: branch.x0 + Math.cos(angle) * len + perpX * curveOff,
      y: branch.y0 + Math.sin(angle) * len + perpY * curveOff,
    };
  }

  function spawnChildren(parent: Branch) {
    if (parent.depth >= MAX_DEPTH) return;

    let numChildren: number;
    if (parent.depth < 1) numChildren = 2 + (Math.random() < 0.35 ? 1 : 0);
    else if (parent.depth < 3)
      numChildren = 2 + (Math.random() < 0.4 ? 1 : 0);
    else numChildren = Math.random() < 0.25 ? 3 : 2;

    const pruneChance =
      parent.depth <= 3
        ? 0
        : parent.depth <= 5
          ? 0.1
          : parent.depth <= 7
            ? 0.22
            : 0.35;
    if (Math.random() < pruneChance)
      numChildren = Math.max(1, numChildren - 1);

    const spread =
      parent.depth < 2 ? rand(0.32, 0.48) : rand(0.38, 0.6);

    for (let i = 0; i < numChildren; i++) {
      let angleOffset: number;
      if (numChildren === 1) {
        angleOffset = rand(-0.25, 0.25);
      } else if (numChildren === 2) {
        angleOffset = (i === 0 ? -1 : 1) * rand(0.18, spread);
      } else {
        angleOffset = (i - 1) * spread + rand(-0.1, 0.1);
      }

      const childAngle = parent.angle + angleOffset;
      const lengthFactor = rand(0.58, 0.76);
      const thickFactor = rand(0.48, 0.67);
      const ep = getBranchEnd(parent, 1, 0);

      const tipDots: Branch["tipDots"] = [];
      const childDepth = parent.depth + 1;
      if (childDepth >= MAX_DEPTH) {
        const count = Math.random() < 0.4 ? 2 : 1;
        for (let d = 0; d < count; d++) {
          tipDots.push({
            ox: rand(-2, 2),
            oy: rand(-2, 2),
            size: rand(0.8, 1.6),
            alpha: rand(0.08, 0.2),
          });
        }
      }

      const child: Branch = {
        x0: ep.x,
        y0: ep.y,
        angle: childAngle,
        length: parent.length * lengthFactor,
        thickness: Math.max(1.5, parent.thickness * thickFactor),
        depth: childDepth,
        growthProgress: 0,
        growthSpeed:
          GROWTH_SPEED_BASE * rand(1.0, 1.5) * (1 + parent.depth * 0.1),
        children: [],
        spawned: false,
        swayPhase: rand(0, Math.PI * 2),
        swayAmp: 0.0018 * (parent.depth + 1) * rand(0.7, 1.3),
        curvature: rand(-0.04, 0.04) * (1 + parent.depth * 0.12),
        colorShift: rand(-12, 12),
        hueShift: Math.max(
          -1,
          Math.min(1, parent.hueShift + rand(-0.35, 0.35))
        ),
        parent,
        strokeSeeds: [
          rand(-1, 1),
          rand(-1, 1),
          rand(-1, 1),
          rand(-1, 1),
          rand(-1, 1),
        ],
        tipDots,
      };

      parent.children.push(child);
      allBranches.push(child);
    }
  }

  function recalcPositions(time: number) {
    for (const b of allBranches) {
      if (b.parent) {
        const pe = getBranchEnd(b.parent, 1, time);
        b.x0 = pe.x;
        b.y0 = pe.y;
      }
    }
  }

  function updateBranches() {
    let allDone = true;
    for (const b of allBranches) {
      if (b.growthProgress < 1) {
        b.growthProgress = Math.min(1, b.growthProgress + b.growthSpeed);
        allDone = false;
      }
      if (b.growthProgress >= 0.65 && !b.spawned) {
        b.spawned = true;
        spawnChildren(b);
      }
    }
    return allDone;
  }

  // --- Drawing ---
  function drawBranch(b: Branch, time: number) {
    if (b.growthProgress <= 0) return;

    const sway = getSwayAngle(b, time);
    const angle = b.angle + sway;
    const progress = easeOutCubic(b.growthProgress);
    const len = b.length * progress;

    const x1 = b.x0;
    const y1 = b.y0;
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);

    const curveOff = b.curvature * len * 1.4;
    const cpx1 = x1 + Math.cos(angle) * len * 0.33 + perpX * curveOff * 0.4;
    const cpy1 = y1 + Math.sin(angle) * len * 0.33 + perpY * curveOff * 0.4;
    const cpx2 = x1 + Math.cos(angle) * len * 0.66 + perpX * curveOff * 0.85;
    const cpy2 = y1 + Math.sin(angle) * len * 0.66 + perpY * curveOff * 0.85;
    const x2 = x1 + Math.cos(angle) * len + perpX * curveOff * 0.7;
    const y2 = y1 + Math.sin(angle) * len + perpY * curveOff * 0.7;

    const col = colorForDepth(b.depth, b.hueShift);
    const thickBase = b.thickness;
    const thick = lerp(thickBase, thickBase * 0.3, progress);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, x2, y2);
    ctx.strokeStyle = `rgb(${col.r | 0}, ${col.g | 0}, ${col.b | 0})`;
    ctx.lineWidth = thick;
    ctx.lineCap = "round";
    ctx.stroke();

  }

  function drawScene(time: number) {
    ctx.clearRect(0, 0, W, H);

    // Transparent — no background fill, page background shows through

    recalcPositions(time);

    ctx.save();
    ctx.globalAlpha = treeAlpha;
    for (const b of allBranches) {
      drawBranch(b, time);
    }
    ctx.restore();
  }

  // --- Public state object ---
  const state = {
    W,
    H,

    resize() {
      const dpr = window.devicePixelRatio || 1;
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state.W = W;
      state.H = H;
    },

    createTree() {
      allBranches = [];
      const trunkLen = H * rand(0.23, 0.28);
      const trunkThick = Math.max(8, W * 0.015);
      const trunkAngle = -Math.PI / 2 + rand(-0.05, 0.05);
      const baseY = H + trunkThick * 0.5;

      allBranches.push({
        x0: W / 2 + rand(-W * 0.03, W * 0.03),
        y0: baseY,
        angle: trunkAngle,
        length: trunkLen,
        thickness: trunkThick,
        depth: 0,
        growthProgress: 0,
        growthSpeed: GROWTH_SPEED_BASE * rand(0.9, 1.1),
        children: [],
        spawned: false,
        swayPhase: rand(0, Math.PI * 2),
        swayAmp: 0.0008,
        curvature: rand(-0.015, 0.015),
        colorShift: rand(-8, 8),
        hueShift: 0,
        parent: null,
        strokeSeeds: [
          rand(-1, 1),
          rand(-1, 1),
          rand(-1, 1),
          rand(-1, 1),
          rand(-1, 1),
        ],
        tipDots: [],
      });

      treeState = "growing";
      treeAlpha = 1;
    },

    frame(time: number) {
      if (treeState === "growing") {
        const done = updateBranches();
        drawScene(time);
        if (done) {
          treeState = "done";
        }
      } else {
        // "done" — just keep swaying
        drawScene(time);
      }
    },
  };

  return state;
}

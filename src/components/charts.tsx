"use client";

import { useState } from "react";

export interface Series {
  name: string;
  values: number[];
  color: string;
  width?: number;
}

/** Line chart in the reference style: dashed grid, soft lines, pill tooltip on the active point. */
export function LineChart({
  labels,
  series,
  format,
  height = 220,
  initialIndex,
}: {
  labels: string[];
  series: Series[];
  format: (n: number) => string;
  height?: number;
  initialIndex?: number;
}) {
  const [active, setActive] = useState<number | null>(initialIndex ?? null);
  const W = 520;
  const H = height;
  const padL = 58;
  const padR = 14;
  const padT = 34;
  const padB = 30;
  const n = labels.length;
  const max = Math.max(1, ...series.flatMap((s) => s.values)) * 1.08;
  const x = (i: number) => padL + (n <= 1 ? 0 : (i * (W - padL - padR)) / (n - 1));
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const ticks = [0, 1 / 3, 2 / 3, 1].map((f) => max * f);
  const idx = active ?? n - 1;
  const showEvery = Math.ceil(n / 7);

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none"
        onPointerMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - padL) / (W - padL - padR)) * (n - 1));
          setActive(Math.max(0, Math.min(n - 1, i)));
        }}
        onPointerLeave={() => setActive(initialIndex ?? null)}
        role="img"
        aria-label={series.map((s) => s.name).join(" vs ")}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#d9d9de" strokeDasharray="3 4" />
            <text x={padL - 10} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#8a8a94">
              {format(t)}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % showEvery === 0 || i === n - 1 ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10.5" fill={i === idx ? "#0b0b12" : "#8a8a94"} fontWeight={i === idx ? 600 : 400}>
              {l}
            </text>
          ) : null,
        )}
        {n > 0 && <line x1={x(idx)} x2={x(idx)} y1={padT - 6} y2={H - padB} stroke="var(--blue)" strokeDasharray="3 3" strokeWidth={1.2} />}
        {series.map((s) => (
          <polyline
            key={s.name}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width ?? 2}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
          />
        ))}
        {series.map((s) =>
          s.values[idx] !== undefined ? <circle key={s.name} cx={x(idx)} cy={y(s.values[idx])} r={4.5} fill="white" stroke={s.color} strokeWidth={2} /> : null,
        )}
      </svg>
      {n > 0 && series[0] && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded-full bg-blue px-3 py-1 text-[12px] font-medium text-white"
          style={{ left: `${(x(idx) / W) * 100}%`, top: 0 }}
        >
          {format(series[0].values[idx] ?? 0)}
        </div>
      )}
      <div className="mt-1 flex flex-wrap gap-4 px-1 text-[12px] text-muted">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span className="h-[3px] w-4 rounded-full" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Horizontal comparison bars: estimated vs actual (+ committed) per cost head. */
export function CompareBars({
  rows,
  format,
}: {
  rows: { label: string; estimated: number; actual: number; committed: number; expected: number }[];
  format: (n: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.estimated, r.actual + r.committed)));
  return (
    <div className="space-y-4">
      {rows.map((r) => {
        const over = r.actual > r.expected * 1.05 && r.expected > 0;
        return (
          <div key={r.label}>
            <div className="mb-1.5 flex items-baseline justify-between text-[14px]">
              <span className="font-medium">{r.label}</span>
              <span className="tnum text-muted">
                <span className={over ? "font-semibold text-red" : "font-semibold text-ink"}>{format(r.actual)}</span> / {format(r.estimated)}
              </span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#eef0f4]">
              <div className="absolute inset-y-0 left-0 rounded-full bg-blue-soft" style={{ width: `${(r.estimated / max) * 100}%` }} />
              <div className={`absolute inset-y-0 left-0 rounded-full ${over ? "bg-red" : "bg-blue"}`} style={{ width: `${(r.actual / max) * 100}%` }} />
              <div
                className="absolute inset-y-0 rounded-full bg-[repeating-linear-gradient(45deg,#1515d6_0,#1515d6_2px,transparent_2px,transparent_5px)] opacity-50"
                style={{ left: `${(r.actual / max) * 100}%`, width: `${(r.committed / max) * 100}%` }}
              />
              <div className="absolute inset-y-[-2px] w-[2px] bg-ink" style={{ left: `${(r.expected / max) * 100}%` }} title="Expected at current progress" />
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-4 pt-1 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-blue" />Actual</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-blue/40" />Committed</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-blue-soft" />Estimated</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-[2px] bg-ink" />Expected at progress</span>
      </div>
    </div>
  );
}

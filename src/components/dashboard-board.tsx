"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { tooltipStyle } from "@/components/chart-theme";

export type DashPoint = {
  label: string;
  year: number;
  month: number;
  leads: number | null;
  spend: number | null;
  appointments: number | null;
  cpl: number | null;
};

export type DashTile = {
  label: string;
  value: string;
  change: string | null;
  tone: "up" | "down" | "flat";
  series: Array<number | null>;
  color: string;
};

const RANGES = [
  { id: "1M", months: 1 },
  { id: "3M", months: 3 },
  { id: "6M", months: 6 },
  { id: "YTD", months: 0 },
  { id: "1Y", months: 12 },
  { id: "All", months: 99 },
] as const;

export function DashboardBoard({
  tiles,
  series,
  bars,
}: {
  tiles: DashTile[];
  series: DashPoint[];
  bars: { label: string; value: number; color: string }[];
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("6M");
  const shown = useMemo(() => filterRange(series, range), [series, range]);
  const chartData = shown.filter((point) => point.leads != null);
  const maxBar = Math.max(...bars.map((bar) => bar.value), 1);

  return (
    <>
      <div className="tile-row">
        {tiles.map((tile) => (
          <article key={tile.label} className="card kpi-tile">
            <header>
              <span>{tile.label}</span>
              {tile.change ? <span className={`delta ${tile.tone}`}>{tile.change}</span> : <span className="delta flat">No prior</span>}
            </header>
            <b>{tile.value}</b>
            <Sparkline values={tile.series} color={tile.color} />
          </article>
        ))}
      </div>
      <div className="split">
        <section className="card">
          <header className="page-header">
            <h2>Lead trend</h2>
            <div className="range-tabs" role="tablist" aria-label="Lead trend range">
              {RANGES.map((item) => (
                <button key={item.id} type="button" className={range === item.id ? "on" : undefined} onClick={() => setRange(item.id)}>
                  {item.id}
                </button>
              ))}
            </div>
          </header>
          {chartData.length === 0 ? (
            <p className="muted">No lead totals in this range. Months without an entered number are left off the line.</p>
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="leadFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff5d8f" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#ff5d8f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#9aa0b4", fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#9aa0b4", fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="leads" stroke="#ff5d8f" fill="url(#leadFill)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <section className="card">
          <h2>Leads by market</h2>
          {bars.length === 0 ? (
            <p className="muted">No market lead totals for this month.</p>
          ) : (
            <div className="stack">
              {bars.map((bar) => (
                <div key={bar.label} className="bar-row">
                  <span>{bar.label}</span>
                  <div className="bar-track">
                    <span style={{ width: `${(bar.value / maxBar) * 100}%`, background: bar.color }} />
                  </div>
                  <b>{bar.value}</b>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export function DonutCard({ slices }: { slices: { name: string; value: number; color: string }[] }) {
  return (
    <section className="card">
      <h2>This month</h2>
      {slices.length === 0 ? (
        <p className="muted">No lead split yet.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8, alignItems: "center" }}>
          <div style={{ width: 140, height: 140 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={slices} dataKey="value" nameKey="name" innerRadius={42} outerRadius={62} stroke="none">
                  {slices.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="stack" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {slices.map((slice) => (
              <li key={slice.name} className="muted">
                <span style={{ color: slice.color }}>●</span> {slice.name} · {slice.value}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Sparkline({ values, color }: { values: Array<number | null>; color: string }) {
  const points = values.filter((value): value is number => value != null);
  if (points.length < 2) return <p className="muted">No trend</p>;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const width = 120;
  const height = 36;
  const coords = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((value - min) / (max - min || 1)) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline fill="none" stroke={color} strokeWidth="2" points={coords} />
    </svg>
  );
}

function filterRange(series: DashPoint[], range: (typeof RANGES)[number]["id"]) {
  if (range === "All") return series;
  if (range === "YTD") {
    const latest = series.at(-1);
    return latest ? series.filter((point) => point.year === latest.year) : series;
  }
  const months = RANGES.find((item) => item.id === range)?.months ?? series.length;
  return series.slice(-months);
}

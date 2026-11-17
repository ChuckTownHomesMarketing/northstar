"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { axisTick, gridStroke, tooltipStyle } from "@/components/chart-theme";

export function KpiCharts({
  data,
}: {
  data: { market: string; leads: number | null; cpl: number | null }[];
}) {
  const leads = data.filter((row) => row.leads != null);
  const cpls = data.filter((row) => row.cpl != null);
  if (leads.length === 0 && cpls.length === 0) return null;
  return (
    <div className="split">
      {leads.length > 0 ? (
        <section className="card">
          <h2>Leads by market</h2>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={leads}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="market" tick={axisTick} />
                <YAxis allowDecimals={false} tick={axisTick} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="leads" fill="#a78bfa" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}
      {cpls.length > 0 ? (
        <section className="card">
          <h2>Cost per lead</h2>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={cpls}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="market" tick={axisTick} />
                <YAxis tick={axisTick} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`$${Number(value).toFixed(2)}`, "CPL"]} />
                <Bar dataKey="cpl" fill="#f3c2a4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}
    </div>
  );
}

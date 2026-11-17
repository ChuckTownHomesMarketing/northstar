"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { axisTick, gridStroke, tooltipStyle } from "@/components/chart-theme";

export function LeadCharts({ data }: { data: { source: string; leads: number; cpl: number | null }[] }) {
  if (data.length === 0) return null;
  return (
    <section className="card">
      <h2>Volume by source</h2>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid stroke={gridStroke} vertical={false} />
            <XAxis dataKey="source" tick={axisTick} />
            <YAxis allowDecimals={false} tick={axisTick} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="leads" fill="#5eead4" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function LeadCharts({ data }: { data: { source: string; leads: number; cpl: number | null }[] }) {
  if (data.length === 0) return null;
  return (
    <section className="card">
      <h2>Volume by source</h2>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid stroke="#efe7d8" vertical={false} />
            <XAxis dataKey="source" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="leads" fill="#0f6e6b" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

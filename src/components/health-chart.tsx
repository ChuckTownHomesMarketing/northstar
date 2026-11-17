"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import type { DimensionScore } from "@/lib/health";

const COLORS = ["#2ee6a6", "#4c8dff", "#8b7cf7", "#ff5d8f", "#1ec8c8", "#f3c2a4"];

export function HealthChart({ dimensions, overall }: { dimensions: DimensionScore[]; overall: number | null }) {
  const scored = dimensions.filter((dimension) => dimension.status === "scored" && dimension.score != null);
  const angle = overall == null ? 0 : (overall / 10) * 360;
  return (
    <div className="health">
      <div>
        <div
          className="gauge"
          style={{
            background: `conic-gradient(#2ee6a6 0deg, #4c8dff ${angle * 0.45}deg, #8b7cf7 ${angle * 0.75}deg, #ff5d8f ${angle}deg, rgba(255,255,255,0.08) ${angle}deg)`,
          }}
          aria-label={overall == null ? "Marketing health has no score yet" : `Marketing health ${overall.toFixed(1)} out of 10`}
        >
          <div className="gauge-core">
            <b>{overall == null ? "—" : overall.toFixed(1)}</b>
            <span>Health</span>
          </div>
        </div>
      </div>
      <div>
        {scored.length >= 3 ? (
          <div className="radar-wrap">
            <ResponsiveContainer>
              <RadarChart data={scored.map((dimension) => ({ dimension: dimension.label, score: dimension.score }))}>
                <PolarGrid stroke="rgba(255,255,255,0.16)" />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: "#c8c4d8", fontSize: 11 }} />
                <Radar dataKey="score" stroke="#8b7cf7" fill="#4c8dff" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="muted">The radar appears once at least three dimensions have real numbers.</p>
        )}
        <div className="health-bars">
          {dimensions.map((dimension, index) => (
            <div key={dimension.key} className="health-bar">
              <span>{dimension.label}</span>
              <div className="health-track">
                {dimension.score != null ? (
                  <span style={{ width: `${dimension.score * 10}%`, background: COLORS[index % COLORS.length] }} />
                ) : null}
              </div>
              <strong>{dimension.status === "no-data" ? "No data" : dimension.score?.toFixed(1)}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

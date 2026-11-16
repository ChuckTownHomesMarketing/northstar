import { formatPercent } from "@/lib/money";
import { monthOverMonth, momTone, type MomChange, type Polarity } from "@/lib/metrics";

export function StarMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path fill="currentColor" d="M16 2.4 19.4 12.1h10.2L21.4 18.2l3.3 9.8L16 22.2 7.3 28l3.3-9.8L2.4 12.1h10.2Z" />
    </svg>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="card empty">
      <h2>{title}</h2>
      <p className="muted">{body}</p>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  wide,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "field wide" : "field"}>
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function Mom({
  current,
  previous,
  polarity,
  absoluteText,
}: {
  current: number | null;
  previous: number | null;
  polarity: Polarity;
  absoluteText?: string;
}) {
  const change: MomChange = monthOverMonth(current, previous);
  if (change.absolute == null) return <span className="muted">—</span>;
  const tone = momTone(change.percent, polarity);
  const text = change.percent != null ? formatPercent(change.percent) : absoluteText || "—";
  return <span className={`pill ${tone}`}>{text}</span>;
}

export function marketLabel(market: { name: string; state: string }) {
  return `${market.name}, ${market.state}`;
}

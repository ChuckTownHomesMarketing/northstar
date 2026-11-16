"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Notice } from "@/components/forms";
import { StarMark } from "@/components/ui";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/kpis", label: "KPIs" },
  { href: "/spend", label: "Spend" },
  { href: "/calendar", label: "Calendar" },
  { href: "/reports", label: "Weekly report" },
  { href: "/tasks", label: "Tasks" },
  { href: "/settings", label: "Settings" },
];

export function Shell({
  user,
  demo,
  embed,
  signOutAction,
  children,
}: {
  user: { name: string; email: string; role: "ADMIN" | "VA" };
  demo: boolean;
  embed: boolean;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className={embed ? "shell embed" : "shell"}>
      <aside className={open ? "sidebar open no-print" : "sidebar no-print"}>
        <Link href="/" className="brand">
          <span className="brand-mark">
            <StarMark />
          </span>
          <span className="brand-copy">
            <strong>Northstar</strong>
            <p>ChuckTown Homes</p>
          </span>
        </Link>
        <nav className="nav" aria-label="Main">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
              key={item.href}
              href={item.href}
              className={active ? "active" : undefined}
              aria-current={active ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="who">
            <b>{user.name}</b>
            <span>{user.role === "ADMIN" ? "Admin" : "VA"}</span>
          </div>
          <form action={signOutAction}>
            <button className="btn secondary small" type="submit">
              Sign out
            </button>
          </form>
          <p style={{ marginTop: 14 }}>ChuckTown Homes · LPT Realty</p>
        </div>
      </aside>
      <div className="main">
        <div className="topbar no-print">
          <button className="btn secondary menu-button" type="button" onClick={() => setOpen((value) => !value)}>
            Menu
          </button>
          <strong style={{ fontFamily: "var(--serif)" }}>Northstar</strong>
        </div>
        {demo ? (
          <div className="demo-banner" role="status">
            Sample data is loaded. These figures are for training and are not ChuckTown performance. Wipe them in Settings.
          </div>
        ) : null}
        <div className="page">
          <Notice />
          {children}
        </div>
      </div>
    </div>
  );
}

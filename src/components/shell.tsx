"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Notice } from "@/components/forms";
import { StarMark } from "@/components/ui";
import type { NavSection } from "@/server/access";

export function Shell({
  user,
  demo,
  embed,
  sections,
  signOutAction,
  children,
}: {
  user: { name: string; email: string; role: "ADMIN" | "VA" };
  demo: boolean;
  embed: boolean;
  sections: NavSection[];
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
          {sections.map((section) => (
            <div key={section.label}>
              <p className="nav-label">{section.label}</p>
              {section.items.map((item) => {
                const hrefs = sections.flatMap((group) => group.items.map((entry) => entry.href));
                const active = item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href ||
                    (pathname.startsWith(`${item.href}/`) &&
                      !hrefs.some(
                        (href) =>
                          href !== item.href &&
                          href.startsWith(`${item.href}/`) &&
                          (pathname === href || pathname.startsWith(`${href}/`)),
                      ));
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
            </div>
          ))}
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

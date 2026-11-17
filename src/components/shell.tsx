"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Notice } from "@/components/forms";
import { NorthstarMark } from "@/components/logo";
import { NavIcon } from "@/components/nav-icons";
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
  const hrefs = sections.flatMap((group) => group.items.map((entry) => entry.href));
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className={embed ? "shell embed" : "shell"}>
      <aside className={open ? "sidebar open no-print" : "sidebar no-print"}>
        <Link href="/" className="brand" data-tip="Northstar" aria-label="Northstar home">
          <span className="brand-mark">
            <NorthstarMark size={34} id="rail" />
          </span>
        </Link>
        <nav className="nav" aria-label="Main">
          {sections.map((section) => (
            <div key={section.label}>
              {section.items
                .filter((item) => item.href !== "/settings")
                .map((item) => {
                  const active = isActive(item.href, pathname, hrefs);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={active ? "active" : undefined}
                      aria-current={active ? "page" : undefined}
                      aria-label={item.label}
                      data-tip={item.label}
                      onClick={() => setOpen(false)}
                    >
                      <NavIcon href={item.href} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          {hrefs.includes("/settings") ? (
            <Link href="/settings" className={pathname.startsWith("/settings") ? "active" : undefined} aria-label="Settings" data-tip="Settings">
              <NavIcon href="/settings" />
              <span>Settings</span>
            </Link>
          ) : null}
          <form action={signOutAction}>
            <button className="avatar-btn" type="submit" data-tip={`${user.name} · Sign out`} aria-label={`Sign out ${user.name}`}>
              {initials}
            </button>
          </form>
        </div>
      </aside>
      <div className="main">
        <div className="topbar no-print">
          <button className="btn secondary menu-button" type="button" onClick={() => setOpen((value) => !value)}>
            Menu
          </button>
          <NorthstarMark size={28} id="top" />
        </div>
        <header className="wordmark-bar no-print">
          <p className="wordmark">
            Northstar
            <small>ChuckTown Homes</small>
          </p>
        </header>
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

function isActive(href: string, pathname: string, hrefs: string[]) {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  return !hrefs.some(
    (other) => other !== href && other.startsWith(`${href}/`) && (pathname === other || pathname.startsWith(`${other}/`)),
  );
}

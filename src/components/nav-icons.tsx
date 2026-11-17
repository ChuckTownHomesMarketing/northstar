export function NavIcon({ href }: { href: string }) {
  const path = ICONS[href] ?? ICONS.default;
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICONS: Record<string, string> = {
  "/": "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z",
  "/marketing": "M4 19V5m0 14 5-6 4 3 7-9",
  "/leads": "M12 3v18M5 8h14M7 16h10",
  "/kpis": "M4 19h16M7 16V9m5 7V5m5 11v-4",
  "/spend": "M12 3v18M16 7H9.5a3 3 0 0 0 0 6H14a3 3 0 0 1 0 6H7",
  "/calendar": "M5 6h14v14H5zM8 3v4m8-4v4M5 10h14",
  "/reports": "M7 3h7l5 5v13H7zM14 3v5h5",
  "/tasks": "M5 6h14M5 12h14M5 18h9",
  "/ordering": "M6 7h12l-1 13H7zM9 7V5h6v2",
  "/ordering/history": "M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4",
  "/ordering/queue": "M8 6h12M8 12h12M8 18h8M4 6h.01M4 12h.01M4 18h.01",
  "/apps": "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  "/settings": "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 12h2m12 0h2M12 4v2m0 12v2",
  default: "M12 6v12M6 12h12",
};

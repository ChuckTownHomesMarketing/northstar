import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { Starfield } from "@/components/starfield";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "Northstar", template: "%s · Northstar" },
  description: "Marketing operations for ChuckTown Homes.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <Starfield />
        {children}
      </body>
    </html>
  );
}

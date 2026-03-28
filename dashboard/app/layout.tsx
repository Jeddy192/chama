import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChamaPesa",
  description: "Smart Chama Manager",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

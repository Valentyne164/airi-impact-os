import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIRI Impact OS",
  description: "Grant & impact management for nonprofits.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
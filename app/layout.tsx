import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chatopsy — conversation autopsy",
  description: "Drop the evidence. Find what changed. Keep the uncertainty.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

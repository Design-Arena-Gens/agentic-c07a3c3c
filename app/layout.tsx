import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Nifty 50 AI Trading Agent",
  description: "Dynamic S/R levels with RSI and AI analysis",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

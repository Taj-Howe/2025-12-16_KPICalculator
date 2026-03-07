import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Offer KPI Calculator",
  description: "Model subscription offer profitability one offer at a time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

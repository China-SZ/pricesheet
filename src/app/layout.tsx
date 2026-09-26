import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SITE_NAME || "PriceSheet",
  description:
    process.env.NEXT_PUBLIC_SITE_TAGLINE || "Online price spreadsheet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}

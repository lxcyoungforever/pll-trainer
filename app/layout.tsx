import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "六格观察法训练",
  description: "21 种 PLL 六格观察、配色与反应速度专项训练。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

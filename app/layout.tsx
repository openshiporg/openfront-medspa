import type { Metadata } from "next";
import localFont from "next/font/local";
import { storefrontMetadata } from "@/features/storefront/lib/data/brand";
import "./globals.css";

const geistSans = localFont({ src: "../public/fonts/geist.woff2", variable: "--font-geist-sans", display: "swap" });
const geistMono = localFont({ src: "../public/fonts/geist-mono.woff2", variable: "--font-geist-mono", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await storefrontMetadata()
  return {
    ...settings,
    manifest: "/manifest.webmanifest",
    icons: { icon: "/favicon.svg" },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="/favicon.svg" rel="icon" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

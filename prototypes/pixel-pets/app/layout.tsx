import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const base = new URL(`${protocol}://${host}`);
  const description =
    "A playable anime-inspired creature world where sun, wind, and rain reshape every toss of a golden leaf.";

  return {
    metadataBase: base,
    title: "Pet Engine Study 21 — Kwilt Lab",
    description,
    openGraph: {
      title: "The weather joins the game.",
      description,
      images: [{ url: new URL("/og.png", base), width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "The weather joins the game.",
      description,
      images: [new URL("/og.png", base)],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}

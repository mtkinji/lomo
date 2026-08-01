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
    "Enter a tiny living world where touch and Focus belong, while real Kwilt progress arrives as consequence.";

  return {
    metadataBase: base,
    title: "Pet Engine Study 40 — Kwilt Lab",
    description,
    openGraph: {
      title: "The meadow is the capability.",
      description,
      images: [{ url: new URL("/og-study-34.png", base), width: 1728, height: 910 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "The meadow is the capability.",
      description,
      images: [new URL("/og-study-34.png", base)],
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

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
    "Do one real thing, watch Moss find its trace, then touch that exact change to complete the care moment.";

  return {
    metadataBase: base,
    title: "Pet Engine Study 29 — Kwilt Lab",
    description,
    openGraph: {
      title: "Touch what changed.",
      description,
      images: [{ url: new URL("/og-study-29.png", base), width: 1730, height: 909 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Touch what changed.",
      description,
      images: [new URL("/og-study-29.png", base)],
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

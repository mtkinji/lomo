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
    "Reach the old tree, hold the branch, and choose where Moss returns to the meadow.";

  return {
    metadataBase: base,
    title: "Pet Engine Study 43 — Kwilt Lab",
    description,
    openGraph: {
      title: "The tree waits for you.",
      description,
      images: [{ url: new URL("/og-study-34.png", base), width: 1728, height: 910 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "The tree waits for you.",
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

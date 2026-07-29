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
    "localhost:5173";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  const origin = `${protocol}://${host}`;
  const socialImage = new URL("/og.png", origin).toString();

  return {
    metadataBase: new URL(origin),
    title: {
      default: "Skybound Flight Simulator",
      template: "%s · Skybound",
    },
    description:
      "Uçuş fiziği, görevler, hava koşulları ve ayrıntılı kokpit göstergeleriyle tarayıcı tabanlı 3B uçuş simülatörü.",
    applicationName: "Skybound Flight Simulator",
    keywords: [
      "uçuş simülatörü",
      "flight simulator",
      "3D browser game",
      "havacılık",
    ],
    openGraph: {
      title: "Skybound Flight Simulator",
      description: "Motoru çalıştır. Pisti geride bırak. Görevi tamamla.",
      type: "website",
      locale: "tr_TR",
      url: origin,
      images: [
        {
          url: socialImage,
          width: 1732,
          height: 909,
          alt: "Skybound Flight Simulator — kıyı meydanına yaklaşan eğitim uçağı",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Skybound Flight Simulator",
      description: "Tarayıcıda çalışan görev tabanlı 3B uçuş simülatörü.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}

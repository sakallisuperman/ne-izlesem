import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Ne İzlesem? | Ruh Haline Göre Film ve Dizi Önerileri",
  description:
    "Birkaç soruya cevap ver, sana özel film ve dizi önerileri alalım. Yapay zeka destekli kişiselleştirilmiş öneri sistemi.",
  keywords: [
    "film önerisi",
    "dizi önerisi",
    "ne izlesem",
    "film tavsiyesi",
    "dizi tavsiyesi",
    "yapay zeka öneri",
  ],
  openGraph: {
    title: "Ne İzlesem? 🎬",
    description: "Ruh haline göre sana özel film ve dizi önerileri",
    type: "website",
    locale: "tr_TR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ne İzlesem? 🎬",
    description: "Ruh haline göre sana özel film ve dizi önerileri",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

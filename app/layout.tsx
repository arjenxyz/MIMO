import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/app/components/Navbar";

const nunito = Nunito({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "MIMO — İngilizce Öğren",
  description: "Spaced repetition ile her gün seviye atlayan oyunlaştırılmış İngilizce platformu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${nunito.variable} ${nunito.className} bg-duo-bg text-white antialiased`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}

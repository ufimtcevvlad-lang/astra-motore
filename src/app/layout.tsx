import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "./components/CartContext";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { YandexMetrika } from "./components/YandexMetrika";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Astra Motors — автозапчасти VAG и GM в Екатеринбурге",
  description:
    "Магазин Astra Motors: запчасти для Volkswagen, Audi, Skoda, Seat, Opel, Chevrolet, Cadillac и Hummer. Подбор по VIN, оригинал и качественный аналог, доставка по Екатеринбургу.",
  openGraph: {
    title: "Astra Motors — автозапчасти VAG и GM",
    description:
      "Запчасти для Volkswagen, Audi, Skoda, Seat, Opel, Chevrolet, Cadillac и Hummer. Подбор по VIN, доставка.",
    url: "https://astramotors.shop",
    siteName: "Astra Motors",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <YandexMetrika />

        <CartProvider>
          <Header />
          <main className="mx-auto max-w-5xl px-4 py-6 min-h-[60vh]">
            {children}
          </main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}

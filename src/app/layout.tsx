import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "./components/CartContext";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { MaintenanceNotice } from "./components/MaintenanceNotice";
import { MetrikaDeferred } from "./components/MetrikaDeferred";
import { SITE_URL } from "./lib/site";
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
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
  title: {
    default: "Astra Motors — автозапчасти GM (Opel, Chevrolet) в Екатеринбурге",
    template: "%s — Astra Motors",
  },
  description:
    "Магазин Astra Motors: автозапчасти GM — Opel и Chevrolet. Оригинал и качественные аналоги, доставка по Екатеринбургу.",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Astra Motors — автозапчасти GM (Opel, Chevrolet)",
    description:
      "Автозапчасти GM — Opel и Chevrolet. Оригинал и аналоги, доставка по Екатеринбургу.",
    url: SITE_URL,
    siteName: "Astra Motors",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Astra Motors — автозапчасти GM (Opel, Chevrolet)",
    description:
      "Автозапчасти GM — Opel и Chevrolet. Оригинал и аналоги, доставка по Екатеринбургу.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const maintenanceMode = process.env.MAINTENANCE_MODE === "1";
  const maintenanceMessage = process.env.MAINTENANCE_MESSAGE || "Ведутся работы по улучшению сайта.";

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    name: "Astra Motors",
    url: SITE_URL,
    telephone: ["+7 (902) 254-01-11", "+7 (343) 206-15-35"],
    areaServed: "Екатеринбург",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Екатеринбург",
      streetAddress: "ул. Готвальда, 9",
      addressCountry: "RU",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "10:00",
        closes: "20:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Saturday", "Sunday"],
        opens: "10:00",
        closes: "18:00",
      },
    ],
  };

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Astra Motors",
    url: SITE_URL,
  };

  return (
    <html lang="ru">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('am-profile-theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`,
          }}
        />
        {/* Яндекс.Вебмастер: подтверждение прав */}
        <meta name="yandex-verification" content="62d469a9a0693298" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />

        <MetrikaDeferred />

        <CartProvider>
          <Header />
          <main className="mx-auto min-h-[60vh] max-w-7xl px-4 pb-6 pt-6 sm:pb-24">
            {maintenanceMode ? <MaintenanceNotice message={maintenanceMessage} /> : null}
            {children}
          </main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}

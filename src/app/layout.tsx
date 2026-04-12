import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "./components/CartContext";
import { FavoritesProvider } from "./components/FavoritesContext";
import { CookieConsentBanner } from "./components/CookieConsentBanner";
import { FloatingCartButton } from "./components/FloatingCartButton";
import { FloatingContactButtons } from "./components/FloatingContactButtons";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { MaintenanceNotice } from "./components/MaintenanceNotice";
import { MetrikaDeferred } from "./components/MetrikaDeferred";
import { getOrganizationJsonLd, getWebSiteJsonLd } from "./lib/schema-jsonld";
import {
  DEFAULT_META_DESCRIPTION,
  SEO_KEYWORDS,
  SEO_LOCALE,
  defaultOgImages,
  defaultRobots,
} from "./lib/seo";
import { SITE_BRAND, SITE_URL } from "./lib/site";
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
  keywords: SEO_KEYWORDS,
  authors: [{ name: SITE_BRAND, url: SITE_URL }],
  creator: SITE_BRAND,
  publisher: SITE_BRAND,
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
  title: {
    default: `${SITE_BRAND} — оригинальные запчасти Opel и Chevrolet в Екатеринбурге`,
    template: `%s — ${SITE_BRAND}`,
  },
  description: DEFAULT_META_DESCRIPTION,
  robots: defaultRobots,
  openGraph: {
    title: `${SITE_BRAND} — автозапчасти GM (Opel, Chevrolet)`,
    description: DEFAULT_META_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_BRAND,
    locale: SEO_LOCALE,
    type: "website",
    images: defaultOgImages(),
  },
  verification: {
    yandex: "d754ed4e8ec9f534",
  },
  category: "ecommerce",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#05070A" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const maintenanceMode = process.env.MAINTENANCE_MODE === "1";
  const maintenanceMessage = process.env.MAINTENANCE_MESSAGE || "Ведутся работы по улучшению сайта.";

  const organizationLd = getOrganizationJsonLd();
  const websiteLd = getWebSiteJsonLd();

  return (
    <html lang="ru" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('am-profile-theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`,
          }}
        />
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
          <FavoritesProvider>
            <Header />
            <main className="mx-auto min-h-[60vh] max-w-7xl px-4 pb-6 pt-6">
              {maintenanceMode ? <MaintenanceNotice message={maintenanceMessage} /> : null}
              {children}
            </main>
            <Footer />
            <FloatingCartButton />
            <FloatingContactButtons />
            <CookieConsentBanner />
          </FavoritesProvider>
        </CartProvider>
      </body>
    </html>
  );
}

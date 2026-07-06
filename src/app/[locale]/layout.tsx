import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "../globals.css";
import { Toaster } from "@/components/ui/toaster";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n/config';
import { getCachedSpecialTouch } from "@/lib/cache";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const revalidate = 3600; // ISR: revalidate every hour

export const metadata: Metadata = {
  title: "Giftbox.lk - Premium Gift Boxes & Custom Gifting in Sri Lanka",
  description: "Discover the perfect gift at Giftbox.lk. Shop curated gift boxes, build your own custom gift, and send love across Sri Lanka. Birthday gifts, anniversary gifts, and special occasions made memorable.",
  keywords: ["gift boxes Sri Lanka", "custom gifts", "birthday gifts", "anniversary gifts", "gift delivery Sri Lanka", "Giftbox.lk"],
  authors: [{ name: "Giftbox.lk" }],
  icons: {
    icon: "/logo/logo.png",
  },
  openGraph: {
    title: "Giftbox.lk - Premium Gift Boxes & Custom Gifting",
    description: "Curated gift boxes and custom gifting for every occasion in Sri Lanka",
    type: "website",
    locale: "en_LK",
  },
};

import dynamic from "next/dynamic";
import { Providers } from "@/components/Providers";
import CartHydration from "@/components/CartHydration";
import WhatsAppFAB from "@/components/WhatsAppFAB";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import TopLoaderProvider from "@/components/TopLoaderProvider";

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = await params;

  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();
  const specialTouchProducts = await getCachedSpecialTouch();
  return (
    <html lang={locale} className="h-full overflow-x-hidden" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground min-h-screen flex flex-col w-full max-w-full overflow-x-hidden`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages}>
          <NuqsAdapter>
            <Providers>
              <TopLoaderProvider />
              <CartHydration specialTouchProducts={specialTouchProducts} />
              <div className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden">
                {children}
              </div>
              <WhatsAppFAB />
              <Toaster />
            </Providers>
          </NuqsAdapter>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

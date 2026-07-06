import { Header, Footer, SectionHeading, CartDrawer } from "@/components/giftbox";
import { GiftCardClient } from "./gift-card-client";
import { db } from "@/lib/db";

export const revalidate = 3600; // Revalidate every hour

export default async function GiftCardPage() {
  const denominations = await db.giftCardDenomination.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <CartDrawer />
      <main className="flex-1 py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto w-full">
        {/* <SectionHeading title="Digital Gift Card" subtitle="Give the gift of choice" /> */}
        <GiftCardClient denominations={denominations.map(d => d.value)} />
      </main>
      <Footer />
    </div>
  );
}

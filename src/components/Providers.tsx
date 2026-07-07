"use client";

import { SessionProvider } from "next-auth/react";
import { CurrencyProvider } from "./CurrencyProvider";

export function Providers({
  children,
  initialCurrency = "LKR",
}: {
  children: React.ReactNode;
  initialCurrency?: string;
}) {
  return (
    <SessionProvider>
      <CurrencyProvider initialCurrency={initialCurrency}>
        {children}
      </CurrencyProvider>
    </SessionProvider>
  );
}

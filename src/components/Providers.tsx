"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import { CurrencyProvider } from "./CurrencyProvider";

export function Providers({
  children,
  initialCurrency = "LKR",
  initialToggles = {},
}: {
  children: React.ReactNode;
  initialCurrency?: string;
  initialToggles?: Record<string, boolean>;
}) {
  return (
    <SessionProvider>
      <SWRConfig
        value={{
          fallback: {
            "/api/admin/feature-toggles": initialToggles,
          },
        }}
      >
        <CurrencyProvider initialCurrency={initialCurrency}>
          {children}
        </CurrencyProvider>
      </SWRConfig>
    </SessionProvider>
  );
}

import { db } from "@/lib/db";

export async function isFeatureEnabled(key: string): Promise<boolean> {
  try {
    const toggle = await db.featureToggle.findUnique({
      where: { key },
    });
    return toggle ? toggle.isActive : true;
  } catch (error) {
    console.error(`Failed to fetch feature toggle for ${key}:`, error);
    return true; // Default to true on error/missing to ensure availability
  }
}

export async function getFeatureToggles(): Promise<Record<string, boolean>> {
  try {
    const toggles = await db.featureToggle.findMany();
    return toggles.reduce((acc, toggle) => {
      acc[toggle.key] = toggle.isActive;
      return acc;
    }, {} as Record<string, boolean>);
  } catch (error) {
    console.error("Failed to fetch feature toggles:", error);
    return {};
  }
}

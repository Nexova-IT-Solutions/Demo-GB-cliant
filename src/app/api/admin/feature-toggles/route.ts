import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFeatureToggles } from "@/lib/queries/feature-toggles";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role === "USER") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const toggles = await getFeatureToggles();
    return NextResponse.json(toggles);
  } catch (error) {
    console.error("Failed to fetch feature toggles API:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "DEV_ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { toggles } = body; // expect format: { storefront_section: true, storefront_banners: false, ... }

    if (!toggles || typeof toggles !== "object") {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const updates = Object.entries(toggles).map(([key, isActive]) => {
      return db.featureToggle.upsert({
        where: { key },
        update: { isActive: !!isActive },
        create: { key, isActive: !!isActive },
      });
    });

    await db.$transaction(updates);

    return NextResponse.json({ message: "Feature toggles updated successfully" });
  } catch (error) {
    console.error("Failed to update feature toggles API:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const companyDetailsSchema = z.object({
  companyName: z.string().optional(),
  mobileNumber: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  crNumber: z.string().optional(),
  posPrinterName: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    let details = await db.companyDetails.findUnique({
      where: { id: "1" },
    });

    if (!details) {
      details = await db.companyDetails.create({
        data: { id: "1" },
      });
    }

    return NextResponse.json(details, { status: 200 });
  } catch (error) {
    console.error("[COMPANY_DETAILS_GET]", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "DEV_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const result = companyDetailsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: result.error.errors },
        { status: 400 }
      );
    }

    const data = result.data;

    const details = await db.companyDetails.upsert({
      where: { id: "1" },
      update: {
        companyName: data.companyName,
        mobileNumber: data.mobileNumber,
        address: data.address,
        website: data.website,
        email: data.email,
        crNumber: data.crNumber,
        posPrinterName: data.posPrinterName,
      },
      create: {
        id: "1",
        companyName: data.companyName,
        mobileNumber: data.mobileNumber,
        address: data.address,
        website: data.website,
        email: data.email,
        crNumber: data.crNumber,
        posPrinterName: data.posPrinterName,
      },
    });

    return NextResponse.json(details, { status: 200 });
  } catch (error) {
    console.error("[COMPANY_DETAILS_POST]", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

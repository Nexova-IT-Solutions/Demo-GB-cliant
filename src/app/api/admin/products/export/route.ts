import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import * as ExcelJS from "exceljs";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "STOREFRONT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  // The request says owner and manager. SUPER_ADMIN is owner, ADMIN is manager.
  // We'll restrict this to SUPER_ADMIN, DEV_ADMIN, and ADMIN roles.
  if (!["SUPER_ADMIN", "DEV_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const products = await db.product.findMany({
      select: {
        name: true,
        sku: true,
        stock: true,
        price: true,
        productVariants: true,
        supplier: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Inventory Backup");

    worksheet.columns = [
      { header: "Product Name", key: "name", width: 40 },
      { header: "SKU", key: "sku", width: 20 },
      { header: "Stock", key: "stock", width: 40 },
      { header: "Supplier", key: "supplier", width: 30 },
      { header: "Base Price", key: "price", width: 15 },
    ];

    products.forEach((p) => {
      let stockDisplay = p.stock?.toString() || "0";

      // Process productVariants JSON array if exists
      if (Array.isArray(p.productVariants) && p.productVariants.length > 0) {
        const variantStrings = p.productVariants
          .map((v: any) => {
            if (!v || typeof v !== "object") return null;
            const combination = [v.color, v.size].filter(Boolean).join("-");
            if (combination) {
              return `${combination}-${v.stock || 0}`;
            }
            return null;
          })
          .filter(Boolean);

        if (variantStrings.length > 0) {
          stockDisplay = variantStrings.join(" / ");
        }
      }

      worksheet.addRow({
        name: p.name,
        sku: p.sku || "N/A",
        stock: stockDisplay,
        supplier: p.supplier?.name || "N/A",
        price: p.price,
      });
    });

    // Make header bold
    worksheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="inventory-backup.xlsx"',
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

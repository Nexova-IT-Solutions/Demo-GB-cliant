import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Resend } from "resend";
import { generateDailySalesExcel, generateDailySalesPDF, SalesReportData } from "@/lib/server-report-generator";
import { startOfDay, endOfDay } from "date-fns";

const resend = new Resend(process.env.RESEND_API_KEY || "fallback_key");

export async function GET(req: Request) {
  try {
    // Optional: add a secret token check here if triggered by an external cron service
    // const authHeader = req.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new Response('Unauthorized', { status: 401 });
    // }

    const schedule = await db.scheduledReport.findUnique({
      where: { reportType: "SALES_SUMMARY" },
    });

    if (!schedule || !schedule.enabled || !schedule.emailAddress) {
      return NextResponse.json({ success: false, message: "Scheduled report is disabled or not configured." });
    }

    // Check time if required. For simplicity, assuming the external cron hits this exactly at the scheduled time.
    // E.g., if schedule.scheduleTime is "21:00", the external cron should trigger this at 21:00.
    
    const now = new Date();
    const startDate = startOfDay(now);
    const endDate = endOfDay(now);

    const orders = await db.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        paymentStatus: "PAID",
      },
      select: {
        id: true,
        total: true,
        subtotal: true,
        paymentMethod: true,
        orderSource: true,
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            salePrice: true,
            discountValue: true,
            product: { select: { costPrice: true } },
          },
        },
      },
    });

    let totalSales = 0;
    let totalCostOfSales = 0;
    let totalDiscounts = 0;
    const orderCount = orders.length;
    const paymentMethodMap = new Map<string, { total: number; count: number }>();
    let webSales = 0, webOrders = 0;
    let posSales = 0, posOrders = 0;

    for (const order of orders) {
      totalSales += order.total;
      
      const pm = order.paymentMethod || "UNKNOWN";
      const existing = paymentMethodMap.get(pm) || { total: 0, count: 0 };
      paymentMethodMap.set(pm, { total: existing.total + order.total, count: existing.count + 1 });

      if (order.orderSource === "POS") {
        posSales += order.total;
        posOrders += 1;
      } else {
        webSales += order.total;
        webOrders += 1;
      }

      for (const item of order.items) {
        const costPrice = item.product?.costPrice ?? 0;
        totalCostOfSales += costPrice * item.quantity;

        if (item.discountValue && item.discountValue > 0) {
          totalDiscounts += item.discountValue * item.quantity;
        } else if (item.salePrice && item.salePrice < item.unitPrice) {
          totalDiscounts += (item.unitPrice - item.salePrice) * item.quantity;
        }
      }
    }

    const netProfit = totalSales - totalCostOfSales;

    const reportData: SalesReportData = {
      summary: {
        totalSales,
        totalCostOfSales,
        totalDiscounts,
        netProfit,
        orderCount,
      },
      salesByPaymentMethod: Array.from(paymentMethodMap.entries()).map(([method, data]) => ({
        method,
        total: data.total,
        count: data.count,
      })),
      salesBySource: {
        web: { total: webSales, orders: webOrders },
        pos: { total: posSales, orders: posOrders },
      },
      dateRange: { startDate, endDate },
    };

    const pdfBuffer = await generateDailySalesPDF(reportData);
    const excelBuffer = await generateDailySalesExcel(reportData);

    const emailHtml = `
      <div style="font-family: sans-serif; color: #333;">
        <p>Dear ${schedule.ownerName},</p>
        <p>This is the daily sales summary of Sohar Pet Center for ${startDate.toLocaleDateString()}.</p>
        <p>Please find the detailed PDF and Excel reports attached to this email.</p>
        <p>Regards,<br/>Sohar Pet Center System</p>
      </div>
    `;

    // Send email using Resend
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: "Sohar Pet Center <reports@soharpetcenter.com>", // Make sure to use verified domain
        to: schedule.emailAddress,
        subject: `Daily Sales Summary - ${startDate.toLocaleDateString()}`,
        html: emailHtml,
        attachments: [
          {
            filename: `Sales_Summary_${startDate.toISOString().split("T")[0]}.pdf`,
            content: pdfBuffer,
          },
          {
            filename: `Sales_Summary_${startDate.toISOString().split("T")[0]}.xlsx`,
            content: excelBuffer,
          },
        ],
      });
    } else {
      console.warn("RESEND_API_KEY is not configured. Email was not sent.");
    }

    return NextResponse.json({ success: true, message: "Report generated and sent." });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, message: "Error generating report" }, { status: 500 });
  }
}

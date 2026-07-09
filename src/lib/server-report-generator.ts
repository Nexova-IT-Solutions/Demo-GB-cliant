import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export interface SalesReportData {
  summary: {
    totalSales: number;
    totalCostOfSales: number;
    totalDiscounts: number;
    netProfit: number;
    orderCount: number;
  };
  salesByPaymentMethod: { method: string; total: number; count: number }[];
  salesBySource: {
    web: { total: number; orders: number };
    pos: { total: number; orders: number };
  };
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

export async function generateDailySalesExcel(data: SalesReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Daily Sales Summary");

  worksheet.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 20 },
  ];

  const dateStr = `${format(data.dateRange.startDate, "yyyy-MM-dd")} to ${format(data.dateRange.endDate, "yyyy-MM-dd")}`;
  
  worksheet.addRow({ metric: "Report Period", value: dateStr });
  worksheet.addRow({ metric: "Total Orders", value: data.summary.orderCount });
  worksheet.addRow({ metric: "Total Sales", value: data.summary.totalSales });
  worksheet.addRow({ metric: "Total Cost of Sales", value: data.summary.totalCostOfSales });
  worksheet.addRow({ metric: "Total Discounts", value: data.summary.totalDiscounts });
  worksheet.addRow({ metric: "Net Profit", value: data.summary.netProfit });

  worksheet.addRow([]);
  worksheet.addRow({ metric: "Sales By Source", value: "" });
  worksheet.addRow({ metric: "Online (Web)", value: data.salesBySource.web.total });
  worksheet.addRow({ metric: "In-Store (POS)", value: data.salesBySource.pos.total });

  worksheet.addRow([]);
  worksheet.addRow({ metric: "Sales By Payment Method", value: "" });
  data.salesByPaymentMethod.forEach(pm => {
    worksheet.addRow({ metric: pm.method, value: pm.total });
  });

  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function generateDailySalesPDF(data: SalesReportData): Promise<Buffer> {
  const doc = new jsPDF();
  const dateStr = `${format(data.dateRange.startDate, "yyyy-MM-dd")} to ${format(data.dateRange.endDate, "yyyy-MM-dd")}`;

  doc.setFontSize(18);
  doc.text("Daily Sales Summary Report", 14, 22);
  
  doc.setFontSize(12);
  doc.text(`Period: ${dateStr}`, 14, 32);

  autoTable(doc, {
    startY: 40,
    head: [["KPI", "Value"]],
    body: [
      ["Total Orders", data.summary.orderCount.toString()],
      ["Total Sales", `Rs. ${data.summary.totalSales.toFixed(2)}`],
      ["Cost of Sales", `Rs. ${data.summary.totalCostOfSales.toFixed(2)}`],
      ["Total Discounts", `Rs. ${data.summary.totalDiscounts.toFixed(2)}`],
      ["Net Profit", `Rs. ${data.summary.netProfit.toFixed(2)}`],
    ],
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [["Channel", "Orders", "Revenue"]],
    body: [
      ["Online (Web)", data.salesBySource.web.orders.toString(), `Rs. ${data.salesBySource.web.total.toFixed(2)}`],
      ["In-Store (POS)", data.salesBySource.pos.orders.toString(), `Rs. ${data.salesBySource.pos.total.toFixed(2)}`],
    ],
  });

  const paymentBody = data.salesByPaymentMethod.map(pm => [
    pm.method,
    pm.count.toString(),
    `Rs. ${pm.total.toFixed(2)}`
  ]);

  if (paymentBody.length > 0) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Payment Method", "Count", "Total"]],
      body: paymentBody,
    });
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

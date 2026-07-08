import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export interface ReceiptData {
  orderNumber: string;
  total: number;
  subtotal: number;
  changeDue: number;
  paymentMethod: string;
  date: string;
  items: {
    name: string;
    quantity: number;
    price: number;
    discountPercent?: number;
  }[];
  companyDetails?: {
    companyName?: string | null;
    mobileNumber?: string | null;
    address?: string | null;
    website?: string | null;
    email?: string | null;
    crNumber?: string | null;
  } | null;
}

export function generateReceiptPdf(data: ReceiptData) {
  const doc = new jsPDF({
    unit: "mm",
    format: [80, 200], // 80mm roll width, dynamic height later
  });

  let currentY = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const alignCenter = { align: "center" as const };

  // Company Name
  const companyName = data.companyDetails?.companyName || "STORE RECEIPT";
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, pageWidth / 2, currentY, alignCenter);
  currentY += 6;

  // Company Details
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  if (data.companyDetails?.address) {
    const splitAddress = doc.splitTextToSize(data.companyDetails.address, pageWidth - 10);
    doc.text(splitAddress, pageWidth / 2, currentY, alignCenter);
    currentY += splitAddress.length * 4;
  }
  
  if (data.companyDetails?.mobileNumber) {
    doc.text(`Tel: ${data.companyDetails.mobileNumber}`, pageWidth / 2, currentY, alignCenter);
    currentY += 4;
  }
  
  if (data.companyDetails?.email) {
    doc.text(data.companyDetails.email, pageWidth / 2, currentY, alignCenter);
    currentY += 4;
  }
  
  if (data.companyDetails?.website) {
    doc.text(data.companyDetails.website, pageWidth / 2, currentY, alignCenter);
    currentY += 4;
  }
  
  if (data.companyDetails?.crNumber) {
    doc.text(`CR: ${data.companyDetails.crNumber}`, pageWidth / 2, currentY, alignCenter);
    currentY += 4;
  }

  currentY += 2;
  doc.setLineWidth(0.5);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(5, currentY, pageWidth - 5, currentY);
  currentY += 4;

  // Order Details
  doc.setFontSize(8);
  doc.text(`Order: ${data.orderNumber}`, 5, currentY);
  currentY += 4;
  doc.text(`Date: ${data.date}`, 5, currentY);
  currentY += 4;
  doc.text(`Payment: ${data.paymentMethod.replace("POS_", "")}`, 5, currentY);
  currentY += 4;

  // Items Table
  const tableData = data.items.map((item) => {
    let itemName = item.name;
    if (item.discountPercent) {
      itemName += `\n(-${item.discountPercent}%)`;
    }
    return [
      itemName,
      item.quantity.toString(),
      `$${item.price.toFixed(2)}`,
      `$${(item.quantity * item.price * (1 - (item.discountPercent || 0) / 100)).toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [["Item", "Qty", "Price", "Total"]],
    body: tableData,
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 1 },
    headStyles: { fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 30 }, // Item
      1: { cellWidth: 10, halign: "center" }, // Qty
      2: { cellWidth: 15, halign: "right" }, // Price
      3: { cellWidth: 15, halign: "right" }, // Total
    },
    margin: { left: 5, right: 5 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  doc.setLineWidth(0.5);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(5, currentY, pageWidth - 5, currentY);
  currentY += 4;

  // Totals
  doc.setFontSize(9);
  doc.text("Subtotal:", 5, currentY);
  doc.text(`$${data.subtotal.toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
  currentY += 5;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Total:", 5, currentY);
  doc.text(`$${data.total.toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
  currentY += 5;

  if (data.changeDue > 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Change Due:", 5, currentY);
    doc.text(`$${data.changeDue.toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
    currentY += 5;
  }

  currentY += 4;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("Thank you for your purchase!", pageWidth / 2, currentY, alignCenter);

  doc.save(`receipt-${data.orderNumber}.pdf`);
}

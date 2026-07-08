import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import qz from "qz-tray";
import { amiriBase64 } from "./fonts/Amiri-Regular";

export interface ReceiptData {
  orderNumber: string;
  total: number;
  subtotal: number;
  changeDue: number;
  paymentMethod: string;
  date: string;
  items: {
    name: string;
    nameAr?: string | null;
    sku?: string;
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
    posPrinterName?: string | null;
  } | null;
}

// Helper to convert image URL to base64
async function getBase64ImageFromUrl(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error loading logo:", error);
    return null;
  }
}

export async function generateReceiptPdf(data: ReceiptData, format: "print" | "download") {
  const logoBase64 = await getBase64ImageFromUrl("/logo/logo.png");

  if (format === "print") {
    // THERMAL PRINTER FORMAT
    const doc = new jsPDF({
      unit: "mm",
      format: [80, 200], // 80mm roll width
    });
    doc.addFileToVFS("Amiri-Regular.ttf", amiriBase64);
    doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");

    let currentY = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const alignCenter = { align: "center" as const };

    // Logo
    if (logoBase64) {
      // Assuming square logo, center it. 20x20 mm
      doc.addImage(logoBase64, "PNG", (pageWidth - 20) / 2, currentY, 20, 20);
      currentY += 24;
    }

    // Company Name
    const companyName = data.companyDetails?.companyName || "STORE RECEIPT";
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const splitCompanyName = doc.splitTextToSize(companyName, pageWidth - 10);
    doc.text(splitCompanyName, pageWidth / 2, currentY, alignCenter);
    currentY += splitCompanyName.length * 5 + 1;

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

    // Items Table mapping
    const tableData = data.items.map((item) => {
      let itemName = item.name;
      if (item.nameAr) {
        itemName += `\n${item.nameAr}`;
      }
      if (item.sku) {
        itemName += `\nSKU: ${item.sku}`;
      }
      
      const discountText = item.discountPercent ? `${item.discountPercent}%` : "-";

      return [
        itemName,
        item.quantity.toString(),
        `OMR ${item.price.toFixed(2)}`,
        discountText,
        `OMR ${(item.quantity * item.price * (1 - (item.discountPercent || 0) / 100)).toFixed(2)}`,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["Item / العنصر", "Qty", "Price", "Disc", "Total"]],
      body: tableData,
      theme: "plain",
      styles: { font: "Amiri", fontSize: 8, cellPadding: 1 },
      headStyles: { fontStyle: "bold", font: "Amiri" },
      columnStyles: {
        0: { cellWidth: 26 }, // Item
        1: { cellWidth: 8, halign: "center" }, // Qty
        2: { cellWidth: 12, halign: "right" }, // Price
        3: { cellWidth: 10, halign: "center" }, // Disc
        4: { cellWidth: 14, halign: "right" }, // Total
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
    doc.text(`OMR ${data.subtotal.toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
    currentY += 5;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Total:", 5, currentY);
    doc.text(`OMR ${data.total.toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
    currentY += 5;

    if (data.changeDue > 0) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Change Due:", 5, currentY);
      doc.text(`OMR ${data.changeDue.toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
      currentY += 5;
    }

    currentY += 4;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for your purchase!", pageWidth / 2, currentY, alignCenter);

    if (data.companyDetails?.posPrinterName) {
      try {
        if (!qz.websocket.isActive()) {
          await qz.websocket.connect({ retries: 0 });
        }
        const config = qz.configs.create(data.companyDetails.posPrinterName);
        const base64Str = doc.output("datauristring").split(",")[1];
        const printData = [{ type: 'pixel', format: 'pdf', flavor: 'base64', data: base64Str }];
        await qz.print(config, printData);
        return; // successfully printed via QZ, bypass normal save
      } catch (e) {
        console.error("QZ print failed, falling back to download", e);
      }
    }

    doc.save(`Receipt-${data.orderNumber}.pdf`);

  } else {
    // COLORFUL A4 INVOICE FORMAT
    const doc = new jsPDF({
      unit: "mm",
      format: "a4", // 210 x 297 mm
    });
    doc.addFileToVFS("Amiri-Regular.ttf", amiriBase64);
    doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");

    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 0;

    // Header Background
    doc.setFillColor(167, 6, 106); // #A7066A (Brand color)
    doc.rect(0, 0, pageWidth, 40, "F");

    // Header text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("RECEIPT", pageWidth - 15, 25, { align: "right" });

    // Logo
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", 15, 8, 24, 24);
    }

    currentY = 50;

    // Reset text color
    doc.setTextColor(33, 33, 33);

    // Company Details (Left)
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(data.companyDetails?.companyName || "STORE RECEIPT", 15, currentY);
    currentY += 6;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    
    if (data.companyDetails?.address) {
      const splitAddress = doc.splitTextToSize(data.companyDetails.address, 90);
      doc.text(splitAddress, 15, currentY);
      currentY += splitAddress.length * 5;
    }
    if (data.companyDetails?.mobileNumber) {
      doc.text(`Tel: ${data.companyDetails.mobileNumber}`, 15, currentY);
      currentY += 5;
    }
    if (data.companyDetails?.email) {
      doc.text(`Email: ${data.companyDetails.email}`, 15, currentY);
      currentY += 5;
    }
    if (data.companyDetails?.website) {
      doc.text(`Web: ${data.companyDetails.website}`, 15, currentY);
      currentY += 5;
    }
    if (data.companyDetails?.crNumber) {
      doc.text(`CR No: ${data.companyDetails.crNumber}`, 15, currentY);
      currentY += 5;
    }

    // Receipt Info (Right)
    let rightY = 50;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(33, 33, 33);
    doc.text("Order Number:", pageWidth - 80, rightY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(data.orderNumber, pageWidth - 15, rightY, { align: "right" });
    
    rightY += 8;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(33, 33, 33);
    doc.text("Date:", pageWidth - 80, rightY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(data.date, pageWidth - 15, rightY, { align: "right" });
    
    rightY += 8;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(33, 33, 33);
    doc.text("Payment Method:", pageWidth - 80, rightY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(data.paymentMethod.replace("POS_", ""), pageWidth - 15, rightY, { align: "right" });

    currentY = Math.max(currentY, rightY) + 15;

    // Items Table mapping
    const tableData = data.items.map((item) => {
      let itemName = item.name;
      if (item.nameAr) {
        itemName += `\n${item.nameAr}`;
      }
      if (item.sku) {
        itemName += `\nSKU: ${item.sku}`;
      }
      
      const discountText = item.discountPercent ? `${item.discountPercent}%` : "-";

      return [
        itemName,
        item.quantity.toString(),
        `OMR ${item.price.toFixed(2)}`,
        discountText,
        `OMR ${(item.quantity * item.price * (1 - (item.discountPercent || 0) / 100)).toFixed(2)}`,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["Item Description / وصف العنصر", "Qty", "Unit Price", "Discount", "Total"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [167, 6, 106], textColor: 255, fontStyle: "bold", font: "Amiri" },
      styles: { font: "Amiri", fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 75 },
        1: { cellWidth: 15, halign: "center" },
        2: { cellWidth: 30, halign: "right" },
        3: { cellWidth: 25, halign: "center" },
        4: { cellWidth: 35, halign: "right" },
      },
      margin: { left: 15, right: 15 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Totals Area (Right aligned box)
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(pageWidth - 85, currentY, 70, 40, 3, 3, "FD");

    let totalY = currentY + 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    
    doc.text("Subtotal:", pageWidth - 80, totalY);
    doc.text(`OMR ${data.subtotal.toFixed(2)}`, pageWidth - 20, totalY, { align: "right" });
    
    totalY += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(167, 6, 106);
    doc.text("Total:", pageWidth - 80, totalY);
    doc.text(`OMR ${data.total.toFixed(2)}`, pageWidth - 20, totalY, { align: "right" });

    if (data.changeDue > 0) {
      totalY += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Change Due:", pageWidth - 80, totalY);
      doc.text(`OMR ${data.changeDue.toFixed(2)}`, pageWidth - 20, totalY, { align: "right" });
    }

    // Footer
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for your purchase!", pageWidth / 2, 280, { align: "center" });

    doc.save(`Receipt-${data.orderNumber}.pdf`);
  }
}

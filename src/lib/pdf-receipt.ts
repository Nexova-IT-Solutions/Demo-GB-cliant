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

  const arNum = (n: number | string) => {
    const arabicNumbers = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return String(n).replace(/[0-9]/g, (w) => arabicNumbers[+w]);
  };

  if (format === "print") {
    // 80mm THERMAL PRINTER RASTER FORMAT (PDF)
    const pageWidth = 72; // 80mm paper has roughly 72mm printable area
    let currentY = 5;
    
    // 1. Calculate exact height required
    const dummy = new jsPDF({ unit: "mm", format: [pageWidth, 500] });
    dummy.addFileToVFS("Amiri-Regular.ttf", amiriBase64);
    dummy.addFont("Amiri-Regular.ttf", "Amiri", "normal");
    dummy.setFont("Amiri", "normal");
    
    if (logoBase64) currentY += 25;
    dummy.setFontSize(14);
    currentY += 6;
    dummy.setFontSize(9);
    
    if (data.companyDetails?.address) {
      currentY += dummy.splitTextToSize(data.companyDetails.address, pageWidth - 4).length * 4;
    }
    if (data.companyDetails?.mobileNumber) currentY += 4;
    if (data.companyDetails?.email) currentY += 4;
    if (data.companyDetails?.website) currentY += 4;
    if (data.companyDetails?.crNumber) currentY += 4;
    
    currentY += 6; 
    currentY += 12; 
    currentY += 6; 
    
    data.items.forEach(item => {
      let itemName = item.name;
      if (item.nameAr) itemName += ` - ${item.nameAr}`;
      currentY += dummy.splitTextToSize(itemName, pageWidth - 4).length * 4;
      if (item.sku) currentY += 4;
      currentY += 5;
    });
    
    currentY += 6; 
    currentY += 5; 
    currentY += 5; 
    if (data.changeDue > 0) currentY += 5;
    currentY += 10;
    
    const finalHeight = currentY + 10;

    // 2. Generate the actual PDF
    const doc = new jsPDF({
      unit: "mm",
      format: [pageWidth, finalHeight]
    });
    doc.addFileToVFS("Amiri-Regular.ttf", amiriBase64);
    doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
    doc.setFont("Amiri", "normal");

    let y = 5;

    // Logo
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", (pageWidth - 24) / 2, y, 24, 24);
      y += 26;
    }

    // Company Name
    doc.setFontSize(12);
    const companyName = data.companyDetails?.companyName || "STORE RECEIPT";
    doc.text(companyName, pageWidth / 2, y, { align: "center" });
    y += 5;

    // Company Details
    doc.setFontSize(9);
    if (data.companyDetails?.address) {
      const splitAddress = doc.splitTextToSize(data.companyDetails.address, pageWidth - 4);
      doc.text(splitAddress, pageWidth / 2, y, { align: "center" });
      y += splitAddress.length * 4;
    }
    if (data.companyDetails?.mobileNumber) {
      doc.text(`Tel: ${data.companyDetails.mobileNumber}`, pageWidth / 2, y, { align: "center" });
      y += 4;
    }
    if (data.companyDetails?.email) {
      doc.text(data.companyDetails.email, pageWidth / 2, y, { align: "center" });
      y += 4;
    }
    if (data.companyDetails?.website) {
      doc.text(data.companyDetails.website, pageWidth / 2, y, { align: "center" });
      y += 4;
    }
    if (data.companyDetails?.crNumber) {
      doc.text(`CR: ${data.companyDetails.crNumber}`, pageWidth / 2, y, { align: "center" });
      y += 4;
    }

    // Divider
    y += 2;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(2, y, pageWidth - 2, y);
    doc.setLineDashPattern([], 0);
    y += 4;

    // Order Info
    doc.text(`Order: ${data.orderNumber}`, 2, y);
    y += 4;
    doc.text(`Date: ${data.date}`, 2, y);
    y += 4;
    doc.text(`Payment: ${data.paymentMethod.replace("POS_", "")}`, 2, y);
    y += 4;

    // Divider
    doc.setLineDashPattern([1, 1], 0);
    doc.line(2, y, pageWidth - 2, y);
    doc.setLineDashPattern([], 0);
    y += 4;

    // Items
    data.items.forEach(item => {
      let itemName = item.name;
      if (item.nameAr) itemName += ` - ${item.nameAr}`;
      
      const splitName = doc.splitTextToSize(itemName, pageWidth - 4);
      doc.text(splitName, 2, y);
      y += splitName.length * 4;
      
      if (item.sku) {
        doc.text(`SKU: ${item.sku}`, 2, y);
        y += 4;
      }
      
      const qtyPrice = `${item.quantity} / ${arNum(item.quantity)} x ${item.price.toFixed(2)} / ${arNum(item.price.toFixed(2))}`;
      const total = `${(item.quantity * item.price * (1 - (item.discountPercent || 0) / 100)).toFixed(2)} / ${arNum((item.quantity * item.price * (1 - (item.discountPercent || 0) / 100)).toFixed(2))}`;
      
      doc.text(qtyPrice, 2, y);
      doc.text(total, pageWidth - 2, y, { align: "right" });
      y += 5;
    });

    // Divider
    y -= 1;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(2, y, pageWidth - 2, y);
    doc.setLineDashPattern([], 0);
    y += 5;

    // Totals
    doc.text(`Subtotal: OMR ${data.subtotal.toFixed(2)} / ${arNum(data.subtotal.toFixed(2))}`, pageWidth - 2, y, { align: "right" });
    y += 5;
    doc.setFontSize(10);
    doc.text(`Total: OMR ${data.total.toFixed(2)} / ${arNum(data.total.toFixed(2))}`, pageWidth - 2, y, { align: "right" });
    y += 5;
    doc.setFontSize(9);
    
    if (data.changeDue > 0) {
      doc.text(`Change Due: OMR ${data.changeDue.toFixed(2)} / ${arNum(data.changeDue.toFixed(2))}`, pageWidth - 2, y, { align: "right" });
      y += 5;
    }

    y += 5;
    doc.text("Thank you for your purchase!", pageWidth / 2, y, { align: "center" });

    if (data.companyDetails?.posPrinterName) {
      try {
        if (!qz.websocket.isActive()) {
          await qz.websocket.connect({ retries: 0 });
        }
        // Margins must be zero for thermal receipt printers
        const config = qz.configs.create(data.companyDetails.posPrinterName, {
          margins: 0,
        });
        
        const base64Pdf = doc.output('datauristring').split(',')[1];
        
        await qz.print(config, [{
          type: 'pixel',
          format: 'pdf',
          flavor: 'base64',
          data: base64Pdf
        }]);
        return;
      } catch (e) {
        console.error("QZ raster print failed", e);
      }
    }
    return;
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
        `${item.quantity} / ${arNum(item.quantity)}`,
        `OMR ${item.price.toFixed(2)} / ${arNum(item.price.toFixed(2))}`,
        discountText,
        `OMR ${(item.quantity * item.price * (1 - (item.discountPercent || 0) / 100)).toFixed(2)} / ${arNum((item.quantity * item.price * (1 - (item.discountPercent || 0) / 100)).toFixed(2))}`,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["Item Description / وصف العنصر", "Qty / الكمية", "Unit Price / سعر الوحدة", "Discount / خصم", "Total / المجموع"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [167, 6, 106], textColor: 255, fontStyle: "normal", font: "Amiri", halign: "center" },
      styles: { font: "Amiri", fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 24, halign: "center" },
        2: { cellWidth: 28, halign: "right" },
        3: { cellWidth: 26, halign: "center" },
        4: { cellWidth: 32, halign: "right" },
      },
      margin: { left: 15, right: 15 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Totals Area (Right aligned box)
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(pageWidth - 115, currentY, 100, 40, 3, 3, "FD");

    let totalY = currentY + 10;
    doc.setFont("Amiri", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    
    doc.text("Subtotal / المجموع الفرعي:", pageWidth - 110, totalY);
    doc.text(`OMR ${data.subtotal.toFixed(2)} / ${arNum(data.subtotal.toFixed(2))}`, pageWidth - 20, totalY, { align: "right" });
    
    totalY += 12;
    doc.setFont("Amiri", "normal");
    doc.setFontSize(14);
    doc.setTextColor(167, 6, 106);
    doc.text("Total / المجموع:", pageWidth - 110, totalY);
    doc.text(`OMR ${data.total.toFixed(2)} / ${arNum(data.total.toFixed(2))}`, pageWidth - 20, totalY, { align: "right" });

    if (data.changeDue > 0) {
      totalY += 10;
      doc.setFont("Amiri", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Change Due / الباقي:", pageWidth - 110, totalY);
      doc.text(`OMR ${data.changeDue.toFixed(2)} / ${arNum(data.changeDue.toFixed(2))}`, pageWidth - 20, totalY, { align: "right" });
    }

    // Footer
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for your purchase!", pageWidth / 2, 280, { align: "center" });

    doc.save(`Receipt-${data.orderNumber}.pdf`);
  }
}

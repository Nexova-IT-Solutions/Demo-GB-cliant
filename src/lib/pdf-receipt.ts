import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import qz from "qz-tray";
import { amiriBase64 } from "./fonts/Amiri-Regular";
import html2canvas from "html2canvas";

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
    posPrintMode?: string | null;
  } | null;
}

// Helper to fetch and resize logo to prevent massive printing
async function getResizedLogoBase64(imageUrl: string, targetWidth: number): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const origBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    
    return await new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = targetWidth / img.width;
        const targetHeight = img.height * scale;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(origBase64); return; }
        
        // Fill white background for transparency
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(origBase64);
      img.src = origBase64;
    });
  } catch (error) {
    console.error("Error loading logo:", error);
    return null;
  }
}

export async function generateReceiptPdf(data: ReceiptData, format: "print" | "download") {
  const logoBase64 = await getResizedLogoBase64("/logo/logo.png", 200); // 200px width fits perfectly on 80mm

  if (format === "print") {
    if (data.companyDetails?.posPrintMode === "raster") {
      // 80mm THERMAL PRINTER RASTER FORMAT (html2canvas to PNG)
      const arNum = (n: number | string) => {
        const arabicNumbers = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
        return String(n).replace(/[0-9]/g, (w) => arabicNumbers[+w]);
      };

      let itemsHtml = "";
      data.items.forEach(item => {
        let itemName = item.name;
        if (item.nameAr) itemName += ` - ${item.nameAr}`;
        
        let qtyPrice = `Qty / الكمية: ${item.quantity} / ${arNum(item.quantity)} x ${item.price.toFixed(2)} / ${arNum(item.price.toFixed(2))}`;
        if (item.discountPercent && item.discountPercent > 0) {
          qtyPrice += ` (Disc / خصم ${item.discountPercent}%)`;
        }
        
        const total = `${(item.quantity * item.price * (1 - (item.discountPercent || 0) / 100)).toFixed(2)} / ${arNum((item.quantity * item.price * (1 - (item.discountPercent || 0) / 100)).toFixed(2))}`;
        
        itemsHtml += `
          <div style="margin-bottom: 4px;">
            <div>${itemName}</div>
            ${item.sku ? `<div style="font-size: 10px; color: #555;">SKU: ${item.sku}</div>` : ''}
            <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px;">
              <div style="flex: 1;">${qtyPrice}</div>
              <div style="font-weight: bold; text-align: right; white-space: nowrap;">${total}</div>
            </div>
          </div>
        `;
      });

      const container = document.createElement("div");
      Object.assign(container.style, {
        position: "fixed",
        left: "-9999px",
        top: "0",
        width: "280px", // 72mm printable area roughly maps to 280px
        backgroundColor: "white",
        color: "black",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        fontSize: "12px",
        lineHeight: "1.3",
        padding: "0"
      });

      const originalLogo = logoBase64 ? logoBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "") : null;
      const logoHtml = originalLogo ? `<div style="text-align: center; margin-bottom: 8px;"><img src="data:image/png;base64,${originalLogo}" style="max-height: 60px; max-width: 60px;" /></div>` : '';

      container.innerHTML = `
        ${logoHtml}
        <div style="text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 4px;">${data.companyDetails?.companyName || "STORE RECEIPT"}</div>
        <div style="text-align: center; font-size: 11px; margin-bottom: 8px;">
          ${data.companyDetails?.address ? `<div>${data.companyDetails.address}</div>` : ''}
          ${data.companyDetails?.mobileNumber ? `<div>Tel: ${data.companyDetails.mobileNumber}</div>` : ''}
          ${data.companyDetails?.email ? `<div>${data.companyDetails.email}</div>` : ''}
          ${data.companyDetails?.website ? `<div>${data.companyDetails.website}</div>` : ''}
          ${data.companyDetails?.crNumber ? `<div>CR: ${data.companyDetails.crNumber}</div>` : ''}
        </div>
        <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
        <div style="font-size: 11px; margin-bottom: 8px;">
          <div>Order: ${data.orderNumber}</div>
          <div>Date: ${data.date}</div>
          <div>Payment: ${data.paymentMethod.replace("POS_", "")}</div>
        </div>
        <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
        <div style="margin-bottom: 8px;">
          ${itemsHtml}
        </div>
        <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Subtotal / المجموع الفرعي:</span>
          <span style="font-weight: bold;">OMR ${data.subtotal.toFixed(2)} / ${arNum(data.subtotal.toFixed(2))}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 14px;">
          <span style="font-weight: bold;">Total / المجموع:</span>
          <span style="font-weight: bold;">OMR ${data.total.toFixed(2)} / ${arNum(data.total.toFixed(2))}</span>
        </div>
        ${data.changeDue > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Change Due / الباقي:</span>
            <span style="font-weight: bold;">OMR ${data.changeDue.toFixed(2)} / ${arNum(data.changeDue.toFixed(2))}</span>
          </div>
        ` : ''}
        <div style="text-align: center; margin-top: 16px; margin-bottom: 4px;">Thank you for your purchase!</div>
        <div style="text-align: center; margin-top: 8px; font-size: 9px; color: #555;">Powered by Nexova</div>
      `;

      document.body.appendChild(container);

      if (data.companyDetails?.posPrinterName) {
        try {
          if (!qz.websocket.isActive()) {
            await qz.websocket.connect({ retries: 0 });
          }
          await new Promise(r => setTimeout(r, 50));
          const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false
          });
          const base64Image = canvas.toDataURL("image/png").split(',')[1];
          const config = qz.configs.create(data.companyDetails.posPrinterName, { margins: 0 });
          await qz.print(config, [
            {
              type: 'raw',
              format: 'image',
              flavor: 'base64',
              data: base64Image,
              options: { language: "ESCPOS", dotDensity: "double" }
            },
            {
              type: 'raw',
              format: 'command',
              flavor: 'hex',
              data: '1D564100'
            }
          ]);
        } catch (e) {
          console.error("QZ image print failed", e);
        } finally {
          if (document.body.contains(container)) {
            document.body.removeChild(container);
          }
        }
      } else {
        document.body.removeChild(container);
      }
      return;
    } else {
      // THERMAL PRINTER RAW TEXT FORMAT
      const companyName = data.companyDetails?.companyName || "STORE RECEIPT";
      
      const rawLines: any[] = [];

      // Init and Center align MUST happen before image is sent
      rawLines.push(
        '\x1B\x40', // Init printer
        '\x1B\x74\x21', // Select character code table 33 (WPC1256 for Arabic)
        '\x1B\x61\x01', // Center align
      );
      
      if (logoBase64) {
        const base64Data = logoBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
        rawLines.push({
          type: 'raw', 
          format: 'image', 
          flavor: 'base64', 
          data: base64Data, 
          options: { language: 'ESCPOS', dotDensity: 'double' }
        });
        // Add a line feed after the image
        rawLines.push('\n');
      }

      rawLines.push(
        '\x1B\x61\x01', // Ensure center align again just in case
        '\x1B\x45\x01', // Bold on
        `${companyName}\n`,
        '\x1B\x45\x00', // Bold off
      );

      if (data.companyDetails?.address) rawLines.push(`${data.companyDetails.address}\n`);
      if (data.companyDetails?.mobileNumber) rawLines.push(`Tel: ${data.companyDetails.mobileNumber}\n`);
      if (data.companyDetails?.email) rawLines.push(`${data.companyDetails.email}\n`);
      if (data.companyDetails?.website) rawLines.push(`${data.companyDetails.website}\n`);
      if (data.companyDetails?.crNumber) rawLines.push(`CR: ${data.companyDetails.crNumber}\n`);
      
      rawLines.push(
        '-'.repeat(48) + '\n',
        '\x1B\x61\x00', // Left align
        `Order / الطلب: ${data.orderNumber}\n`,
        `Date / التاريخ: ${data.date}\n`,
        `Payment / الدفع: ${data.paymentMethod.replace("POS_", "")}\n`,
        '-'.repeat(48) + '\n'
      );
      
      // Items
      data.items.forEach(item => {
        let nameLine = item.name;
        if (item.nameAr) nameLine += ` - ${item.nameAr}`;
        rawLines.push(`${nameLine}\n`);
        if (item.sku) rawLines.push(`SKU: ${item.sku}\n`);
        const qtyPrice = `Qty/الكمية: ${item.quantity} x OMR ${item.price.toFixed(2)}`;
        const total = `OMR ${(item.quantity * item.price * (1 - (item.discountPercent || 0) / 100)).toFixed(2)}`;
        // Pad to roughly 48 chars
        let padding = 48 - qtyPrice.length - total.length;
        if (padding < 1) padding = 1;
        rawLines.push(`${qtyPrice}${' '.repeat(padding)}${total}\n`);
      });
      
      rawLines.push(
        '-'.repeat(48) + '\n',
        '\x1B\x61\x02', // Right align
        `Subtotal / المجموع الفرعي: OMR ${data.subtotal.toFixed(2)}\n`,
        `Total / المجموع: OMR ${data.total.toFixed(2)}\n`
      );
      
      if (data.changeDue > 0) {
        rawLines.push(`Change Due / الباقي: OMR ${data.changeDue.toFixed(2)}\n`);
      }
      
      rawLines.push(
        '\x1B\x61\x01', // Center align
        '\nThank you for your purchase!\nشكرا لتسوقكم معنا\n',
        '\nPowered by Nexova\n',
        '\n\n\n\n\n\n', // Feed paper
        '\x1D\x56\x41\x10' // Full cut
      );

      if (data.companyDetails?.posPrinterName) {
        try {
          if (!qz.websocket.isActive()) {
            await qz.websocket.connect({ retries: 0 });
          }
          const config = qz.configs.create(data.companyDetails.posPrinterName, { encoding: 'windows-1256' });
          await qz.print(config, rawLines);
          return;
        } catch (e) {
          console.error("QZ raw print failed", e);
        }
      }
      return;
    }
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

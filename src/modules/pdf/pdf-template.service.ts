import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { DynamicPdfService } from './services/dynamic-pdf.service.js';

// Conversion: 1 mm in PDF points (72 pt / 25.4 mm)
const mm = (val: number): number => val * 2.834645669;

function formatNumber(num: number | string, decimals: number = 2): string {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0.00';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export class PdfTemplateService {
  /**
   * Draw standard Tisera Header (Red TD box, Company Info, Print Meta)
   */
  private static drawHeader(
    doc: PDFKit.PDFDocument,
    meta: {
      entity?: string;
      address?: string;
      phone?: string;
      printDate?: string;
      printBy?: string;
    } = {}
  ) {
    const entity = meta.entity || 'Head Office';
    const address = meta.address || 'Jl. Dr. Soepomo No. 23 Solo';
    const phone = meta.phone || 'Phone : 0271 - 714344 Fax : 0271 - 716874';
    const printDate = meta.printDate || new Date().toLocaleString('id-ID');
    const printBy = meta.printBy || 'iadijana';

    // 1. Red TD Logo box
    doc.save();
    doc.rect(mm(10), mm(10), mm(18), mm(16)).fill('#d21919');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(16);
    doc.text('TD', mm(10), mm(13), { width: mm(18), align: 'center' });
    doc.restore();

    // 2. Company Info Text
    doc.save();
    doc.fillColor('#000000');
    doc.font('Helvetica-Bold').fontSize(11).text('PT TISERA DISTRIBUSINDO', mm(31), mm(10));
    doc.font('Helvetica-Bold').fontSize(8.5).text(entity, mm(31), mm(14.5));
    doc.font('Helvetica').fontSize(7.5).text(address, mm(31), mm(18.5));
    doc.font('Helvetica').fontSize(7.5).text(phone, mm(31), mm(22));
    doc.restore();

    // 3. Top Right Print Meta
    doc.save();
    doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#000000');
    doc.text(printDate, mm(125), mm(10), { width: mm(75), align: 'right' });
    doc.text(`Print by : ${printBy}`, mm(125), mm(14), { width: mm(75), align: 'right' });
    doc.restore();

    // 4. Header bottom line
    doc.save();
    doc.lineWidth(1.5).strokeColor('#000000');
    doc.moveTo(mm(10), mm(28)).lineTo(mm(200), mm(28)).stroke();
    doc.restore();
  }

  /**
   * Draw table cell with border, background, and formatted text
   */
  private static drawCell(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    options: {
      font?: string;
      fontSize?: number;
      fillColor?: string;
      bgColor?: string;
      align?: 'left' | 'center' | 'right';
      border?: boolean;
      paddingX?: number;
      paddingY?: number;
      multiLine?: boolean;
    } = {}
  ) {
    const {
      font = 'Helvetica',
      fontSize = 7.5,
      fillColor = '#000000',
      bgColor,
      align = 'left',
      border = true,
      paddingX = 3,
      paddingY = 2.5,
    } = options;

    if (bgColor) {
      doc.save();
      doc.rect(x, y, w, h).fill(bgColor);
      doc.restore();
    }

    if (border) {
      doc.save();
      doc.rect(x, y, w, h).lineWidth(0.5).strokeColor('#000000').stroke();
      doc.restore();
    }

    if (text !== undefined && text !== null && text !== '') {
      doc.save();
      doc.font(font).fontSize(fontSize).fillColor(fillColor);
      doc.text(String(text), x + paddingX, y + paddingY, {
        width: w - paddingX * 2,
        align: align,
        lineBreak: options.multiLine !== false,
      });
      doc.restore();
    }
  }

  /**
   * Draw footer page numbers on all buffered pages
   */
  private static applyFooters(doc: PDFKit.PDFDocument) {
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.save();
      doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#787878');
      doc.text(
        `Approval Management System - Halaman ${i + 1} dari ${pages.count}`,
        mm(10),
        mm(287),
        { width: mm(190), align: 'right' }
      );
      doc.restore();
    }
  }

  /**
   * Generate Purchase Request (PR / RQE) PDF Buffer
   */
  public static async generatePR(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: mm(10),
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const entity = data.entity || 'Head Office';
      const printDate = data.print_date || data.tanggal || new Date().toLocaleString('id-ID');

      // Page 1 Header
      PdfTemplateService.drawHeader(doc, {
        entity,
        printDate,
        printBy: 'iadijana',
      });

      // Title
      doc.save();
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#000000');
      doc.text('PURCHASE REQUEST', mm(10), mm(32), { width: mm(190), align: 'center' });
      doc.restore();

      // Meta Info (2 Columns)
      const startX = mm(10);
      const rightX = mm(115);
      const metaY = mm(40);

      doc.save();
      doc.font('Helvetica').fontSize(8.5).fillColor('#000000');

      // Left column
      doc.text('Request No.', startX, metaY, { width: mm(25) });
      doc.text(':', startX + mm(25), metaY);
      doc.font('Helvetica-Bold').text(data.nomor_dokumen || data.kode || '', startX + mm(30), metaY);

      doc.font('Helvetica').text('Tanggal', startX, metaY + mm(4.5), { width: mm(25) });
      doc.text(':', startX + mm(25), metaY + mm(4.5));
      doc.text(data.tanggal || '', startX + mm(30), metaY + mm(4.5));

      doc.text('No. Referensi', startX, metaY + mm(9), { width: mm(25) });
      doc.text(':', startX + mm(25), metaY + mm(9));
      doc.text(data.no_ref || '-', startX + mm(30), metaY + mm(9));

      // Right column
      doc.text('Gudang', rightX, metaY, { width: mm(30) });
      doc.text(':', rightX + mm(30), metaY);
      doc.text(data.gudang || 'MDC SOLO TD', rightX + mm(35), metaY);

      doc.text('Entity Gudang', rightX, metaY + mm(4.5), { width: mm(30) });
      doc.text(':', rightX + mm(30), metaY + mm(4.5));
      doc.text(entity, rightX + mm(35), metaY + mm(4.5));

      doc.text('Jadwal Kedatangan', rightX, metaY + mm(9), { width: mm(30) });
      doc.text(':', rightX + mm(30), metaY + mm(9));
      doc.text(data.del_date || data.tanggal || '-', rightX + mm(35), metaY + mm(9));

      // Notice line
      doc.text('Mohon untuk dibeli barang-barang sebagai berikut :', startX, metaY + mm(16));
      doc.restore();

      // Items Table Header
      let currentY = metaY + mm(22);

      const drawPrTableHeader = (y: number) => {
        PdfTemplateService.drawCell(doc, mm(10), y, mm(10), mm(6), 'No', {
          font: 'Helvetica-Bold',
          fontSize: 8,
          bgColor: '#f0f0f0',
          align: 'center',
        });
        PdfTemplateService.drawCell(doc, mm(20), y, mm(25), mm(6), 'Kode', {
          font: 'Helvetica-Bold',
          fontSize: 8,
          bgColor: '#f0f0f0',
          align: 'center',
        });
        PdfTemplateService.drawCell(doc, mm(45), y, mm(85), mm(6), 'Nama', {
          font: 'Helvetica-Bold',
          fontSize: 8,
          bgColor: '#f0f0f0',
          align: 'center',
        });
        PdfTemplateService.drawCell(doc, mm(130), y, mm(16), mm(6), 'Satuan', {
          font: 'Helvetica-Bold',
          fontSize: 8,
          bgColor: '#f0f0f0',
          align: 'center',
        });
        PdfTemplateService.drawCell(doc, mm(146), y, mm(14), mm(6), 'Qty', {
          font: 'Helvetica-Bold',
          fontSize: 8,
          bgColor: '#f0f0f0',
          align: 'center',
        });
        PdfTemplateService.drawCell(doc, mm(160), y, mm(40), mm(6), 'Keterangan', {
          font: 'Helvetica-Bold',
          fontSize: 8,
          bgColor: '#f0f0f0',
          align: 'center',
        });
      };

      drawPrTableHeader(currentY);
      currentY += mm(6);

      // Table Rows
      const items = data.items || [];
      let totalQty = 0;

      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const nama = item.nama || item.name || '';
        const ket = item.keterangan || item.description || '';
        const qty = Number(item.qty || item.quantity || 1);
        totalQty += qty;

        const rowHeight = (nama.length > 55 || ket.length > 28) ? mm(11) : mm(8);

        // Check page break
        if (currentY + rowHeight > mm(255)) {
          doc.addPage({ size: 'A4', margin: mm(10) });
          PdfTemplateService.drawHeader(doc, { entity, printDate, printBy: 'iadijana' });
          currentY = mm(35);
          drawPrTableHeader(currentY);
          currentY += mm(6);
        }

        PdfTemplateService.drawCell(doc, mm(10), currentY, mm(10), rowHeight, String(idx + 1), { align: 'center' });
        PdfTemplateService.drawCell(doc, mm(20), currentY, mm(25), rowHeight, item.kode || item.code || '', { align: 'center' });
        PdfTemplateService.drawCell(doc, mm(45), currentY, mm(85), rowHeight, nama, { align: 'left' });
        PdfTemplateService.drawCell(doc, mm(130), currentY, mm(16), rowHeight, item.satuan || item.unit || 'Unit', { align: 'center' });
        PdfTemplateService.drawCell(doc, mm(146), currentY, mm(14), rowHeight, String(qty), { align: 'center' });
        PdfTemplateService.drawCell(doc, mm(160), currentY, mm(40), rowHeight, ket, { align: 'left' });

        currentY += rowHeight;
      }

      // Total Row
      if (currentY + mm(8) > mm(260)) {
        doc.addPage({ size: 'A4', margin: mm(10) });
        PdfTemplateService.drawHeader(doc, { entity, printDate, printBy: 'iadijana' });
        currentY = mm(35);
      }

      doc.save();
      doc.font('Helvetica-Bold').fontSize(8);
      doc.text('TOTAL', mm(10), currentY + mm(2), { width: mm(133), align: 'right' });
      // top line on Qty cell
      doc.lineWidth(0.5).strokeColor('#000000');
      doc.moveTo(mm(146), currentY).lineTo(mm(160), currentY).stroke();
      doc.text(formatNumber(totalQty, 2), mm(146), currentY + mm(2), { width: mm(14), align: 'center' });
      doc.restore();

      currentY += mm(10);

      // Check height for Footer Boxes (needs 45mm)
      if (currentY + mm(45) > mm(270)) {
        doc.addPage({ size: 'A4', margin: mm(10) });
        PdfTemplateService.drawHeader(doc, { entity, printDate, printBy: 'iadijana' });
        currentY = mm(35);
      }

      const boxY = currentY;

      // Footer Signature Box (Left)
      doc.save();
      doc.rect(mm(10), boxY, mm(62), mm(38)).lineWidth(0.5).strokeColor('#000000').stroke();
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000');
      doc.text('APPROVED BY', mm(10), boxY + mm(2), { width: mm(62), align: 'center' });
      doc.fontSize(13).text('APPROVED', mm(10), boxY + mm(7), { width: mm(62), align: 'center' });

      doc.font('Helvetica').fontSize(8);
      // Approver 1 with underline
      doc.text(data.approver1 || 'AGM', mm(14), boxY + mm(16), { width: mm(54), align: 'center' });
      doc.moveTo(mm(18), boxY + mm(20.5)).lineTo(mm(64), boxY + mm(20.5)).lineWidth(0.5).stroke();

      // Approver 2 with underline
      doc.text(data.approver2 || 'M.M', mm(14), boxY + mm(22), { width: mm(54), align: 'center' });
      doc.moveTo(mm(18), boxY + mm(26.5)).lineTo(mm(64), boxY + mm(26.5)).lineWidth(0.5).stroke();

      // App Date
      doc.text(data.app_date || new Date().toLocaleDateString('id-ID'), mm(14), boxY + mm(28), { width: mm(54), align: 'center' });
      doc.restore();

      // Distribution Box (Right)
      doc.save();
      doc.rect(mm(95), boxY, mm(95), mm(38)).lineWidth(0.5).strokeColor('#000000').stroke();
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000');
      doc.text('Distribusi', mm(100), boxY + mm(4), { width: mm(90) });

      doc.font('Helvetica').fontSize(8);
      const distRows = [
        ['Asli', 'Purchasing'],
        ['Merah', 'Accounting'],
        ['Kuning', 'File'],
      ];
      let distY = boxY + mm(9);
      distRows.forEach(([color, dept]) => {
        doc.text(color, mm(100), distY, { width: mm(25) });
        doc.text(':', mm(125), distY);
        doc.text(dept, mm(130), distY, { width: mm(55) });
        distY += mm(5);
      });
      doc.restore();

      // Apply page numbers to all pages
      PdfTemplateService.applyFooters(doc);
      doc.end();
    });
  }

  /**
   * Generate Purchase Order (PO / POE) PDF Buffer
   */
  public static async generatePO(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: mm(10),
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const printDate = data.print_date || data.tanggal || new Date().toLocaleString('id-ID');

      // Page 1 Header
      PdfTemplateService.drawHeader(doc, {
        entity: 'Head Office',
        address: 'Jl. Dr. Soepomo No. 23 Solo',
        phone: 'Phone : 0271 - 714344 Fax : 0271 - 716874',
        printDate,
        printBy: 'iadijana',
      });

      // Title
      doc.save();
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#000000');
      doc.text('PURCHASE ORDER', mm(10), mm(32), { width: mm(190), align: 'center' });
      doc.restore();

      // Vendor & PO Info Section
      const infoY = mm(40);
      doc.save();
      // Left side: TO Vendor
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000');
      doc.text('TO :', mm(10), infoY);
      doc.text(data.vendor || 'MEDIA KARYA PUTRA. CV', mm(10), infoY + mm(4.5), { width: mm(95) });
      doc.font('Helvetica').fontSize(8);
      doc.text(`Telp: ${data.phone || '-'}    Fax: -`, mm(10), infoY + mm(9));

      // Right side: PO Details
      const rightX = mm(120);
      doc.font('Helvetica').fontSize(8);
      doc.text('PO No.', rightX, infoY, { width: mm(25) });
      doc.text(':', rightX + mm(25), infoY);
      doc.font('Helvetica-Bold').text(data.nomor_dokumen || data.kode || '', rightX + mm(30), infoY);

      doc.font('Helvetica').text('Date', rightX, infoY + mm(4.5), { width: mm(25) });
      doc.text(':', rightX + mm(25), infoY + mm(4.5));
      doc.text(data.tanggal || '', rightX + mm(30), infoY + mm(4.5));

      doc.text('No. Ref.', rightX, infoY + mm(9), { width: mm(25) });
      doc.text(':', rightX + mm(25), infoY + mm(9));
      doc.text(data.ref_no || '-', rightX + mm(30), infoY + mm(9));

      doc.text('Currency', rightX, infoY + mm(13.5), { width: mm(25) });
      doc.text(':', rightX + mm(25), infoY + mm(13.5));
      doc.text('IDR', rightX + mm(30), infoY + mm(13.5));

      // Deliver To & Notes
      doc.text('Deliver To', mm(10), infoY + mm(16.5), { width: mm(25) });
      doc.text(':', mm(35), infoY + mm(16.5));
      doc.font('Helvetica-Bold').text(data.deliver_to || 'MDC SOLO TD', mm(40), infoY + mm(16.5), { width: mm(150) });

      doc.font('Helvetica').text('Notes', mm(10), infoY + mm(21), { width: mm(25) });
      doc.text(':', mm(35), infoY + mm(21));
      doc.text(data.notes || '-', mm(40), infoY + mm(21), { width: mm(150) });
      doc.restore();

      // Items Table Header
      let currentY = infoY + mm(27);

      const drawPoTableHeader = (y: number) => {
        PdfTemplateService.drawCell(doc, mm(10), y, mm(8), mm(6), 'No', {
          font: 'Helvetica-Bold',
          fontSize: 7.5,
          bgColor: '#f0f0f0',
          align: 'center',
        });
        PdfTemplateService.drawCell(doc, mm(18), y, mm(24), mm(6), 'Delivery Date', {
          font: 'Helvetica-Bold',
          fontSize: 7.5,
          bgColor: '#f0f0f0',
          align: 'center',
        });
        PdfTemplateService.drawCell(doc, mm(42), y, mm(78), mm(6), 'Item Name', {
          font: 'Helvetica-Bold',
          fontSize: 7.5,
          bgColor: '#f0f0f0',
          align: 'center',
        });
        PdfTemplateService.drawCell(doc, mm(120), y, mm(14), mm(6), 'Unit', {
          font: 'Helvetica-Bold',
          fontSize: 7.5,
          bgColor: '#f0f0f0',
          align: 'center',
        });
        PdfTemplateService.drawCell(doc, mm(134), y, mm(16), mm(6), 'Quantity', {
          font: 'Helvetica-Bold',
          fontSize: 7.5,
          bgColor: '#f0f0f0',
          align: 'center',
        });
        PdfTemplateService.drawCell(doc, mm(150), y, mm(25), mm(6), 'Unit Price', {
          font: 'Helvetica-Bold',
          fontSize: 7.5,
          bgColor: '#f0f0f0',
          align: 'center',
        });
        PdfTemplateService.drawCell(doc, mm(175), y, mm(25), mm(6), 'Amount', {
          font: 'Helvetica-Bold',
          fontSize: 7.5,
          bgColor: '#f0f0f0',
          align: 'center',
        });
      };

      drawPoTableHeader(currentY);
      currentY += mm(6);

      // Table Rows
      const items = data.items || [];
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const name = item.name || item.nama || '';
        const qty = Number(item.qty || item.quantity || 0);
        const price = Number(item.price || item.unitPrice || 0);
        const amount = Number(item.amount || (qty * price));
        const delDate = item.delDate || data.tanggal || '';
        const unit = item.unit || item.satuan || 'EXP';

        const rowHeight = name.length > 48 ? mm(11) : mm(7);

        // Check page break
        if (currentY + rowHeight > mm(255)) {
          doc.addPage({ size: 'A4', margin: mm(10) });
          PdfTemplateService.drawHeader(doc, { printDate });
          currentY = mm(35);
          drawPoTableHeader(currentY);
          currentY += mm(6);
        }

        PdfTemplateService.drawCell(doc, mm(10), currentY, mm(8), rowHeight, String(idx + 1), { align: 'center' });
        PdfTemplateService.drawCell(doc, mm(18), currentY, mm(24), rowHeight, delDate, { align: 'center' });
        PdfTemplateService.drawCell(doc, mm(42), currentY, mm(78), rowHeight, name, { align: 'left' });
        PdfTemplateService.drawCell(doc, mm(120), currentY, mm(14), rowHeight, unit, { align: 'center' });
        PdfTemplateService.drawCell(doc, mm(134), currentY, mm(16), rowHeight, formatNumber(qty, 0), { align: 'center' });
        PdfTemplateService.drawCell(doc, mm(150), currentY, mm(25), rowHeight, formatNumber(price, 2), { align: 'right' });
        PdfTemplateService.drawCell(doc, mm(175), currentY, mm(25), rowHeight, formatNumber(amount, 2), { align: 'right' });

        currentY += rowHeight;
      }

      currentY += mm(3);

      // Check space for Totals & Signatures (needs 48mm)
      if (currentY + mm(48) > mm(270)) {
        doc.addPage({ size: 'A4', margin: mm(10) });
        PdfTemplateService.drawHeader(doc, { printDate });
        currentY = mm(35);
      }

      const calcY = currentY;
      const totals = data.totals || {
        subtotal: data.nominal || 0,
        discount: 0,
        dppLainnya: Math.round((data.nominal || 0) * 0.917),
        ppn: 0,
        transport: 0,
        total: data.nominal || 0,
      };

      // Financial Totals Table (Right)
      const finance: [string, number][] = [
        ['Sub Total', totals.subtotal || 0],
        ['Discount', totals.discount || 0],
        ['DPPLainnya', totals.dppLainnya || 0],
        ['PPN', totals.ppn || 0],
        ['Transport', totals.transport || 0],
        ['TOTAL', totals.total || 0],
      ];

      let fY = calcY;
      finance.forEach(([label, val]) => {
        doc.save();
        if (label === 'TOTAL') {
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000');
          // top border
          doc.moveTo(mm(115), fY).lineTo(mm(190), fY).lineWidth(0.5).stroke();
          doc.text(label, mm(115), fY + mm(1), { width: mm(45), align: 'left' });
          doc.text(formatNumber(val, 2), mm(160), fY + mm(1), { width: mm(30), align: 'right' });
          fY += mm(5.5);
        } else {
          doc.font('Helvetica').fontSize(8).fillColor('#000000');
          doc.text(label, mm(115), fY, { width: mm(45), align: 'left' });
          doc.text(formatNumber(val, 2), mm(160), fY, { width: mm(30), align: 'right' });
          fY += mm(4.2);
        }
        doc.restore();
      });

      // Signature Box (Left)
      const approvers = data.approvers || ['NNR', 'P.A.M.'];
      const appDate = data.app_date || data.tanggal || new Date().toLocaleDateString('id-ID');

      doc.save();
      doc.rect(mm(10), calcY, mm(62), mm(38)).lineWidth(0.5).strokeColor('#000000').stroke();
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000');
      doc.text('APPROVED BY', mm(10), calcY + mm(2), { width: mm(62), align: 'center' });
      doc.fontSize(13).text('APPROVED', mm(10), calcY + mm(7), { width: mm(62), align: 'center' });

      doc.font('Helvetica').fontSize(8);
      doc.text(approvers[0] || 'NNR', mm(14), calcY + mm(16), { width: mm(54), align: 'center' });
      doc.moveTo(mm(18), calcY + mm(20.5)).lineTo(mm(64), calcY + mm(20.5)).lineWidth(0.5).stroke();

      doc.text(approvers[1] || 'P.A.M.', mm(14), calcY + mm(22), { width: mm(54), align: 'center' });
      doc.moveTo(mm(18), calcY + mm(26.5)).lineTo(mm(64), calcY + mm(26.5)).lineWidth(0.5).stroke();

      doc.text(appDate, mm(14), calcY + mm(28), { width: mm(54), align: 'center' });
      doc.restore();

      // Footers
      PdfTemplateService.applyFooters(doc);
      doc.end();
    });
  }

  /**
   * Generate Calculation NPK (CCA) Template
   */
  public static async generateNPK(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: mm(10),
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const entity = data.entity || 'Head Office';
      const printDate = data.date_formatted || data.tanggal || new Date().toLocaleString('id-ID');

      // Page 1 Header
      PdfTemplateService.drawHeader(doc, {
        entity,
        address: 'Jl. Bau Massepe No.75 Sumpang Minange, Kec. Bacukiki Barat',
        phone: 'Phone : 0421 - 24904 Fax : 0421 - 24904',
        printDate,
        printBy: 'klick',
      });

      // Title
      doc.save();
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000');
      doc.text('CALCULATION BUSINESS PRODUCT CUSTOM', mm(10), mm(32), { width: mm(190), align: 'center' });
      doc.restore();

      // Meta Info (2 Columns)
      const metaY = mm(40);
      doc.save();
      doc.font('Helvetica').fontSize(8).fillColor('#000000');

      // Left
      doc.text('NPK', mm(10), metaY, { width: mm(25) });
      doc.text(':', mm(35), metaY);
      doc.font('Helvetica-Bold').text(data.nomor_dokumen || data.kode || '', mm(40), metaY);

      doc.font('Helvetica').text('Entity Name', mm(10), metaY + mm(4.5), { width: mm(25) });
      doc.text(':', mm(35), metaY + mm(4.5));
      doc.text(entity, mm(40), metaY + mm(4.5));

      doc.text('Customer Name', mm(10), metaY + mm(9), { width: mm(25) });
      doc.text(':', mm(35), metaY + mm(9));
      doc.text(data.customer || 'SD NEGERI 22 MURANTE', mm(40), metaY + mm(9));

      doc.text('Suplier Name', mm(10), metaY + mm(13.5), { width: mm(25) });
      doc.text(':', mm(35), metaY + mm(13.5));
      doc.text(data.supplier || 'UD Kembang Jati', mm(40), metaY + mm(13.5));

      // Right
      const rightX = mm(120);
      doc.text('Date', rightX, metaY, { width: mm(25) });
      doc.text(':', rightX + mm(25), metaY);
      doc.text(printDate, rightX + mm(30), metaY);

      doc.text('Category', rightX, metaY + mm(4.5), { width: mm(25) });
      doc.text(':', rightX + mm(25), metaY + mm(4.5));
      doc.text('Non Book', rightX + mm(30), metaY + mm(4.5));

      doc.text('PKP', rightX, metaY + mm(9), { width: mm(25) });
      doc.text(':', rightX + mm(25), metaY + mm(9));
      doc.text('True', rightX + mm(30), metaY + mm(9));

      doc.text('Status', rightX, metaY + mm(13.5), { width: mm(25) });
      doc.text(':', rightX + mm(25), metaY + mm(13.5));
      doc.font('Helvetica-Bold').text('Clear', rightX + mm(30), metaY + mm(13.5));
      doc.restore();

      // Items Table Header
      let currentY = metaY + mm(20);

      const drawNpkTableHeader = (y: number) => {
        PdfTemplateService.drawCell(doc, mm(10), y, mm(8), mm(6), 'No', {
          font: 'Helvetica-Bold',
          fontSize: 7.5,
          bgColor: '#f0f0f0',
          align: 'center',
        });
        PdfTemplateService.drawCell(doc, mm(18), y, mm(72), mm(6), 'Nama Produk', {
          font: 'Helvetica-Bold',
          fontSize: 7.5,
          bgColor: '#f0f0f0',
          align: 'center',
        });
        PdfTemplateService.drawCell(doc, mm(90), y, mm(12), mm(6), 'Unit', {
          font: 'Helvetica-Bold',
          fontSize: 7.5,
          bgColor: '#f0f0f0',
          align: 'center',
        });
        PdfTemplateService.drawCell(doc, mm(102), y, mm(25), mm(6), 'Harga Kulak', {
          font: 'Helvetica-Bold',
          fontSize: 7.5,
          bgColor: '#f0f0f0',
          align: 'center',
        });
        PdfTemplateService.drawCell(doc, mm(127), y, mm(25), mm(6), 'Harga Jual', {
          font: 'Helvetica-Bold',
          fontSize: 7.5,
          bgColor: '#f0f0f0',
          align: 'center',
        });
        PdfTemplateService.drawCell(doc, mm(152), y, mm(18), mm(6), 'Disc (%)', {
          font: 'Helvetica-Bold',
          fontSize: 7.5,
          bgColor: '#f0f0f0',
          align: 'center',
        });
        PdfTemplateService.drawCell(doc, mm(170), y, mm(30), mm(6), 'Jumlah Jual', {
          font: 'Helvetica-Bold',
          fontSize: 7.5,
          bgColor: '#f0f0f0',
          align: 'center',
        });
      };

      drawNpkTableHeader(currentY);
      currentY += mm(6);

      // Table Rows
      const items = data.items || [];
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const name = item.name || item.nama || '';
        const rowHeight = name.length > 42 ? mm(11) : mm(7);

        // Check page break
        if (currentY + rowHeight > mm(255)) {
          doc.addPage({ size: 'A4', margin: mm(10) });
          PdfTemplateService.drawHeader(doc, { printDate });
          currentY = mm(35);
          drawNpkTableHeader(currentY);
          currentY += mm(6);
        }

        PdfTemplateService.drawCell(doc, mm(10), currentY, mm(8), rowHeight, String(idx + 1), { align: 'center' });
        PdfTemplateService.drawCell(doc, mm(18), currentY, mm(72), rowHeight, name, { align: 'left' });
        PdfTemplateService.drawCell(doc, mm(90), currentY, mm(12), rowHeight, String(item.unit || 1), { align: 'center' });
        PdfTemplateService.drawCell(doc, mm(102), currentY, mm(25), rowHeight, formatNumber(item.kulak || 0, 2), { align: 'right' });
        PdfTemplateService.drawCell(doc, mm(127), currentY, mm(25), rowHeight, formatNumber(item.jual || 0, 2), { align: 'right' });
        PdfTemplateService.drawCell(doc, mm(152), currentY, mm(18), rowHeight, formatNumber(item.disc || 0, 2), { align: 'center' });
        PdfTemplateService.drawCell(doc, mm(170), currentY, mm(30), rowHeight, formatNumber(item.total || 0, 2), { align: 'right' });

        currentY += rowHeight;
      }

      currentY += mm(3);

      // Check space for Remarks & Calc Grid (needs 55mm)
      if (currentY + mm(55) > mm(270)) {
        doc.addPage({ size: 'A4', margin: mm(10) });
        PdfTemplateService.drawHeader(doc, { printDate });
        currentY = mm(35);
      }

      const bottomY = currentY;

      // Remarks (Left)
      const remarks = data.remarks || {
        BO: 'Mohon pengajuan ini dapat diproses',
        AM: '# Pengajuan disetujui # Tidak ada harga standar baku # GP : 21,74%',
        NSM: 'Disetujui, Harap dipastikan Spek sesuai pesanan dan pembayaran Lunas',
        Akt: 'Approved, dipastikan faktur pajak pembelian karena PKP, dan pembayaran aman',
      };

      let currentRemY = bottomY;
      for (const [type, text] of Object.entries(remarks)) {
        PdfTemplateService.drawCell(doc, mm(10), currentRemY, mm(22), mm(5), `Remark ${type}`, {
          font: 'Helvetica-Bold',
          fontSize: 7.5,
        });
        PdfTemplateService.drawCell(doc, mm(32), currentRemY, mm(95), mm(5), ` ${text}`, {
          font: 'Helvetica',
          fontSize: 7,
        });
        currentRemY += mm(5);
      }

      // Financial Calculation Grid (Right)
      const calc = data.calc || {
        bruto: data.nominal || 0,
        dpp: Math.round((data.nominal || 0) * 0.9),
        dppLainnya: Math.round((data.nominal || 0) * 0.82),
        ppn: Math.round((data.nominal || 0) * 0.1),
        pph: Math.round((data.nominal || 0) * 0.015),
        disc: 0,
        netto: Math.round((data.nominal || 0) * 0.95),
        cogs: Math.round((data.nominal || 0) * 0.7),
        gp: Math.round((data.nominal || 0) * 0.2),
      };

      const calcRows: [string, string, number | string][] = [
        ['Bruto', '', calc.bruto ?? 0],
        ['DPP', '', calc.dpp ?? 0],
        ['DPP Nilai Lainnya', '', calc.dppLainnya ?? 0],
        ['PPN', '11.00', calc.ppn ?? 0],
        ['PPH', '1.50', calc.pph ?? 0],
        ['Disc', '4.92', calc.disc ?? 0],
        ['Affiliate', '0.00', '0.00'],
        ['Netto', '95.07', calc.netto ?? 0],
        ['COGS', '73.33', calc.cogs ?? 0],
        ['GP', '21.74', calc.gp ?? 0],
      ];

      let calcY = bottomY;
      for (const [col1, col2, col3] of calcRows) {
        PdfTemplateService.drawCell(doc, mm(130), calcY, mm(28), mm(4.5), col1, {
          fontSize: 7.5,
          align: 'left',
        });
        PdfTemplateService.drawCell(doc, mm(158), calcY, mm(12), mm(4.5), col2, {
          fontSize: 7.5,
          align: 'center',
        });
        const valFormatted = typeof col3 === 'number' ? formatNumber(col3, 2) : String(col3);
        PdfTemplateService.drawCell(doc, mm(170), calcY, mm(30), mm(4.5), valFormatted, {
          fontSize: 7.5,
          align: 'right',
        });
        calcY += mm(4.5);
      }

      // Footers
      PdfTemplateService.applyFooters(doc);
      doc.end();
    });
  }

  /**
   * Central Dispatcher to generate PDF from arbitrary transaction JSON data
   * Tries dynamic template engine first (PRD compliant), then falls back to procedural drawing
   */
  public static async generate(data: any): Promise<Buffer> {
    try {
      const dynamicRes = await DynamicPdfService.generate({ data });
      if (dynamicRes && dynamicRes.buffer) {
        return dynamicRes.buffer;
      }
    } catch (err: any) {
      console.warn(`[PdfTemplateService] Dynamic template rendering fallback to procedural: ${err.message}`);
    }

    const tipe = String(data?.tipe || '').toUpperCase();
    const kode = String(data?.kode || data?.nomor_dokumen || data?.document_number || '').toUpperCase();

    if (tipe === 'PR' || kode.startsWith('RQE') || kode.startsWith('PR')) {
      return this.generatePR(data);
    }

    if (tipe === 'PO' || kode.startsWith('POE') || kode.startsWith('PO')) {
      return this.generatePO(data);
    }

    // Default to NPK / CCA
    return this.generateNPK(data);
  }

  /**
   * Generate PDF directly to a file on disk
   */
  public static async generateToFile(data: any, targetFilePath: string): Promise<string> {
    const dir = path.dirname(targetFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const buffer = await this.generate(data);
    await fs.promises.writeFile(targetFilePath, buffer);
    return targetFilePath;
  }
}

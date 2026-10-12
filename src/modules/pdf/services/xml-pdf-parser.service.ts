import PDFDocument from 'pdfkit';
import xml2js from 'xml2js';
import fs from 'fs';

export interface ParseOptions {
  defaultUnit?: 'pt' | 'mm';
}

export class XmlPdfParserService {
  private static MM_TO_PT = 2.834645669;

  /**
   * Convert unit to points (PDF standard unit)
   */
  public static toPoints(
    val: number | string | undefined | null,
    defaultUnit: 'pt' | 'mm' = 'pt'
  ): number {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') {
      return defaultUnit === 'mm' ? val * this.MM_TO_PT : val;
    }

    const str = String(val).trim().toLowerCase();
    if (str.endsWith('mm')) {
      const num = parseFloat(str.replace('mm', ''));
      return isNaN(num) ? 0 : num * this.MM_TO_PT;
    }
    if (str.endsWith('pt') || str.endsWith('px')) {
      const num = parseFloat(str.replace(/(pt|px)/, ''));
      return isNaN(num) ? 0 : num;
    }

    const num = parseFloat(str);
    if (isNaN(num)) return 0;
    return defaultUnit === 'mm' ? num * this.MM_TO_PT : num;
  }

  /**
   * Parse bound XML string into AST and render via PDFKit
   * Implements PRD Section 5.3 & 7 (XML AST Parser to PDFKit)
   */
  public static async parseAndRender(
    xmlString: string,
    options: ParseOptions = {}
  ): Promise<Buffer> {
    if (!xmlString || typeof xmlString !== 'string') {
      throw new Error('XML string tidak boleh kosong');
    }

    // 1. Parse XML to AST with preserved children order
    const parser = new xml2js.Parser({
      explicitArray: true,
      explicitChildren: true,
      preserveChildrenOrder: true,
      trim: true,
      explicitRoot: true,
    });

    let result: any;
    try {
      result = await parser.parseStringPromise(xmlString);
    } catch (err: any) {
      throw new Error(`XML Syntax Parser Error: ${err.message}`);
    }

    const docNode = result?.document || result?.DOCUMENT;
    if (!docNode) {
      throw new Error('Root tag <document> tidak ditemukan dalam XML template');
    }

    // 2. Document-level options
    const docAttrs = docNode.$ || {};
    const defaultUnit: 'pt' | 'mm' =
      (docAttrs.unit || options.defaultUnit || 'pt').toLowerCase() === 'mm' ? 'mm' : 'pt';

    const pageSize = docAttrs.size || 'A4';
    const pageLayout = (docAttrs.orientation || docAttrs.layout || 'portrait').toLowerCase() as
      | 'portrait'
      | 'landscape';

    const defaultMargin = docAttrs.margin
      ? this.toPoints(docAttrs.margin, defaultUnit)
      : this.toPoints(28.3, 'pt'); // ~10mm default

    const margins = {
      top: docAttrs.marginTop ? this.toPoints(docAttrs.marginTop, defaultUnit) : defaultMargin,
      bottom: docAttrs.marginBottom ? this.toPoints(docAttrs.marginBottom, defaultUnit) : defaultMargin,
      left: docAttrs.marginLeft ? this.toPoints(docAttrs.marginLeft, defaultUnit) : defaultMargin,
      right: docAttrs.marginRight ? this.toPoints(docAttrs.marginRight, defaultUnit) : defaultMargin,
    };

    const doc = new PDFDocument({
      size: pageSize,
      layout: pageLayout,
      margins,
      bufferPages: true,
      info: {
        Title: docAttrs.title || 'Dynamic Document Slip',
        Author: docAttrs.author || 'Approval Management System',
        Subject: docAttrs.subject || 'Generated Dynamic PDF',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));

    const renderPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // 3. Process children
    const docChildren = docNode.$$ || [];
    const pageNodes = docChildren.filter(
      (c: any) => c['#name'] === 'page' || c['#name'] === 'PAGE'
    );

    if (pageNodes.length > 0) {
      // Document has explicit <page> tags
      for (let i = 0; i < pageNodes.length; i++) {
        const pageNode = pageNodes[i];
        if (i > 0) {
          const pageAttrs = pageNode.$ || {};
          const pageMargin = pageAttrs.margin
            ? this.toPoints(pageAttrs.margin, defaultUnit)
            : defaultMargin;
          doc.addPage({
            size: pageAttrs.size || pageSize,
            layout: ((pageAttrs.orientation || pageAttrs.layout || pageLayout).toLowerCase() === 'landscape' ? 'landscape' : 'portrait') as 'portrait' | 'landscape',
            margins: {
              top: pageAttrs.marginTop ? this.toPoints(pageAttrs.marginTop, defaultUnit) : pageMargin,
              bottom: pageAttrs.marginBottom ? this.toPoints(pageAttrs.marginBottom, defaultUnit) : pageMargin,
              left: pageAttrs.marginLeft ? this.toPoints(pageAttrs.marginLeft, defaultUnit) : pageMargin,
              right: pageAttrs.marginRight ? this.toPoints(pageAttrs.marginRight, defaultUnit) : pageMargin,
            },
          });
        }
        await this.renderElements(doc, pageNode.$$ || [], defaultUnit);
      }
    } else {
      // Document has elements directly under <document>
      await this.renderElements(doc, docChildren, defaultUnit);
    }

    // 4. Apply footer page numbering if buffered
    this.applyGlobalFooters(doc);

    // Finalize PDFKit document
    doc.end();

    return renderPromise;
  }

  /**
   * Render an array of AST elements sequentially to PDFKit
   */
  private static async renderElements(
    doc: PDFKit.PDFDocument,
    elements: any[],
    unit: 'pt' | 'mm'
  ): Promise<void> {
    for (const el of elements) {
      const tagName = (el['#name'] || '').toLowerCase();
      const attrs = el.$ || {};
      const textContent = el._ !== undefined ? String(el._) : attrs.value;

      switch (tagName) {
        case 'text':
          this.renderText(doc, attrs, textContent, unit);
          break;

        case 'rect':
          this.renderRect(doc, attrs, unit);
          break;

        case 'line':
          this.renderLine(doc, attrs, unit);
          break;

        case 'circle':
          this.renderCircle(doc, attrs, unit);
          break;

        case 'table':
          await this.renderTable(doc, el, unit);
          break;

        case 'image':
          this.renderImage(doc, attrs, unit);
          break;

        case 'hr':
          this.renderHr(doc, attrs, unit);
          break;

        case 'barcode':
        case 'qrcode':
          this.renderBarcodePlaceholder(doc, attrs, textContent, unit);
          break;

        default:
          // Ignore comment or unknown tag
          break;
      }
    }
  }

  /**
   * Render <text> tag
   */
  private static renderText(
    doc: PDFKit.PDFDocument,
    attrs: any,
    content: string | undefined,
    unit: 'pt' | 'mm'
  ): void {
    if (content === undefined || content === null) return;

    const x = this.toPoints(attrs.x, unit);
    const y = this.toPoints(attrs.y, unit);
    const font = attrs.font || 'Helvetica';
    const fontSize = attrs.size || attrs.fontSize ? parseFloat(attrs.size || attrs.fontSize) : 10;
    const color = attrs.color || attrs.fillColor || '#000000';
    const align = (attrs.align || 'left').toLowerCase() as 'left' | 'center' | 'right' | 'justify';
    const width = attrs.width || attrs.w ? this.toPoints(attrs.width || attrs.w, unit) : undefined;
    const height = attrs.height || attrs.h ? this.toPoints(attrs.height || attrs.h, unit) : undefined;
    const lineGap = attrs.lineGap ? parseFloat(attrs.lineGap) : undefined;
    const lineBreak = attrs.lineBreak !== 'false' && attrs.lineBreak !== false;
    const underline = attrs.underline === 'true' || attrs.underline === true;
    const strike = attrs.strike === 'true' || attrs.strike === true;

    doc.save();
    try {
      doc.font(font);
    } catch {
      doc.font('Helvetica');
    }
    doc.fontSize(fontSize);
    doc.fillColor(color);

    const textOptions: PDFKit.Mixins.TextOptions = {
      align,
      lineBreak,
      underline,
      strike,
    };
    if (width !== undefined) textOptions.width = width;
    if (height !== undefined) textOptions.height = height;
    if (lineGap !== undefined) textOptions.lineGap = lineGap;

    doc.text(String(content), x, y, textOptions);
    doc.restore();
  }

  /**
   * Render <rect> tag
   */
  private static renderRect(doc: PDFKit.PDFDocument, attrs: any, unit: 'pt' | 'mm'): void {
    const x = this.toPoints(attrs.x, unit);
    const y = this.toPoints(attrs.y, unit);
    const width = this.toPoints(attrs.width || attrs.w || 100, unit);
    const height = this.toPoints(attrs.height || attrs.h || 20, unit);
    const fill = attrs.fill || attrs.fillColor;
    const stroke =
      attrs.stroke || attrs.strokeColor || (attrs.border === 'true' || attrs.border === true ? '#000000' : undefined);
    const lineWidth = attrs.lineWidth ? parseFloat(attrs.lineWidth) : 0.5;
    const radius = attrs.radius || attrs.borderRadius ? this.toPoints(attrs.radius || attrs.borderRadius, unit) : 0;

    doc.save();
    doc.lineWidth(lineWidth);

    if (radius > 0) {
      doc.roundedRect(x, y, width, height, radius);
    } else {
      doc.rect(x, y, width, height);
    }

    if (fill && stroke) {
      doc.fillAndStroke(fill, stroke);
    } else if (fill) {
      doc.fill(fill);
    } else if (stroke) {
      doc.stroke(stroke);
    } else {
      doc.stroke('#000000');
    }

    doc.restore();
  }

  /**
   * Render <line> tag
   */
  private static renderLine(doc: PDFKit.PDFDocument, attrs: any, unit: 'pt' | 'mm'): void {
    const x1 = this.toPoints(attrs.x1 || 0, unit);
    const y1 = this.toPoints(attrs.y1 || 0, unit);
    const x2 = this.toPoints(attrs.x2 || 100, unit);
    const y2 = this.toPoints(attrs.y2 || 0, unit);
    const color = attrs.color || attrs.strokeColor || '#000000';
    const lineWidth = attrs.lineWidth ? parseFloat(attrs.lineWidth) : 1;
    const dash = attrs.dash ? parseFloat(attrs.dash) : undefined;

    doc.save();
    doc.lineWidth(lineWidth).strokeColor(color);
    if (dash) {
      doc.dash(dash, {});
    }
    doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
    doc.restore();
  }

  /**
   * Render <circle> tag
   */
  private static renderCircle(doc: PDFKit.PDFDocument, attrs: any, unit: 'pt' | 'mm'): void {
    const x = this.toPoints(attrs.x || 0, unit);
    const y = this.toPoints(attrs.y || 0, unit);
    const r = this.toPoints(attrs.radius || attrs.r || 10, unit);
    const fill = attrs.fill || attrs.fillColor;
    const stroke = attrs.stroke || attrs.strokeColor;
    const lineWidth = attrs.lineWidth ? parseFloat(attrs.lineWidth) : 1;

    doc.save();
    doc.lineWidth(lineWidth);
    doc.circle(x, y, r);

    if (fill && stroke) {
      doc.fillAndStroke(fill, stroke);
    } else if (fill) {
      doc.fill(fill);
    } else if (stroke) {
      doc.stroke(stroke);
    } else {
      doc.stroke('#000000');
    }
    doc.restore();
  }

  /**
   * Render <hr> tag
   */
  private static renderHr(doc: PDFKit.PDFDocument, attrs: any, unit: 'pt' | 'mm'): void {
    const y = this.toPoints(attrs.y || 0, unit);
    const x1 = this.toPoints(attrs.x1 || doc.page.margins.left || 28.3, unit);
    const x2 = this.toPoints(attrs.x2 || doc.page.width - doc.page.margins.right || 566.9, unit);
    const color = attrs.color || '#cbd5e1';
    const lineWidth = attrs.lineWidth ? parseFloat(attrs.lineWidth) : 1;

    doc.save();
    doc.lineWidth(lineWidth).strokeColor(color);
    doc.moveTo(x1, y).lineTo(x2, y).stroke();
    doc.restore();
  }

  /**
   * Render <image> tag
   */
  private static renderImage(doc: PDFKit.PDFDocument, attrs: any, unit: 'pt' | 'mm'): void {
    const src = attrs.src || attrs.path;
    if (!src) return;

    const x = this.toPoints(attrs.x || 0, unit);
    const y = this.toPoints(attrs.y || 0, unit);
    const width = attrs.width || attrs.w ? this.toPoints(attrs.width || attrs.w, unit) : undefined;
    const height = attrs.height || attrs.h ? this.toPoints(attrs.height || attrs.h, unit) : undefined;

    try {
      if (fs.existsSync(src)) {
        doc.image(src, x, y, { width, height });
      }
    } catch {
      // Ignore image render error
    }
  }

  /**
   * Extensible Barcode / QR Code tag (PRD Section 6)
   */
  private static renderBarcodePlaceholder(
    doc: PDFKit.PDFDocument,
    attrs: any,
    content: string | undefined,
    unit: 'pt' | 'mm'
  ): void {
    const x = this.toPoints(attrs.x || 0, unit);
    const y = this.toPoints(attrs.y || 0, unit);
    const width = this.toPoints(attrs.width || attrs.w || 80, unit);
    const height = this.toPoints(attrs.height || attrs.h || 30, unit);
    const label = content || attrs.value || 'BARCODE';

    doc.save();
    doc.rect(x, y, width, height).lineWidth(0.75).strokeColor('#475569').stroke();
    doc.font('Courier').fontSize(7.5).fillColor('#475569');
    doc.text(`[ ${label} ]`, x, y + height / 2 - 4, { width, align: 'center' });
    doc.restore();
  }

  /**
   * Render <table> grid element
   */
  private static async renderTable(
    doc: PDFKit.PDFDocument,
    tableNode: any,
    unit: 'pt' | 'mm'
  ): Promise<void> {
    const attrs = tableNode.$ || {};
    const tableX = this.toPoints(attrs.x || doc.page.margins.left || 28.3, unit);
    let currentY = this.toPoints(attrs.y || doc.y || 100, unit);
    const tableWidth = this.toPoints(attrs.width || attrs.w || doc.page.width - doc.page.margins.left - doc.page.margins.right, unit);

    const children = tableNode.$$ || [];
    const headerNode = children.find(
      (c: any) => c['#name'] === 'header' || c['#name'] === 'HEADER' || (c.$ && c.$.isHeader === 'true')
    );
    const rowNodes = children.filter(
      (c: any) =>
        (c['#name'] === 'row' || c['#name'] === 'ROW' || c['#name'] === 'tr') &&
        !(c.$ && c.$.isHeader === 'true')
    );

    // Track default column widths from header if specified
    const colWidths: number[] = [];

    // Helper to render a row of cells
    const drawRow = (rowObj: any, isHeader: boolean) => {
      const rowAttrs = rowObj.$ || {};
      const rowHeight = this.toPoints(rowAttrs.height || attrs.rowHeight || (isHeader ? 18 : 16), unit);

      // Page boundary check for auto-pagination
      const pageBottom = doc.page.height - doc.page.margins.bottom - 40;
      if (currentY + rowHeight > pageBottom) {
        doc.addPage({
          size: doc.page.size,
          layout: (doc.page.layout === 'landscape' ? 'landscape' : 'portrait') as 'portrait' | 'landscape',
          margins: doc.page.margins,
        });
        currentY = doc.page.margins.top + 20;

        // Re-draw header on new page if it was provided
        if (headerNode && !isHeader) {
          drawRow(headerNode, true);
        }
      }

      const cellNodes = (rowObj.$$ || []).filter((c: any) =>
        ['col', 'cell', 'td', 'th'].includes((c['#name'] || '').toLowerCase())
      );

      const cellCount = cellNodes.length || 1;
      let curX = tableX;

      for (let cIdx = 0; cIdx < cellNodes.length; cIdx++) {
        const cell = cellNodes[cIdx];
        const cAttrs = cell.$ || {};

        let cellWidth: number;
        if (cAttrs.width || cAttrs.w) {
          cellWidth = this.toPoints(cAttrs.width || cAttrs.w, unit);
          if (isHeader) colWidths[cIdx] = cellWidth;
        } else if (colWidths[cIdx] !== undefined) {
          cellWidth = colWidths[cIdx];
        } else {
          cellWidth = tableWidth / cellCount;
        }

        const bgColor = cAttrs.bgColor || rowAttrs.bgColor || (isHeader ? '#f3f4f6' : undefined);
        const hasBorder =
          cAttrs.border === 'true' ||
          cAttrs.border === true ||
          attrs.border === 'true' ||
          attrs.border === true ||
          attrs.border === undefined;
        const borderColor = cAttrs.borderColor || attrs.borderColor || '#000000';
        const borderWidth = cAttrs.lineWidth ? parseFloat(cAttrs.lineWidth) : 0.5;

        // Draw background
        if (bgColor) {
          doc.save();
          doc.rect(curX, currentY, cellWidth, rowHeight).fill(bgColor);
          doc.restore();
        }

        // Draw border
        if (hasBorder) {
          doc.save();
          doc.rect(curX, currentY, cellWidth, rowHeight).lineWidth(borderWidth).strokeColor(borderColor).stroke();
          doc.restore();
        }

        // Draw text
        const cellText = cell._ !== undefined ? String(cell._) : cAttrs.value;
        if (cellText !== undefined && cellText !== null && cellText !== '') {
          const font = cAttrs.font || (isHeader ? 'Helvetica-Bold' : 'Helvetica');
          const fontSize = cAttrs.size || cAttrs.fontSize ? parseFloat(cAttrs.size || cAttrs.fontSize) : (isHeader ? 8 : 7.5);
          const color = cAttrs.color || (isHeader ? '#1f2937' : '#000000');
          const align = (cAttrs.align || (isHeader ? 'center' : 'left')).toLowerCase() as
            | 'left'
            | 'center'
            | 'right'
            | 'justify';
          const paddingX = cAttrs.paddingX ? this.toPoints(cAttrs.paddingX, unit) : 3;
          const paddingY = cAttrs.paddingY ? this.toPoints(cAttrs.paddingY, unit) : 3;

          doc.save();
          try {
            doc.font(font);
          } catch {
            doc.font('Helvetica');
          }
          doc.fontSize(fontSize).fillColor(color);
          doc.text(String(cellText), curX + paddingX, currentY + paddingY, {
            width: Math.max(0, cellWidth - paddingX * 2),
            align,
            lineBreak: true,
          });
          doc.restore();
        }

        curX += cellWidth;
      }

      currentY += rowHeight;
    };

    // Render header
    if (headerNode) {
      drawRow(headerNode, true);
    }

    // Render rows
    for (const row of rowNodes) {
      drawRow(row, false);
    }
  }

  /**
   * Apply global footer page numbering to all pages
   */
  private static applyGlobalFooters(doc: PDFKit.PDFDocument): void {
    const pages = doc.bufferedPageRange();
    if (!pages || pages.count === 0) return;

    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.save();
      doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#64748b');
      const footerY = doc.page.height - 25;
      const footerWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      doc.text(
        `Approval Management System - Halaman ${i + 1} dari ${pages.count}`,
        doc.page.margins.left,
        footerY,
        { width: footerWidth, align: 'right' }
      );
      doc.restore();
    }
  }
}

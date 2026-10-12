import { TemplateStorageService } from './template-storage.service.js';
import { ApiFetcherService } from './api-fetcher.service.js';
import { TemplateBinderService } from './template-binder.service.js';
import { XmlPdfParserService } from './xml-pdf-parser.service.js';
import { LookupService } from '../../lookup/lookup.service.js';
import { DummyTransactionData } from '../../../data/dummy-transactions.js';

export interface GeneratePdfOptions {
  /** Template ID stored in storage/templates (e.g. 'purchase_request', 'purchase_order', 'sample_prd') */
  templateId?: string;
  templateName?: string;
  /** Raw custom XML template string passed at runtime */
  templateXml?: string;

  /** Direct JSON transaction data */
  data?: any;
  /** URL to fetch JSON transaction data dynamically from an external/internal API */
  dataUrl?: string;
  dataAuthToken?: string;
  dataHeaders?: Record<string, string>;
  dataMethod?: 'GET' | 'POST';

  /** Document keyword to lookup (e.g. 'POE-22005020', 'RQE-22001433', 'CCA-00000002') */
  keyword?: string;
  requestId?: string;
}

export class DynamicPdfService {
  /**
   * Infer template ID from document code, type, or keyword
   */
  public static inferTemplateId(data: any, keyword?: string): string {
    const rawType = String(data?.tipe || data?.type || '').toUpperCase();
    const rawCode = String(data?.kode || data?.nomor_dokumen || data?.document_number || keyword || '').toUpperCase();

    if (rawType === 'PR' || rawCode.startsWith('RQE') || rawCode.startsWith('PR')) {
      return 'purchase_request';
    }
    if (rawType === 'PO' || rawCode.startsWith('POE') || rawCode.startsWith('PO')) {
      return 'purchase_order';
    }
    if (rawType === 'NPK' || rawType === 'CCA' || rawCode.startsWith('CCA') || rawCode.startsWith('NPK')) {
      return 'payment_request';
    }

    return 'default_slip';
  }

  /**
   * Main entrypoint to generate dynamic PDF
   * Coordinates API Fetcher, Handlebars Data Binding, and XML PDFKit AST Parsing
   */
  public static async generate(options: GeneratePdfOptions): Promise<{ buffer: Buffer; filename: string; templateUsed: string }> {
    // 1. Resolve Data
    let txData: any = options.data;

    if (!txData && options.dataUrl) {
      txData = await ApiFetcherService.fetchData({
        url: options.dataUrl,
        token: options.dataAuthToken,
        headers: options.dataHeaders,
        method: options.dataMethod || 'GET',
      });
    }

    if (!txData && options.keyword) {
      try {
        txData = await LookupService.getDocumentByKeyword(options.keyword, options.requestId);
      } catch {
        // Fallback to dummy dataset
      }

      if (!txData) {
        txData = DummyTransactionData.findByKeyword(options.keyword);
      }
    }

    if (!txData || typeof txData !== 'object' || Object.keys(txData).length === 0) {
      throw new Error('Data transaksi JSON tidak boleh kosong');
    }

    // 2. Resolve Template XML
    let templateXml = options.templateXml;
    let templateUsed = options.templateId || options.templateName || '';

    if (!templateXml) {
      if (!templateUsed) {
        templateUsed = this.inferTemplateId(txData, options.keyword);
      }

      const found = await TemplateStorageService.getTemplate(templateUsed);
      if (found) {
        templateXml = found.content;
      } else {
        // Fallback to default slip template
        const defaultTpl = await TemplateStorageService.getTemplate('default_slip');
        if (defaultTpl) {
          templateXml = defaultTpl.content;
          templateUsed = 'default_slip';
        } else {
          throw new Error(`Template XML '${templateUsed}' tidak ditemukan di storage`);
        }
      }
    } else {
      templateUsed = 'custom_runtime_xml';
    }

    // 3. Bind Dynamic JSON Data into XML using Handlebars
    const boundXml = TemplateBinderService.bindData(templateXml, txData);

    // 4. Parse bound XML to AST and render to PDF Buffer via PDFKit
    const buffer = await XmlPdfParserService.parseAndRender(boundXml);

    const docCode = txData.kode || txData.nomor_dokumen || txData.document_number || options.keyword || 'document';
    const filename = `${docCode}.pdf`;

    return {
      buffer,
      filename,
      templateUsed,
    };
  }

  /**
   * Helper to directly render raw XML and arbitrary data
   */
  public static async renderFromRawXml(rawXml: string, data: any): Promise<Buffer> {
    const boundXml = TemplateBinderService.bindData(rawXml, data);
    return await XmlPdfParserService.parseAndRender(boundXml);
  }
}

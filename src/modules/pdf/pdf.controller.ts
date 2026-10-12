import { FastifyReply, FastifyRequest } from 'fastify';
import { DynamicPdfService } from './services/dynamic-pdf.service.js';
import { TemplateStorageService } from './services/template-storage.service.js';
import { LookupService } from '../lookup/lookup.service.js';
import { DummyTransactionData } from '../../data/dummy-transactions.js';

export class PdfController {
  /**
   * Generate PDF dynamically from JSON payload, remote API, or keyword lookup
   * POST /api/v1/integration/pdf/generate
   */
  static async generateFromJson(request: FastifyRequest, reply: FastifyReply) {
    const body: any = request.body || {};

    const templateId = body.template_id || body.templateId || body.template_name || body.template;
    const templateXml = body.template_xml || body.templateXml;
    const txData = body.data !== undefined ? body.data : (!body.data_url && !body.keyword ? body : null);
    const dataUrl = body.data_url || body.dataUrl;
    const dataAuthToken = body.data_auth_token || body.token || body.auth_token;
    const dataHeaders = body.data_headers || body.headers;
    const keyword = body.keyword;
    const format = (body.format || body.response_type || 'binary').toLowerCase();

    if (!txData && !dataUrl && !keyword) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'Harap sediakan data JSON transaksi, data_url, atau keyword dokumen',
        },
        request_id: request.requestId,
      });
    }

    try {
      const result = await DynamicPdfService.generate({
        templateId,
        templateXml,
        data: txData,
        dataUrl,
        dataAuthToken,
        dataHeaders,
        keyword,
        requestId: request.requestId,
      });

      if (format === 'base64') {
        return reply.status(200).send({
          success: true,
          message: 'PDF berhasil dibuat secara dinamis',
          filename: result.filename,
          template_used: result.templateUsed,
          data: {
            base64: result.buffer.toString('base64'),
            size_bytes: result.buffer.length,
            content_type: 'application/pdf',
          },
          request_id: request.requestId,
        });
      }

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `inline; filename="${result.filename}"`);
      reply.header('Content-Length', result.buffer.length);
      reply.header('X-Template-Used', result.templateUsed);
      return reply.send(result.buffer);
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'PDF_GENERATION_FAILED',
          message: err.message || 'Gagal membuat file PDF secara dinamis',
        },
        request_id: request.requestId,
      });
    }
  }

  /**
   * Lookup document by keyword and generate PDF using dynamic template
   * GET /api/v1/integration/document/:keyword/pdf
   */
  static async getDocumentPdf(request: FastifyRequest, reply: FastifyReply) {
    const { keyword } = (request.params || {}) as { keyword: string };
    const query: any = request.query || {};
    const templateId = query.template_id || query.template;
    const format = (query.format || 'binary').toLowerCase();

    try {
      const result = await DynamicPdfService.generate({
        keyword,
        templateId,
        requestId: request.requestId,
      });

      if (format === 'base64') {
        return reply.status(200).send({
          success: true,
          message: `PDF untuk dokumen ${keyword} berhasil di-generate`,
          filename: result.filename,
          template_used: result.templateUsed,
          data: {
            base64: result.buffer.toString('base64'),
            size_bytes: result.buffer.length,
          },
          request_id: request.requestId,
        });
      }

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `inline; filename="${result.filename}"`);
      reply.header('Content-Length', result.buffer.length);
      reply.header('X-Template-Used', result.templateUsed);
      return reply.send(result.buffer);
    } catch (err: any) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'DOCUMENT_PDF_FAILED',
          message: err.message || `Gagal menghasilkan PDF untuk dokumen '${keyword}'`,
        },
        request_id: request.requestId,
      });
    }
  }

  /**
   * List all stored runtime XML templates
   * GET /api/v1/integration/pdf/templates
   */
  static async listTemplates(request: FastifyRequest, reply: FastifyReply) {
    try {
      const templates = await TemplateStorageService.listTemplates();
      return reply.send({
        success: true,
        count: templates.length,
        data: templates,
        request_id: request.requestId,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'TEMPLATE_LIST_FAILED',
          message: err.message || 'Gagal membaca daftar template',
        },
        request_id: request.requestId,
      });
    }
  }

  /**
   * Get template detail and XML content
   * GET /api/v1/integration/pdf/templates/:templateId
   */
  static async getTemplate(request: FastifyRequest, reply: FastifyReply) {
    const { templateId } = (request.params || {}) as { templateId: string };

    try {
      const template = await TemplateStorageService.getTemplate(templateId);
      if (!template) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: `Template dengan ID '${templateId}' tidak ditemukan`,
          },
          request_id: request.requestId,
        });
      }

      return reply.send({
        success: true,
        data: template,
        request_id: request.requestId,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'TEMPLATE_GET_FAILED',
          message: err.message || 'Gagal membaca template',
        },
        request_id: request.requestId,
      });
    }
  }

  /**
   * Create or update a runtime XML template
   * POST /api/v1/integration/pdf/templates
   * PUT /api/v1/integration/pdf/templates/:templateId
   */
  static async saveTemplate(request: FastifyRequest, reply: FastifyReply) {
    const params: any = request.params || {};
    const body: any = request.body || {};

    const id = params.templateId || body.id || body.template_id;
    const content = body.content || body.xml || body.template_xml;

    if (!id || typeof id !== 'string') {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_TEMPLATE_ID',
          message: 'Field template id wajib diisi',
        },
        request_id: request.requestId,
      });
    }

    if (!content || typeof content !== 'string') {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_TEMPLATE_CONTENT',
          message: 'Konten XML template wajib diisi',
        },
        request_id: request.requestId,
      });
    }

    try {
      const saved = await TemplateStorageService.saveTemplate(id, content, {
        name: body.name,
        description: body.description,
        category: body.category,
        version: body.version,
      });

      return reply.send({
        success: true,
        message: `Template '${id}' berhasil disimpan`,
        data: saved,
        request_id: request.requestId,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'TEMPLATE_SAVE_FAILED',
          message: err.message || 'Gagal menyimpan template',
        },
        request_id: request.requestId,
      });
    }
  }

  /**
   * Delete a runtime XML template
   * DELETE /api/v1/integration/pdf/templates/:templateId
   */
  static async deleteTemplate(request: FastifyRequest, reply: FastifyReply) {
    const { templateId } = (request.params || {}) as { templateId: string };

    try {
      const deleted = await TemplateStorageService.deleteTemplate(templateId);
      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: `Template '${templateId}' tidak ditemukan`,
          },
          request_id: request.requestId,
        });
      }

      return reply.send({
        success: true,
        message: `Template '${templateId}' berhasil dihapus`,
        request_id: request.requestId,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'TEMPLATE_DELETE_FAILED',
          message: err.message || 'Gagal menghapus template',
        },
        request_id: request.requestId,
      });
    }
  }

  /**
   * Preview/Test render a stored template with dummy or custom payload
   * POST /api/v1/integration/pdf/templates/:templateId/preview
   */
  static async previewTemplate(request: FastifyRequest, reply: FastifyReply) {
    const { templateId } = (request.params || {}) as { templateId: string };
    const body: any = request.body || {};

    const template = await TemplateStorageService.getTemplate(templateId);
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: `Template '${templateId}' tidak ditemukan`,
        },
        request_id: request.requestId,
      });
    }

    // Use custom data from body, or sensible dummy dataset based on category
    let sampleData = body.data || body;
    if (!sampleData || Object.keys(sampleData).length === 0) {
      if (template.category === 'PR' || templateId.includes('request')) {
        sampleData = DummyTransactionData.findByKeyword('RQE-22001433');
      } else if (template.category === 'PO' || templateId.includes('order')) {
        sampleData = DummyTransactionData.findByKeyword('POE-22005020');
      } else if (template.category === 'NPK' || templateId.includes('payment') || templateId.includes('cca')) {
        sampleData = DummyTransactionData.findByKeyword('CCA-00000002');
      } else {
        sampleData = {
          slip_type: 'PURCHASE REQUEST',
          transaction_no: 'PR-TEST-001',
          nomor_dokumen: 'PR-TEST-001',
          tanggal: new Date().toLocaleDateString('id-ID'),
          gudang: 'MDC SOLO TD',
          items: [
            { kode: 'ITM-01', name: 'Kertas HVS A4 80gr', price: 45000, qty: 5 },
            { kode: 'ITM-02', name: 'Tinta Printer Epson Black', price: 95000, qty: 2 },
          ],
        };
      }
    }

    try {
      const buffer = await DynamicPdfService.renderFromRawXml(template.content, sampleData);
      const filename = `preview_${templateId}.pdf`;

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `inline; filename="${filename}"`);
      reply.header('Content-Length', buffer.length);
      return reply.send(buffer);
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'PREVIEW_FAILED',
          message: `Gagal me-render preview template: ${err.message}`,
        },
        request_id: request.requestId,
      });
    }
  }

  /**
   * Render directly from raw XML string and data without saving to storage
   * POST /api/v1/integration/pdf/render-xml
   */
  static async renderRawXml(request: FastifyRequest, reply: FastifyReply) {
    const body: any = request.body || {};
    const xml = body.xml || body.template_xml;
    const data = body.data || {};
    const format = (body.format || 'binary').toLowerCase();

    if (!xml || typeof xml !== 'string') {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_XML',
          message: 'Field xml / template_xml wajib diisi berupa string XML terstruktur',
        },
        request_id: request.requestId,
      });
    }

    try {
      const buffer = await DynamicPdfService.renderFromRawXml(xml, data);
      const filename = `${data.kode || data.nomor_dokumen || 'custom_document'}.pdf`;

      if (format === 'base64') {
        return reply.send({
          success: true,
          filename,
          data: {
            base64: buffer.toString('base64'),
            size_bytes: buffer.length,
          },
          request_id: request.requestId,
        });
      }

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `inline; filename="${filename}"`);
      reply.header('Content-Length', buffer.length);
      return reply.send(buffer);
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'RENDER_XML_FAILED',
          message: err.message || 'Gagal me-render XML ke PDF',
        },
        request_id: request.requestId,
      });
    }
  }
}

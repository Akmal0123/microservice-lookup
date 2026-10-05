import { FastifyReply, FastifyRequest } from 'fastify';
import { PdfTemplateService } from './pdf-template.service.js';
import { LookupService } from '../lookup/lookup.service.js';
import { DummyTransactionData } from '../../data/dummy-transactions.js';

export class PdfController {
  /**
   * Generate PDF dynamically from JSON payload
   * POST /api/v1/integration/pdf/generate
   */
  static async generateFromJson(request: FastifyRequest, reply: FastifyReply) {
    const body: any = request.body || {};
    const txData = body.data || body;

    if (!txData || typeof txData !== 'object' || Object.keys(txData).length === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'Data transaksi JSON tidak boleh kosong',
        },
        request_id: request.requestId,
      });
    }

    try {
      const pdfBuffer = await PdfTemplateService.generate(txData);
      const filename = `${txData.kode || txData.nomor_dokumen || txData.document_number || 'dokumen'}.pdf`;

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `inline; filename="${filename}"`);
      reply.header('Content-Length', pdfBuffer.length);
      return reply.send(pdfBuffer);
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'PDF_GENERATION_FAILED',
          message: err.message || 'Gagal membuat file PDF',
        },
        request_id: request.requestId,
      });
    }
  }

  /**
   * Lookup document by keyword and generate finished PDF directly
   * GET /api/v1/integration/document/:keyword/pdf
   */
  static async getDocumentPdf(request: FastifyRequest, reply: FastifyReply) {
    const { keyword } = (request.params || {}) as { keyword: string };

    let docData: any = null;

    try {
      docData = await LookupService.getDocumentByKeyword(keyword, request.requestId);
    } catch {
      // Ignore error and try fallback
    }

    if (!docData) {
      docData = DummyTransactionData.findByKeyword(keyword);
    }

    if (!docData) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: `Dokumen dengan nomor/kode '${keyword}' tidak ditemukan`,
        },
        request_id: request.requestId,
      });
    }

    try {
      const pdfBuffer = await PdfTemplateService.generate(docData);
      const filename = `${docData.kode || docData.nomor_dokumen || keyword}.pdf`;

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `inline; filename="${filename}"`);
      reply.header('Content-Length', pdfBuffer.length);
      return reply.send(pdfBuffer);
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'PDF_GENERATION_FAILED',
          message: err.message || 'Gagal membuat file PDF untuk dokumen',
        },
        request_id: request.requestId,
      });
    }
  }
}

import { FastifyInstance } from 'fastify';
import { PdfController } from './pdf.controller.js';
import { authenticateAms } from '../../middleware/authentication.js';

export default async function pdfRoutes(fastify: FastifyInstance) {
  const checkPdfAuth = async (request: any, reply: any) => {
    await authenticateAms(request, reply);
    if (reply.sent) return;

    const rawScope = request.jwt?.scope;
    let scopes: string[] = [];

    if (Array.isArray(rawScope)) {
      scopes = rawScope;
    } else if (typeof rawScope === 'string') {
      scopes = rawScope.split(/\s+/);
    }

    const hasAccess =
      scopes.includes('integration:purchase-order:read') ||
      scopes.includes('integration:purchase-request:read') ||
      scopes.includes('lookup:read') ||
      scopes.length === 0; // AMS standard token

    if (!hasAccess) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Forbidden: Requires integration read permission',
        },
        request_id: request.requestId,
      });
    }
  };

  // POST generate PDF from arbitrary JSON transaction
  fastify.post('/api/v1/integration/pdf/generate', { preHandler: [checkPdfAuth] }, PdfController.generateFromJson);
  fastify.post('/api/integration/pdf/generate', { preHandler: [checkPdfAuth] }, PdfController.generateFromJson);

  // GET document PDF by keyword (PO or PR or dummy)
  fastify.get('/api/v1/integration/document/:keyword/pdf', { preHandler: [checkPdfAuth] }, PdfController.getDocumentPdf);
  fastify.get('/api/integration/document/:keyword/pdf', { preHandler: [checkPdfAuth] }, PdfController.getDocumentPdf);
}

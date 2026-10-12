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

  // 1. Dynamic PDF Generation from JSON / API / Keyword
  fastify.post('/api/v1/integration/pdf/generate', { preHandler: [checkPdfAuth] }, PdfController.generateFromJson);
  fastify.post('/api/integration/pdf/generate', { preHandler: [checkPdfAuth] }, PdfController.generateFromJson);

  // 2. Direct Raw XML & Data PDF Renderer
  fastify.post('/api/v1/integration/pdf/render-xml', { preHandler: [checkPdfAuth] }, PdfController.renderRawXml);
  fastify.post('/api/integration/pdf/render-xml', { preHandler: [checkPdfAuth] }, PdfController.renderRawXml);

  // 3. Document PDF Lookup by Keyword
  fastify.get('/api/v1/integration/document/:keyword/pdf', { preHandler: [checkPdfAuth] }, PdfController.getDocumentPdf);
  fastify.get('/api/integration/document/:keyword/pdf', { preHandler: [checkPdfAuth] }, PdfController.getDocumentPdf);

  // 4. Runtime XML Template Management (PRD Section 5.2)
  fastify.get('/api/v1/integration/pdf/templates', { preHandler: [checkPdfAuth] }, PdfController.listTemplates);
  fastify.get('/api/integration/pdf/templates', { preHandler: [checkPdfAuth] }, PdfController.listTemplates);

  fastify.get('/api/v1/integration/pdf/templates/:templateId', { preHandler: [checkPdfAuth] }, PdfController.getTemplate);
  fastify.get('/api/integration/pdf/templates/:templateId', { preHandler: [checkPdfAuth] }, PdfController.getTemplate);

  fastify.post('/api/v1/integration/pdf/templates', { preHandler: [checkPdfAuth] }, PdfController.saveTemplate);
  fastify.post('/api/integration/pdf/templates', { preHandler: [checkPdfAuth] }, PdfController.saveTemplate);

  fastify.put('/api/v1/integration/pdf/templates/:templateId', { preHandler: [checkPdfAuth] }, PdfController.saveTemplate);
  fastify.put('/api/integration/pdf/templates/:templateId', { preHandler: [checkPdfAuth] }, PdfController.saveTemplate);

  fastify.delete('/api/v1/integration/pdf/templates/:templateId', { preHandler: [checkPdfAuth] }, PdfController.deleteTemplate);
  fastify.delete('/api/integration/pdf/templates/:templateId', { preHandler: [checkPdfAuth] }, PdfController.deleteTemplate);

  fastify.post('/api/v1/integration/pdf/templates/:templateId/preview', { preHandler: [checkPdfAuth] }, PdfController.previewTemplate);
  fastify.post('/api/integration/pdf/templates/:templateId/preview', { preHandler: [checkPdfAuth] }, PdfController.previewTemplate);
}

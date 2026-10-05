import { FastifyReply, FastifyRequest } from 'fastify';
import { PurchaseRequestService } from './purchase-request.service.js';

export class PurchaseRequestController {
  static async getOne(request: FastifyRequest, reply: FastifyReply) {
    const { number } = (request.params || {}) as { number: string };
    const transformed = await PurchaseRequestService.getByNumberOrId(number, request.requestId);

    return reply.send({
      success: true,
      data: transformed,
      meta: {
        source: 'eis',
        request_id: request.requestId,
      },
    });
  }

  static async getList(request: FastifyRequest, reply: FastifyReply) {
    const { q } = (request.query || {}) as { q?: string };
    const results = await PurchaseRequestService.list(q || '', request.requestId);

    return reply.send({
      success: true,
      count: results.length,
      data: results,
      meta: {
        source: 'eis',
        request_id: request.requestId,
      },
    });
  }

  static async lookup(request: FastifyRequest, reply: FastifyReply) {
    const { q } = (request.query || {}) as { q?: string };
    const results = await PurchaseRequestService.lookup(q || '', request.requestId);

    return reply.send({
      success: true,
      data: results,
      meta: {
        source: 'eis',
        request_id: request.requestId,
      },
    });
  }

  static async getPdf(request: FastifyRequest, reply: FastifyReply) {
    const { number } = (request.params || {}) as { number: string };
    const pdfBuffer = await PurchaseRequestService.getPdf(number, request.requestId);

    reply.header('content-type', 'application/pdf');
    reply.header('content-disposition', `inline; filename="PR_${number}.pdf"`);
    reply.header('content-length', pdfBuffer.length);
    return reply.send(pdfBuffer);
  }
}

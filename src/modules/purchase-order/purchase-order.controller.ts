import { FastifyReply, FastifyRequest } from 'fastify';
import { PurchaseOrderService } from './purchase-order.service.js';

export class PurchaseOrderController {
  static async getOne(request: FastifyRequest, reply: FastifyReply) {
    const { number } = (request.params || {}) as { number: string };
    const transformed = await PurchaseOrderService.getByNumberOrId(number, request.requestId);

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
    const results = await PurchaseOrderService.list(q || '', request.requestId);

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
    const results = await PurchaseOrderService.lookup(q || '', request.requestId);

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
    const { id } = (request.params || {}) as { id: string };
    const pdfBuffer = await PurchaseOrderService.getPdf(id, request.requestId);

    reply.header('content-type', 'application/pdf');
    reply.header('content-disposition', `inline; filename="PO_${id}.pdf"`);
    reply.header('content-length', pdfBuffer.length);
    return reply.send(pdfBuffer);
  }
}

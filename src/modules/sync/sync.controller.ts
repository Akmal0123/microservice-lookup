import { FastifyReply, FastifyRequest } from 'fastify';
import { SyncService } from './sync.service.js';

export class SyncController {
  /**
   * Endpoint sinkronisasi Purchase Order ke AMS:
   * POST /api/v1/integration/sync/po
   */
  static async syncPo(request: FastifyRequest, reply: FastifyReply) {
    const body = (request.body || {}) as { po_number?: string; id?: string | number };
    const query = (request.query || {}) as { po_number?: string; id?: string | number };
    const poNumberOrId = body.po_number || body.id || query.po_number || query.id;

    if (!poNumberOrId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'MISSING_PARAM',
          message: "Field 'po_number' atau 'id' wajib diisi dalam request body/query.",
        },
        request_id: request.requestId,
      });
    }

    try {
      const result = await SyncService.syncPurchaseOrder(poNumberOrId, request.requestId);
      return reply.send({
        success: true,
        data: result,
        meta: {
          service: 'microservice-lookup',
          action: 'sync_po',
          request_id: request.requestId,
        },
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SYNC_ERROR',
          message: err.message || 'Gagal sinkronisasi Purchase Order ke AMS',
        },
        request_id: request.requestId,
      });
    }
  }

  /**
   * Endpoint sinkronisasi Purchase Request ke AMS:
   * POST /api/v1/integration/sync/pr
   */
  static async syncPr(request: FastifyRequest, reply: FastifyReply) {
    const body = (request.body || {}) as { pr_number?: string; id?: string | number };
    const query = (request.query || {}) as { pr_number?: string; id?: string | number };
    const prNumberOrId = body.pr_number || body.id || query.pr_number || query.id;

    if (!prNumberOrId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'MISSING_PARAM',
          message: "Field 'pr_number' atau 'id' wajib diisi dalam request body/query.",
        },
        request_id: request.requestId,
      });
    }

    try {
      const result = await SyncService.syncPurchaseRequest(prNumberOrId, request.requestId);
      return reply.send({
        success: true,
        data: result,
        meta: {
          service: 'microservice-lookup',
          action: 'sync_pr',
          request_id: request.requestId,
        },
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SYNC_ERROR',
          message: err.message || 'Gagal sinkronisasi Purchase Request ke AMS',
        },
        request_id: request.requestId,
      });
    }
  }

  /**
   * Endpoint pembaruan status dokumen dari AMS ke EIS:
   * POST /api/v1/integration/sync/status
   */
  static async updateStatus(request: FastifyRequest, reply: FastifyReply) {
    const body = (request.body || {}) as {
      nomor_dokumen?: string;
      status?: string;
      notes?: string;
    };

    if (!body.nomor_dokumen || !body.status) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'MISSING_PARAM',
          message: "Field 'nomor_dokumen' dan 'status' wajib diisi.",
        },
        request_id: request.requestId,
      });
    }

    try {
      const result = await SyncService.updateStatusFromAms(
        body.nomor_dokumen,
        body.status,
        body.notes,
        request.requestId
      );

      return reply.send({
        success: true,
        data: result,
        message: `Status dokumen ${body.nomor_dokumen} berhasil diperbarui di EIS menjadi ${result.new_status}.`,
        meta: {
          service: 'microservice-lookup',
          action: 'update_status',
          request_id: request.requestId,
        },
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'UPDATE_STATUS_ERROR',
          message: err.message || 'Gagal memperbarui status dokumen di EIS',
        },
        request_id: request.requestId,
      });
    }
  }

  /**
   * Endpoint helper untuk cek pendaftaran user di AMS:
   * GET /api/v1/integration/sync/check-user?email=...
   */
  static async checkUser(request: FastifyRequest, reply: FastifyReply) {
    const query = (request.query || {}) as { email?: string; username?: string };

    if (!query.email && !query.username) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'MISSING_PARAM',
          message: "Query parameter 'email' atau 'username' wajib diisi.",
        },
        request_id: request.requestId,
      });
    }

    try {
      const result = await SyncService.checkUserInAms(query.email || '', query.username);
      return reply.send({
        success: true,
        data: result,
        meta: {
          service: 'microservice-lookup',
          request_id: request.requestId,
        },
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'CHECK_USER_ERROR',
          message: err.message,
        },
        request_id: request.requestId,
      });
    }
  }
}

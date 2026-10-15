import { FastifyInstance } from 'fastify';
import { SyncController } from './sync.controller.js';

export default async function syncRoutes(fastify: FastifyInstance) {
  // Sync PO dari EIS ke AMS (mengecek user, membuat draft document + PDF, atau mendaftarkan user ke AMS)
  fastify.post('/api/v1/integration/sync/po', SyncController.syncPo);

  // Sync PR dari EIS ke AMS (mengecek user, membuat draft document + PDF, atau mendaftarkan user ke AMS)
  fastify.post('/api/v1/integration/sync/pr', SyncController.syncPr);

  // Sync status dari AMS ke EIS (saat dokumen disetujui / ditolak di AMS)
  fastify.post('/api/v1/integration/sync/status', SyncController.updateStatus);

  // Helper check user di AMS
  fastify.get('/api/v1/integration/sync/check-user', SyncController.checkUser);
}

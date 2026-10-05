import { FastifyInstance } from 'fastify';
import { PurchaseRequestController } from './purchase-request.controller.js';
import { requireScope } from '../../middleware/authentication.js';
import { getPurchaseRequestSchema, listPurchaseRequestsSchema } from './purchase-request.schema.js';

export default async function purchaseRequestRoutes(fastify: FastifyInstance) {
  const scopeAuth = requireScope('integration:purchase-request:read');

  // Strict API v1 Routes (isolated-integration-service-architecture.md Section 19)
  fastify.get(
    '/api/v1/integration/purchase-requests/:number',
    { preHandler: [scopeAuth], schema: getPurchaseRequestSchema },
    PurchaseRequestController.getOne
  );

  fastify.get(
    '/api/v1/integration/purchase-requests',
    { preHandler: [scopeAuth], schema: listPurchaseRequestsSchema },
    PurchaseRequestController.getList
  );

  fastify.get(
    '/api/v1/integration/purchase-requests/lookup',
    { preHandler: [scopeAuth] },
    PurchaseRequestController.lookup
  );

  fastify.get(
    '/api/v1/integration/purchase-requests/:number/pdf',
    { preHandler: [scopeAuth] },
    PurchaseRequestController.getPdf
  );

  // Backward compatibility aliases
  fastify.get(
    '/api/integration/purchase-requests/:number',
    { preHandler: [scopeAuth] },
    PurchaseRequestController.getOne
  );

  fastify.get(
    '/api/integration/purchase-requests/lookup',
    { preHandler: [scopeAuth] },
    PurchaseRequestController.lookup
  );

  fastify.get(
    '/api/integration/purchase-requests/:number/pdf',
    { preHandler: [scopeAuth] },
    PurchaseRequestController.getPdf
  );
}

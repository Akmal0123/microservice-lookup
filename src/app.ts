import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { requestIdMiddleware } from './middleware/request-id.js';
import { errorHandler } from './middleware/error-handler.js';
import purchaseOrderRoutes from './modules/purchase-order/purchase-order.route.js';
import purchaseRequestRoutes from './modules/purchase-request/purchase-request.route.js';
import lookupRoutes from './modules/lookup/lookup.route.js';
import docsRoutes from './docs/docs.route.js';
import { testDatabaseConnection } from './database/sequelize.js';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: true,
  });

  // Register Request ID Hook
  fastify.addHook('onRequest', requestIdMiddleware);

  // Centralized Error Handler (must be registered early)
  fastify.setErrorHandler(errorHandler);

  // Custom 404 Route Not Found Handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${request.method}:${request.url} not found`,
      },
      request_id: request.requestId,
    });
  });

  // Register CORS
  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposedHeaders: ['x-request-id', 'content-disposition'],
  });

  // Health Check Endpoint (Public)
  fastify.get('/health', async (request, reply) => {
    const isDbConnected = await testDatabaseConnection();
    return {
      status: 'ok',
      service: 'Microservice Lookup',
      version: '2.0.0',
      database: isDbConnected ? 'connected' : 'disconnected',
      architecture: {
        role: 'Connector between AMS and EIS Database',
        auth: 'JWT Auth (AMS .env)',
        orm: 'Sequelize ORM directly to EIS MySQL',
        jwt_b: 'None (Direct DB access)',
      },
      timestamp: new Date().toISOString(),
      request_id: request.requestId,
    };
  });

  // Register Business Modules
  await fastify.register(purchaseOrderRoutes);
  await fastify.register(purchaseRequestRoutes);
  await fastify.register(lookupRoutes);

  // Register Documentation & Testing Routes
  await fastify.register(docsRoutes);

  return fastify;
}

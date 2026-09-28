import { FastifyReply, FastifyRequest } from 'fastify';
import { verifyJwt, JwtPayload, UserAuthInfo } from '../config/jwt.js';

declare module 'fastify' {
  interface FastifyRequest {
    jwt?: JwtPayload;
    user?: UserAuthInfo | null;
  }
}

/**
 * Authentication hook: validates JWT from AMS (User/Service Authentication)
 */
export async function authenticateAms(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or malformed Authorization Bearer token from AMS',
      },
      request_id: request.requestId,
    });
  }

  const token = authHeader.substring(7).trim();

  try {
    const payload = verifyJwt(token);
    request.jwt = payload;
    request.user = payload.user || (payload.sub ? { id: payload.sub, email: payload.sub } : null);
  } catch (err: any) {
    const isExpired = err.name === 'TokenExpiredError';
    return reply.status(401).send({
      success: false,
      error: {
        code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        message: isExpired ? 'JWT Token has expired' : (err.message || 'Invalid JWT token'),
      },
      request_id: request.requestId,
    });
  }
}

/**
 * Scope verification factory for route-level authorization
 */
export function requireScope(requiredScope: string) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    // First ensure authenticated
    if (!request.jwt) {
      await authenticateAms(request, reply);
      if (reply.sent) return;
    }

    const rawScope = request.jwt?.scope;
    let scopes: string[] = [];

    if (Array.isArray(rawScope)) {
      scopes = rawScope;
    } else if (typeof rawScope === 'string') {
      scopes = rawScope.split(/\s+/);
    }

    // Allow wildcard or matching scope or lookup:read
    const isAllowed =
      scopes.includes('*') ||
      scopes.includes(requiredScope) ||
      (requiredScope.includes('read') && scopes.includes('lookup:read'));

    if (!isAllowed) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Forbidden: Insufficient scope. Required: '${requiredScope}'`,
        },
        request_id: request.requestId,
      });
    }
  };
}

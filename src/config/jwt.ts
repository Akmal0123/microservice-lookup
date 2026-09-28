import jwt from 'jsonwebtoken';
import { envConfig } from './env.js';

export interface UserAuthInfo {
  id?: number | string;
  name?: string;
  email?: string;
}

export interface JwtPayload {
  iss?: string;
  aud?: string | string[];
  sub?: string;
  user?: UserAuthInfo | null;
  scope?: string[] | string;
  iat?: number;
  exp?: number;
}

export type JwtAPayload = JwtPayload;

/**
 * Verify JWT received from AMS (User/Service Authentication)
 */
export function verifyJwt(token: string): JwtPayload {
  const allowedAudiences = [
    envConfig.jwt.audience,
    'microservice-lookup',
    'integration-service',
  ];

  const decoded = jwt.verify(token, envConfig.jwt.secret, {
    algorithms: ['HS256'],
  }) as JwtPayload;

  // Validate audience if present in token
  if (decoded.aud) {
    const tokenAuds = Array.isArray(decoded.aud) ? decoded.aud : [decoded.aud];
    const hasAudienceMatch = tokenAuds.some((aud) => allowedAudiences.includes(aud));
    if (!hasAudienceMatch) {
      throw new Error(`Invalid audience: expected one of ${allowedAudiences.join(', ')}`);
    }
  }

  return decoded;
}

// Backward-compatible alias
export const verifyJwtA = verifyJwt;

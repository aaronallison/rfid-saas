import crypto from 'node:crypto';
import logger from './logger.js';

const COBROWSE_API_KEY = process.env.COBROWSE_API_KEY || '';   // RSA private key (PEM)
const COBROWSE_API_TOKEN = process.env.COBROWSE_API_TOKEN || ''; // License key for SDK

/**
 * Check if Cobrowse is enabled (both keys present).
 */
export function isCobrowseEnabled() {
  return !!(COBROWSE_API_TOKEN && COBROWSE_API_KEY);
}

/**
 * Return client-safe config for SDK initialization.
 */
export function getClientConfig() {
  return {
    enabled: isCobrowseEnabled(),
    license: COBROWSE_API_TOKEN || null,
  };
}

/**
 * Sign a JWT for Cobrowse agent dashboard authentication.
 * Uses RS256 with the RSA private key from COBROWSE_API_KEY.
 *
 * @param {object} params
 * @param {string} params.email  Agent email
 * @param {string} params.orgId  Organization ID
 * @returns {string} Signed JWT
 */
export function signAgentToken({ email, orgId }) {
  if (!COBROWSE_API_KEY) {
    throw new Error('COBROWSE_API_KEY not configured');
  }

  const header = { alg: 'RS256', typ: 'JWT' };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: email,
    org_id: orgId,
    iat: now,
    exp: now + 3600, // 1 hour
    iss: 'grotap',
  };

  const base64url = (obj) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64url');

  const signingInput = `${base64url(header)}.${base64url(payload)}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  sign.end();

  const signature = sign.sign(COBROWSE_API_KEY, 'base64url');

  const token = `${signingInput}.${signature}`;

  logger.info({ email, orgId }, 'Cobrowse agent JWT signed');
  return token;
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { createCompanionLiveSessionHandler } from '../_lib/companionLiveSession.js';
import { COMPANION_LIVE_CONFIG, COMPANION_LIVE_MODEL, COMPANION_LIVE_POLICY } from '../_lib/companionLiveVoiceConfig.js';

const issueSession = createCompanionLiveSessionHandler({
  policy: {
    model: COMPANION_LIVE_MODEL,
    tokenLifetimeMs: COMPANION_LIVE_POLICY.sessionSeconds * 1_000,
    newSessionLifetimeMs: COMPANION_LIVE_POLICY.newSessionSeconds * 1_000,
    issuanceLeaseSeconds: COMPANION_LIVE_POLICY.sessionSeconds + COMPANION_LIVE_POLICY.leaseMarginSeconds,
    mintTimeoutMs: COMPANION_LIVE_POLICY.mintTimeoutMs,
    requestTimeoutMs: 45_000,
    burst: { limit: COMPANION_LIVE_POLICY.burstLimit, windowSeconds: COMPANION_LIVE_POLICY.burstWindowSeconds },
    userDaily: { limit: COMPANION_LIVE_POLICY.userDailyLimit, windowSeconds: COMPANION_LIVE_POLICY.dailyWindowSeconds },
    globalDaily: { limit: COMPANION_LIVE_POLICY.globalDailyLimit, windowSeconds: COMPANION_LIVE_POLICY.dailyWindowSeconds },
  },
  mintToken: async ({ model, expireTime, newSessionExpireTime, signal }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_NOT_CONFIGURED');
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: 'v1beta', timeout: COMPANION_LIVE_POLICY.mintTimeoutMs, retryOptions: { attempts: 1 } },
    });
    return ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: { model, config: COMPANION_LIVE_CONFIG },
        abortSignal: signal,
      },
    });
  },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return issueSession(req, res);
}

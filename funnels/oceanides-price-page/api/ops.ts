import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { funnelConfig } from '../src/funnel.config.js';

// ===========================================================================
// /api/ops — ang likod ng ops tracker (`/ops`). Isang handler, tatlong galaw:
//
//   POST   ?action=login    passphrase -> cookie
//   POST   ?action=logout   burahin ang cookie
//   GET                     listahan ng lead ng client na to
//   PATCH                   baguhin ang status / amount / address / notes
//
// 🔴 BAKIT MAY PASSWORD ITO AT HINDI PWEDENG WALA.
// Ang laman ay pangalan, phone, at email ng totoong tao. Ang parehong form na
// nagtitipon nun ay nangangako sa kanila ng Privacy Policy. Ang ilagay yun sa
// bukas na URL ay hindi lang panganib — sinisira nito mismo ang pangakong
// binasa nila bago mag-form. Kaya walang lead na lumalabas dito hangga't
// walang cookie, at 401 ang sagot bago pa mabuksan ang database.
//
// 🔴 NAKA-SALA SA CLIENT_ID. Ang bawat query ay may `client_id = <sarili>`,
// hindi lang `funnel_id`. Iisang Supabase project ang ginagamit ng lahat ng
// funnel, kaya ang nawawalang filter dito ay roster ng ibang kliyente na
// lumalabas sa page na to. Server-side sya at hindi kayang palitan ng browser.
//
// ⚠️ Walang service-role key na umaabot sa browser. Dito lang sya nabubuhay.
// ===========================================================================

const COOKIE = 'oceanides_ops';

/** Ang cookie ay HMAC ng client_id gamit ang passphrase bilang susi.
 *  Hindi mahuhulaan kung walang passphrase, at walang PII sa loob. */
const tokenFor = (passphrase: string): string =>
  createHmac('sha256', passphrase).update(`ops:${funnelConfig.meta.clientId}`).digest('hex');

const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual ay sumasabog kapag magkaiba ang haba, kaya nauuna ang tsek
  // na yun — at ang haba mismo ay hindi lihim.
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};

const readCookie = (req: VercelRequest, name: string): string | null => {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
};

const isAuthed = (req: VercelRequest, passphrase: string): boolean => {
  const cookie = readCookie(req, COOKIE);
  return cookie !== null && safeEqual(cookie, tokenFor(passphrase));
};

/** Ang mga estado na kayang itakda ni Zam. Sarado ang listahan sa layer na to
 *  para hindi makapasok sa talaan ang typo na hindi na mabibilang pagkatapos. */
const STATUSES = ['new', 'tinawagan', 'booked', 'tapos', 'hindi_natuloy'] as const;

const Patch = z.object({
  id: z.string().uuid(),
  status: z.enum(STATUSES).optional(),
  // Nullable: kailangang mabura ni Zam ang maling naipasok, hindi lang mapalitan.
  amount: z.number().nonnegative().max(10_000_000).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const passphrase = process.env.OPS_PASSPHRASE;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Fail CLOSED. Ang nawawalang passphrase ay hindi "buksan mo na lang" —
  // ang page na ito ay hindi dapat mabuksan kailanman nang walang password.
  if (!passphrase) {
    console.error('[api/ops] OPS_PASSPHRASE not configured');
    return res.status(500).json({ error: 'not_configured' });
  }
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[api/ops] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured');
    return res.status(500).json({ error: 'not_configured' });
  }

  const action = typeof req.query?.action === 'string' ? req.query.action : null;

  // --- login / logout ------------------------------------------------------
  if (req.method === 'POST' && action === 'login') {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const given = typeof body.passphrase === 'string' ? body.passphrase : '';
    if (!safeEqual(given, passphrase)) {
      // Walang pagkakaiba sa mensahe kung mali ang password o walang laman.
      return res.status(401).json({ error: 'bad_passphrase' });
    }
    res.setHeader('Set-Cookie', [
      `${COOKIE}=${tokenFor(passphrase)}`,
      'Path=/',
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      'Max-Age=2592000', // 30 araw — hindi na mag-lo-log in araw-araw si Zam
    ].join('; '));
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'POST' && action === 'logout') {
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
    return res.status(200).json({ ok: true });
  }

  // --- lahat ng iba ay kailangan ng cookie ---------------------------------
  if (!isAuthed(req, passphrase)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // Ping: ginagamit ng /presyo para malaman kung buhay ang cookie nang hindi
  // hinihila ang buong roster. Walang laman ang sagot, kaya walang PII dito.
  if (req.method === 'GET' && action === 'ping') {
    return res.status(200).json({ ok: true });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --- listahan ------------------------------------------------------------
  if (req.method === 'GET') {
    const { data, error } = await admin
      .from('funnel_leads')
      .select('id,created_at,name,email,phone,utm,status,amount,address,notes,consent')
      .eq('client_id', funnelConfig.meta.clientId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('[api/ops] db read error:', error.message);
      return res.status(500).json({ error: 'db_read_failed' });
    }
    // no-store: roster ng totoong tao, walang dapat matirang kopya sa
    // anumang cache sa pagitan natin at ng browser ni Zam.
    res.setHeader('Cache-Control', 'no-store, private');
    return res.status(200).json({ leads: data ?? [] });
  }

  // --- pagbabago -----------------------------------------------------------
  if (req.method === 'PATCH') {
    const parsed = Patch.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_body' });
    }
    const { id, ...fields } = parsed.data;
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'nothing_to_update' });
    }

    const { data, error } = await admin
      .from('funnel_leads')
      .update(fields)
      .eq('id', id)
      // Ang pangalawang sala ang pumipigil sa pag-edit ng row ng ibang kliyente
      // kahit tama ang uuid na ipinasa.
      .eq('client_id', funnelConfig.meta.clientId)
      .select('id,status,amount,address,notes')
      .maybeSingle();

    if (error) {
      console.error('[api/ops] db write error:', error.message);
      return res.status(500).json({ error: 'db_write_failed' });
    }
    if (!data) return res.status(404).json({ error: 'not_found' });
    return res.status(200).json({ ok: true, lead: data });
  }

  res.setHeader('Allow', 'GET, POST, PATCH');
  return res.status(405).json({ error: 'method_not_allowed' });
}

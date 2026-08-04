import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findRate } from '../lib/rates.js';
import { CARDS, LUNGSOD_SLOT, OPENING_LINE, type CardId } from '../data/cards.js';

// ===========================================================================
// /ops — ang araw-araw na talaan ni Zam, at ang Tawag Cockpit nya.
//
// Hindi ito dashboard. Ang dashboard ay binabasa; ito ay pinupunan. Bawat lead
// ay may apat na bagay na si Zam ang naglalagay pagkatapos ng tawag: status,
// halaga, address, at notes. Yun ang pinagkaiba ng talaan sa ulat.
//
// 🆕 TAWAG COCKPIT v0 (2026-08-04, clients/oceanides/tawag-cockpit-plan.md).
// Tatlong dagdag, lahat nakasandal sa dating plumbing ng page na to:
//   1. Buhay na page — 60 segundong polling, bilang sa tab title, at tunog na
//      may toggle. Ang sinusukat ay ang bilis ng unang tawag, target sub-15 min.
//   2. Briefing card — isang tingin BAGO tumawag: presyo sa lungsod nya (galing
//      sa src/lib/rates.ts, hindi sa memorya), ang mga sagot nya sa form, at
//      ang bukas na linya.
//   3. Objection cards + log — tatlong malaking button habang may kausap, tapos
//      dalawang pindot pagkatapos: anong objection, kailan ang follow-up.
//
// 🔴 ANG LOG AY PARA SA PAGPAPABUTI NG CARDS, HINDI PANUKAT KAY ZAM. Usapan to
// ni Neil sa kanya sa umpisa, at hindi sya kailanman gagamitin para pagalitan
// sya. Kapag nawala yun, titigil ang pag-log at mamamatay ang buong halaga.
//
// 🔴 ANG BUONG PUNTO AY ANG DALAWANG HANAY NA MAGKATABI: kung saang ad galing
// ang tao (`utm_content`) at kung magkano ang totoong dumating (`amount`).
// Sinasagot nun ang tanong na pumatay sa KM-003 — hindi "aling ad ang may
// murang lead" kundi "aling ad ang may PERA." Nakasulat sa
// workflows/ad_performance_ledger.md bilang A3 ang buong kwento.
//
// CARD, HINDI TABLE. Sa cellphone binubuksan to ni Zam habang nasa tawag sya.
// Ang table sa 375px ay pahalang na scroll, at ang pahalang na scroll habang
// may kausap ka sa telepono ay hindi mabubuksan kailanman.
// ===========================================================================

type Status = 'new' | 'tinawagan' | 'booked' | 'tapos' | 'hindi_natuloy';

/** Kapareho ng sarado nang listahan sa api/ops.ts. Doon sya binabantayan. */
type Objection = 'mahal' | 'schedule' | 'legit' | 'iba' | 'walang_sagot';

interface Lead {
  id: string;
  created_at: string;
  name: string | null;
  email: string;
  phone: string | null;
  utm: Record<string, unknown> | null;
  status: Status;
  amount: number | null;
  address: string | null;
  notes: string | null;
  consent: boolean;
  objection: Objection | null;
  follow_up_at: string | null;
}

/** Ang order dito ang order ng paglalakbay ng lead. Huwag baguhin nang basta. */
const STATUS_ORDER: Status[] = ['new', 'tinawagan', 'booked', 'tapos', 'hindi_natuloy'];

// 🔴 ENGLISH ANG PAGE NA TO, TAGLISH ANG LANDING PAGE. Sinadya, hindi sablay
// (Neil, 2026-08-04). Magkaibang tao ang binabasa nila: ang landing page ay para
// sa may bahay na 35-64 na Pinoy, ang page na to ay panloob na kasangkapan nina
// Zam at Neil. Simpleng English, grade-4 na antas. Huwag mo syang "ayusin"
// pabalik sa Taglish sa pamamagitan ng pagturo sa landing page — magkaibang
// surface sila, magkaibang mambabasa.
//
// Ang mga DB value (`new`, `tinawagan`, `booked`...) ay hindi ginagalaw: nasa
// talaan na sila at ang pagpapalit nun ay migration, hindi label change.
//
// ⚠️ CARVE-OUT: TAGLISH ANG COCKPIT, ENGLISH PA RIN ANG TRACKER. Ang briefing,
// ang cards, at ang objection picklist ay Taglish; ang status, amount, address
// at notes ay nanatiling English. Hindi to kalat. Ang cockpit ay ang SINASABI
// sa telepono at ang mga label na tumuturo dun, at kapag English ang button
// pero Taglish ang laman, dalawang beses nagsasalin si Zam habang may kausap.
// Ang tracker naman ay pinupunan pagkatapos ng tawag, walang binabasa nang
// malakas doon. Wag pagpareho ang dalawa gamit ang isa.
const STATUS_LABEL: Record<Status, string> = {
  new: 'New',
  tinawagan: 'Called',
  booked: 'Booked',
  tapos: 'Done',
  hindi_natuloy: 'Cancelled',
};

// Amber = "tingnan mo ito", hindi status (DESIGN.md). Kaya ang amber ay nasa
// `booked` lang — yun ang tanging estado na may kailangang gawin ngayon.
// Berde ang `tapos` dahil semantiko sya (tapos = good), at dim ang patay.
const STATUS_TONE: Record<Status, string> = {
  new: 'border-white/30 text-brand-on-surface',
  tinawagan: 'border-white/30 text-brand-on-surface-muted',
  booked: 'border-brand-primary text-brand-primary',
  tapos: 'border-brand-good text-brand-good',
  hindi_natuloy: 'border-white/15 text-brand-on-surface-dim',
};

const QUALIFIER_LABEL: Record<string, string> = {
  tank_location: 'Tank',
  role: 'Who',
  city: 'City',
  property: 'Place',
};

/** Ang order ng picklist: pinakamadalas muna. Tatlo sa kanila ay may card. */
const OBJECTION_ORDER: Objection[] = ['mahal', 'schedule', 'legit', 'iba', 'walang_sagot'];

const OBJECTION_LABEL: Record<Objection, string> = {
  mahal: 'Mahal daw',
  schedule: 'Schedule / iisipin',
  legit: 'Legit ba',
  iba: 'Iba pa',
  walang_sagot: 'Di sumagot',
};

const SOUND_KEY = 'oceanides_ops_sound';

const peso = (n: number): string =>
  '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const qualifiersOf = (utm: Lead['utm']): Record<string, string> => {
  const q = utm?.qualifiers;
  return q && typeof q === 'object' ? (q as Record<string, string>) : {};
};

/** Ang utm bag ay naka-store na WALANG `utm_` na unahan — tingnan ang
 *  `captureUtm` sa src/lib/submitLead.ts, tinatanggal nya ang prefix bago
 *  ipadala. Tinatanggap pa rin ang may prefix para sa kahit anong lumang row. */
const utmOf = (utm: Lead['utm'], key: string): string | null => {
  const v = utm?.[key] ?? utm?.[`utm_${key}`];
  return typeof v === 'string' && v ? v : null;
};

const adOf = (utm: Lead['utm']): string | null => utmOf(utm, 'content');

const startOfToday = (): number => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** `<input type="date">` -> ISO. Hatinggabi sa oras ng PC ni Zam, kaya pareho
 *  pa rin ang petsang lumalabas kapag binasa ulit. */
const dateToIso = (v: string): string | null => {
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/** Pabalik: ISO -> ang `YYYY-MM-DD` na hinihingi ng date input. */
const isoToDate = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Ang ipapalit sa `[lungsod]` ng bukas na linya. Kapag "Wala sa listahan" ang
 *  sagot nya o walang sagot, "Metro Manila" ang ilalagay: totoo pa rin sya
 *  (NCR lang ang sakop ng page na to) at hindi nagiging basag ang bungad. */
const lungsodFor = (city: string | null): string =>
  city && city !== 'Wala sa listahan' ? city : 'Metro Manila';

// 🔴 TOGGLE ANG DISENYO, HINDI KULANG NA FEATURE. Hindi papatugtugin ng browser
// ang kahit anong tunog bago may unang pindot ang tao sa page (autoplay policy),
// kaya walang bersyon nito na tumutunog mag-isa pagkabukas ng tab. Ang pindot
// mismo sa toggle ang nag-a-unlock, at yun din ang pruweba na naririnig nya.
//
// Gawa sa code ang tono, walang audio file: nananatiling self-contained ang
// page, at walang dagdag na request sa isang talaan na dapat mabilis buksan.
const beep = (): void => {
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  // Ramp, hindi biglaang bukas-sara: ang square na simula ay nagiging kalampag
  // sa maliliit na speaker ng laptop.
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.34);
  osc.onended = () => void ctx.close();
};

// ---------------------------------------------------------------------------

/** Iisang hugis ng kahon para sa lahat ng pinupunan: text, number, at petsa. */
const INPUT =
  'w-full rounded-brand border-2 border-brand-card-border bg-brand-surface px-3 py-2 text-[15px] text-brand-on-surface placeholder:text-brand-on-surface-dim focus:border-brand-primary focus:outline-none';

/** Maliit na label sa ibabaw ng bawat bloke. Paulit-ulit sya sa page na to. */
const CAP =
  'text-[10px] font-black uppercase leading-none tracking-[1.2px] text-brand-on-surface-dim';

const StatTile: React.FC<{ label: string; value: string; accent?: boolean }> = ({
  label,
  value,
  accent = false,
}) => (
  <div className="rounded-brand border-2 border-brand-card-border bg-brand-card px-4 py-3">
    <p className="text-[10px] font-black uppercase leading-none tracking-[1.4px] text-brand-on-surface-dim">
      {label}
    </p>
    <p
      className={`mt-2 font-display text-[1.75rem] leading-none ${
        accent ? 'text-brand-primary' : 'text-brand-on-surface'
      }`}
    >
      {value}
    </p>
  </div>
);

/** Isang linya ng label + halaga, gaya ng resibo. */
const Row: React.FC<{ k: string; children: React.ReactNode }> = ({ k, children }) => (
  <div className="flex items-baseline gap-3 border-t border-dashed border-brand-hairline py-2">
    <span className="w-24 shrink-0 text-[10px] font-black uppercase leading-none tracking-[1.2px] text-brand-on-surface-dim">
      {k}
    </span>
    {/* 🔴 `[overflow-wrap:anywhere]`, HINDI `break-words`. Magkaiba sila sa
        eksaktong bagay na mahalaga dito: ang `break-word` ay bumabasag lang
        kapag umapaw na, pero HINDI nya pinapaliit ang min-content na lapad ng
        kahon. Kaya ang isang mahabang email ay nagtutulak sa buong card sa
        401px sa loob ng 390px na screen — at dahil grid item ang card na may
        `min-width:auto`, sumusunod ang grid track sa kanya. Ang `anywhere` ay
        nagbabago ng min-content mismo, kaya doon lang natatapos ang problema. */}
    <span className="min-w-0 flex-1 text-[15px] leading-snug text-brand-on-surface-muted [overflow-wrap:anywhere]">
      {children}
    </span>
  </div>
);

const Field: React.FC<{
  label: string;
  value: string;
  placeholder: string;
  multiline?: boolean;
  inputMode?: 'text' | 'decimal';
  onCommit: (v: string) => void;
}> = ({ label, value, placeholder, multiline = false, inputMode = 'text', onCommit }) => {
  const [draft, setDraft] = useState(value);
  // Kapag nagbago ang halaga mula sa labas (ibang tab, na-revert na save),
  // sumusunod ang kahon — pero hindi habang tina-type, kaya nasa `value` lang
  // ang dependency.
  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    if (draft !== value) onCommit(draft);
  };

  return (
    <label className="block">
      <span className={CAP}>{label}</span>
      {multiline ? (
        <textarea
          className={`${INPUT} mt-1.5 min-h-[72px] resize-y`}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
        />
      ) : (
        <input
          className={`${INPUT} mt-1.5`}
          value={draft}
          placeholder={placeholder}
          inputMode={inputMode}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
        />
      )}
    </label>
  );
};

// ---------------------------------------------------------------------------

/** Ang binabasa nang malakas: amber na label, PUTING chat bubble ang laman.
 *  Parehong hugis ng Spiel sa /presyo, sinadya — iisa ang ibig sabihin ng puti
 *  sa dalawang page: ito ang sasabihin mo, hindi label na binabasa mo lang.
 *  `malaki` para sa objection cards: sila ang pinakamalaking teksto sa panel
 *  kasi sila lang ang binabasa habang may kausap. */
const Sabihin: React.FC<{ label: string; text: string; malaki?: boolean }> = ({
  label,
  text,
  malaki = false,
}) => (
  <div className="mt-3">
    <p className="text-[11px] font-black uppercase leading-none tracking-[1.2px] text-brand-primary">
      {label}
    </p>
    <p
      className={`mt-2 rounded-brand rounded-tl-none bg-white px-4 py-3 leading-relaxed text-[#0b1b33] shadow-[0_3px_0_rgba(0,0,0,.3)] ${
        malaki ? 'text-[1.25rem]' : 'text-[15px]'
      }`}
    >
      {text}
    </p>
  </div>
);

/** Ang presyo sa lungsod ng lead. Malaking numero, maikling linya: isang tingin
 *  lang to bago pindutin ang Call, hindi babasahin habang may kausap.
 *
 *  🔴 GALING SA src/lib/rates.ts, HINDI SA MEMORYA. Kapag walang tugma, hindi
 *  sya nanghuhula: sinasabi nya kung saan titingin. Ang maling presyo sa unang
 *  30 segundo ng tawag ay mas mahal kaysa sa isang tab na binuksan. */
const RateBlock: React.FC<{ city: string | null }> = ({ city }) => {
  const hit = city ? findRate(city) : null;

  if (!hit) {
    return (
      <div className="rounded-brand border-2 border-brand-card-border bg-brand-surface px-4 py-3">
        <p className={CAP}>Presyo</p>
        <p className="mt-2 text-[15px] leading-snug text-brand-on-surface-muted">
          Walang rate sa listahan, i-check ang{' '}
          <a href="/presyo" className="font-bold text-brand-primary">
            /presyo
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-brand border-2 border-brand-good bg-brand-surface px-4 py-3">
      <p className={CAP}>
        {hit.place} · {hit.area}
      </p>
      <p className="mt-2 font-display text-[2.25rem] leading-none text-brand-good">{hit.amount}</p>
      <p className="mt-1.5 text-[13px] leading-snug text-brand-on-surface-muted">
        {hit.unit}
        {hit.note ? ` · ${hit.note}` : ''}
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------

const LeadCard: React.FC<{
  lead: Lead;
  onPatch: (id: string, fields: Partial<Lead>) => void;
}> = ({ lead, onPatch }) => {
  const [open, setOpen] = useState(lead.status === 'new');
  // Isa lang ang bukas na card: kapag dalawa, nagsi-scroll na sya ulit.
  const [openCard, setOpenCard] = useState<CardId | null>(null);
  const quals = qualifiersOf(lead.utm);
  const ad = adOf(lead.utm);
  const source = utmOf(lead.utm, 'source');
  const campaign = utmOf(lead.utm, 'campaign');
  const when = new Date(lead.created_at);
  const card = CARDS.find((c) => c.id === openCard) ?? null;
  const opening = OPENING_LINE.replace(LUNGSOD_SLOT, lungsodFor(quals.city ?? null));

  return (
    // `min-w-0` dahil grid item sya: kapag wala, hindi bumababa ang track sa
    // ilalim ng min-content ng pinakamahabang laman sa loob.
    <article className="min-w-0 rounded-brand border-2 border-brand-card-border bg-brand-card">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <h2 className="truncate font-display text-[1.4rem] leading-tight text-brand-on-surface">
            {lead.name?.trim() || 'No name'}
          </h2>
          <p className="mt-1 font-accent text-[12px] text-brand-on-surface-dim">
            {when.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
            {' · '}
            {when.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
            {ad && <> · <span className="text-brand-primary">{ad}</span></>}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-brand border-2 px-2.5 py-1 text-[10px] font-black uppercase leading-none tracking-[1px] ${STATUS_TONE[lead.status]}`}
        >
          {STATUS_LABEL[lead.status]}
        </span>
      </div>

      {/* Ang tawag ang unang galaw palagi, kaya sya ang pinakamalaking pindutan.
          🔴 `min-w-0` + `truncate`: kulang ang `flex-1` mag-isa. Hindi bumababa
          ang flex item sa ilalim ng lapad ng laman nya nang walang `min-w-0`,
          kaya ang mahabang numero ay nagtutulak ng buong card lampas sa screen
          — 421px sa 390px na cellphone, putol ang bawat gilid sa kanan. */}
      <div className="flex gap-2 px-4 pb-3">
        {lead.phone && (
          <a
            href={`tel:${lead.phone.replace(/\s+/g, '')}`}
            className="min-w-0 flex-1 truncate rounded-brand bg-brand-primary px-3 py-2.5 text-center font-display text-[1rem] uppercase leading-none text-[#0b1b33]"
          >
            Call · {lead.phone}
          </a>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-brand border-2 border-brand-card-border px-3 py-2.5 text-[11px] font-black uppercase leading-none tracking-[1px] text-brand-on-surface-muted"
        >
          {open ? 'Close' : 'Open'}
        </button>
      </div>

      {open && (
        <div className="border-t-2 border-dashed border-brand-hairline px-4 pb-4 pt-1">
          {/* --- 1 · BAGO TUMAWAG. Presyo muna bago lahat: yun ang unang tanong
                  sa kabilang linya, at ang paghahanap nun habang nagri-ring ang
                  telepono ang eksaktong sandali na natatalo ang tawag. --- */}
          <div className="mt-3">
            <RateBlock city={quals.city ?? null} />
          </div>

          {lead.email && <Row k="Email">{lead.email}</Row>}
          {Object.entries(quals).map(([k, v]) => (
            <Row key={k} k={QUALIFIER_LABEL[k] ?? k}>
              {v}
            </Row>
          ))}
          {source && <Row k="Source">{source}</Row>}
          {campaign && <Row k="Campaign">{campaign}</Row>}
          {!lead.consent && (
            <Row k="Consent">
              <span className="text-brand-on-surface-dim">
                No tick. You can still call them about the booking.
              </span>
            </Row>
          )}

          <Sabihin label="Bukas na linya" text={opening} />

          {/* --- 2 · HABANG MAY KAUSAP. Tatlong button, isang tap ang layo.
                  Kapag kailangan pang mag-scroll ni Zam habang may kausap,
                  talo ang disenyo. --- */}
          <div className="mt-5">
            <p className={CAP}>Kapag may sinabi sya</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {CARDS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setOpenCard((v) => (v === c.id ? null : c.id))}
                  className={`rounded-brand border-2 px-2 py-3 text-[12px] font-black uppercase leading-tight tracking-[.6px] transition-colors ${
                    openCard === c.id
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-brand-card-border text-brand-on-surface-muted'
                  }`}
                >
                  {c.buttonLabel}
                </button>
              ))}
            </div>
            {card && <Sabihin label={card.buttonLabel} text={card.text} malaki />}
          </div>

          {/* --- 3 · PAGKATAPOS NG TAWAG. Apat na pindot, hindi essay. --- */}
          <div className="mt-5 flex flex-wrap gap-1.5">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onPatch(lead.id, { status: s })}
                className={`rounded-brand border-2 px-2.5 py-1.5 text-[11px] font-black uppercase leading-none tracking-[.8px] transition-colors ${
                  lead.status === s
                    ? STATUS_TONE[s]
                    : 'border-brand-card-border text-brand-on-surface-dim'
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          {/* Objection: ang pangalawang pindot. Pareho ng hugis ng status sa
              itaas, sinadya — isang galaw lang ang natututunan, dalawa ang
              napupunan. Ang pangalawang pindot sa parehong button ay bura, kaya
              walang Clear na hahanapin pa. */}
          <div className="mt-4">
            <p className={CAP}>Anong narinig mo</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {OBJECTION_ORDER.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() =>
                    onPatch(lead.id, { objection: lead.objection === o ? null : o })
                  }
                  className={`rounded-brand border-2 px-2.5 py-1.5 text-[11px] font-black uppercase leading-none tracking-[.8px] transition-colors ${
                    lead.objection === o
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-brand-card-border text-brand-on-surface-dim'
                  }`}
                >
                  {OBJECTION_LABEL[o]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="block">
              <span className={CAP}>Follow-up</span>
              <input
                type="date"
                className={`${INPUT} mt-1.5`}
                value={isoToDate(lead.follow_up_at)}
                onChange={(e) => {
                  const v = e.target.value;
                  onPatch(lead.id, { follow_up_at: v ? dateToIso(v) : null });
                }}
              />
            </label>
            <Field
              label="How much (₱)"
              placeholder="5000"
              inputMode="decimal"
              value={lead.amount === null ? '' : String(lead.amount)}
              onCommit={(v) => {
                const t = v.trim();
                if (t === '') return onPatch(lead.id, { amount: null });
                const n = Number(t.replace(/[^\d.]/g, ''));
                if (Number.isFinite(n)) onPatch(lead.id, { amount: n });
              }}
            />
            <Field
              label="Address"
              placeholder="Where they live"
              value={lead.address ?? ''}
              onCommit={(v) => onPatch(lead.id, { address: v.trim() || null })}
            />
            <Field
              label="Notes"
              placeholder="Anything you want to remember"
              multiline
              value={lead.notes ?? ''}
              onCommit={(v) => onPatch(lead.id, { notes: v.trim() || null })}
            />
          </div>
        </div>
      )}
    </article>
  );
};

// ---------------------------------------------------------------------------

const Login: React.FC<{ onIn: () => void }> = ({ onIn }) => {
  const [pass, setPass] = useState('');
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(false);
    const r = await fetch('/api/ops?action=login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passphrase: pass }),
    }).catch(() => null);
    setBusy(false);
    if (r?.ok) onIn();
    else setErr(true);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-prose items-center px-5">
      <form onSubmit={submit} className="w-full">
        <p className="font-accent text-[11px] font-bold uppercase tracking-[3px] text-brand-primary">
          Oceanides
        </p>
        <h1 className="mt-3 font-display text-[2.5rem] uppercase leading-none text-brand-on-surface">
          Booking list
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-brand-on-surface-muted">
          Real names and numbers are here. That is why it has a password.
        </p>
        <input
          type="password"
          autoFocus
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="Password"
          className="mt-6 w-full rounded-brand border-2 border-brand-card-border bg-brand-card px-4 py-3 text-[16px] text-brand-on-surface placeholder:text-brand-on-surface-dim focus:border-brand-primary focus:outline-none"
        />
        {err && (
          <p className="mt-3 text-[14px] font-bold text-brand-primary">
            Wrong password. Please try again.
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-brand bg-brand-primary px-4 py-3.5 font-display text-[1.3rem] uppercase leading-none text-[#0b1b33] disabled:opacity-60"
        >
          {busy ? 'Wait' : 'Go in'}
        </button>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------

export const Ops: React.FC = () => {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<Status | 'lahat'>('lahat');
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(SOUND_KEY) === 'on';
    } catch {
      // Naka-block ang storage (private window). Patay ang tunog, buhay ang page.
      return false;
    }
  });

  const load = useCallback(async () => {
    const r = await fetch('/api/ops', { headers: { accept: 'application/json' } }).catch(() => null);
    if (r?.status === 401) return setAuthed(false);
    if (!r?.ok) return setAuthed(true); // naka-login pero pumalpak ang basa
    const body = (await r.json()) as { leads: Lead[] };
    setLeads(body.leads);
    setAuthed(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // BUHAY NA PAGE. Kada 60 segundo, walang pindot. Ang sinusukat ng cockpit ay
  // ang bilis ng unang tawag (target sub-15 min sa gising na oras), at ang page
  // na kailangang i-refresh ay page na naaalala lang kapag naalala.
  useEffect(() => {
    if (authed !== true) return;
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [authed, load]);

  const newCount = useMemo(
    () => (leads ?? []).filter((l) => l.status === 'new').length,
    [leads]
  );

  // Ang tab title ang tanging notification sa v0. Nakikita nya sya kahit nasa
  // ibang tab sya, at walang email o SMS na kailangang itayo para dito.
  const baseTitle = useRef(document.title);
  useEffect(() => {
    document.title =
      newCount > 0 ? `(${newCount}) Bagong Lead · ${baseTitle.current}` : baseTitle.current;
  }, [newCount]);

  // Tumutunog lang kapag TUMAAS ang bilang ng bagong lead, hindi sa bawat poll.
  // `null` sa una: ang unang basa ng page ay hindi bagong lead, luma lang na
  // hindi pa nya nakikita.
  const prevNew = useRef<number | null>(null);
  useEffect(() => {
    if (leads === null) return;
    const before = prevNew.current;
    prevNew.current = newCount;
    if (before !== null && newCount > before && soundOn) beep();
  }, [leads, newCount, soundOn]);

  const toggleSound = useCallback(() => {
    setSoundOn((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
      } catch {
        // Walang storage: sa session na to lang tatagal ang setting.
      }
      // Ang tunog sa pagbukas ay dalawang trabaho: nag-a-unlock ng audio para
      // sa browser, at sinasagot ang tanong na "naka-mute ba ang speaker ko?"
      if (next) beep();
      return next;
    });
  }, []);

  // Optimistic: agad na gumagalaw ang UI, at bumabalik lang kapag tumanggi ang
  // server. Sa tawag ginagamit to — ang paghihintay ng round trip bawat pindot
  // ang gagawing hindi nya nagagamit.
  const patch = useCallback(
    async (id: string, fields: Partial<Lead>) => {
      const before = leads;
      setLeads((cur) => cur?.map((l) => (l.id === id ? { ...l, ...fields } : l)) ?? cur);
      const r = await fetch('/api/ops', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, ...fields }),
      }).catch(() => null);
      if (!r?.ok) {
        setLeads(before ?? null);
        if (r?.status === 401) setAuthed(false);
      }
    },
    [leads]
  );

  const stats = useMemo(() => {
    const all = leads ?? [];
    const today0 = startOfToday();
    const week0 = today0 - 6 * 86_400_000;
    const at = (l: Lead) => new Date(l.created_at).getTime();
    return {
      today: all.filter((l) => at(l) >= today0).length,
      week: all.filter((l) => at(l) >= week0).length,
      booked: all.filter((l) => l.status === 'booked' || l.status === 'tapos').length,
      sales: all.reduce((s, l) => s + (l.amount ?? 0), 0),
    };
  }, [leads]);

  const shown = useMemo(
    () => (leads ?? []).filter((l) => filter === 'lahat' || l.status === filter),
    [leads, filter]
  );

  if (authed === null) {
    return (
      <p className="p-8 font-accent text-[12px] uppercase tracking-[2px] text-brand-on-surface-dim">
        Opening
      </p>
    );
  }
  if (authed === false) return <Login onIn={() => void load()} />;

  return (
    <div className="mx-auto max-w-prose px-5 pb-16 pt-8">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-3">
        <div>
          <p className="font-accent text-[11px] font-bold uppercase tracking-[3px] text-brand-primary">
            Oceanides
          </p>
          <h1 className="mt-1.5 font-display text-[2rem] uppercase leading-none text-brand-on-surface">
            Booking list
          </h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            className={`rounded-brand border-2 px-3 py-2 text-[11px] font-black uppercase leading-none tracking-[1px] ${
              soundOn
                ? 'border-brand-good text-brand-good'
                : 'border-brand-card-border text-brand-on-surface-dim'
            }`}
          >
            {soundOn ? 'Tunog: naka-on' : 'Tunog: naka-off'}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-brand border-2 border-brand-card-border px-3 py-2 text-[11px] font-black uppercase leading-none tracking-[1px] text-brand-on-surface-muted"
          >
            Refresh
          </button>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-2.5">
        <StatTile label="Today" value={String(stats.today)} />
        <StatTile label="Last 7 days" value={String(stats.week)} />
        <StatTile label="Booked" value={String(stats.booked)} accent />
        <StatTile label="Total sales" value={peso(stats.sales)} accent />
      </div>

      <div className="mt-6 flex flex-wrap gap-1.5">
        {(['lahat', ...STATUS_ORDER] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-brand border-2 px-3 py-1.5 text-[11px] font-black uppercase leading-none tracking-[.8px] ${
              filter === s
                ? 'border-brand-primary text-brand-primary'
                : 'border-brand-card-border text-brand-on-surface-dim'
            }`}
          >
            {s === 'lahat' ? 'All' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3">
        {shown.length === 0 ? (
          <p className="rounded-brand border-2 border-dashed border-brand-card-border px-4 py-8 text-center text-[15px] text-brand-on-surface-dim">
            {leads === null ? 'Loading' : 'No leads here yet.'}
          </p>
        ) : (
          shown.map((l) => <LeadCard key={l.id} lead={l} onPatch={patch} />)
        )}
      </div>

      <p className="mt-10 border-t border-dashed border-brand-hairline pt-4 text-[13px] leading-relaxed text-brand-on-surface-dim">
        Fill in
        <span className="text-brand-on-surface-muted"> How much </span>
        after every job you finish. That number plus the ad name tells us which ad
        brings real jobs, not just cheap leads.
      </p>
    </div>
  );
};

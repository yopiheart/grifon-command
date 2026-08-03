import React, { useCallback, useEffect, useMemo, useState } from 'react';

// ===========================================================================
// /ops — ang araw-araw na talaan ni Zam.
//
// Hindi ito dashboard. Ang dashboard ay binabasa; ito ay pinupunan. Bawat lead
// ay may apat na bagay na si Zam ang naglalagay pagkatapos ng tawag: status,
// halaga, address, at notes. Yun ang pinagkaiba ng talaan sa ulat.
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
}

/** Ang order dito ang order ng paglalakbay ng lead. Huwag baguhin nang basta. */
const STATUS_ORDER: Status[] = ['new', 'tinawagan', 'booked', 'tapos', 'hindi_natuloy'];

const STATUS_LABEL: Record<Status, string> = {
  new: 'Bago',
  tinawagan: 'Tinawagan',
  booked: 'Naka-book',
  tapos: 'Tapos',
  hindi_natuloy: 'Hindi natuloy',
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
  tank_location: 'Tangke',
  role: 'Sino sya',
  city: 'Siyudad',
  property: 'Property',
};

const peso = (n: number): string =>
  '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const qualifiersOf = (utm: Lead['utm']): Record<string, string> => {
  const q = utm?.qualifiers;
  return q && typeof q === 'object' ? (q as Record<string, string>) : {};
};

const adOf = (utm: Lead['utm']): string | null => {
  const v = utm?.utm_content;
  return typeof v === 'string' && v ? v : null;
};

const startOfToday = (): number => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// ---------------------------------------------------------------------------

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

  const shared =
    'w-full rounded-brand border-2 border-brand-card-border bg-brand-surface px-3 py-2 text-[15px] text-brand-on-surface placeholder:text-brand-on-surface-dim focus:border-brand-primary focus:outline-none';

  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase leading-none tracking-[1.2px] text-brand-on-surface-dim">
        {label}
      </span>
      {multiline ? (
        <textarea
          className={`${shared} mt-1.5 min-h-[72px] resize-y`}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
        />
      ) : (
        <input
          className={`${shared} mt-1.5`}
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

const LeadCard: React.FC<{
  lead: Lead;
  onPatch: (id: string, fields: Partial<Lead>) => void;
}> = ({ lead, onPatch }) => {
  const [open, setOpen] = useState(lead.status === 'new');
  const quals = qualifiersOf(lead.utm);
  const ad = adOf(lead.utm);
  const when = new Date(lead.created_at);

  return (
    // `min-w-0` dahil grid item sya: kapag wala, hindi bumababa ang track sa
    // ilalim ng min-content ng pinakamahabang laman sa loob.
    <article className="min-w-0 rounded-brand border-2 border-brand-card-border bg-brand-card">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <h2 className="truncate font-display text-[1.4rem] leading-tight text-brand-on-surface">
            {lead.name?.trim() || 'Walang pangalan'}
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
            Tawagan · {lead.phone}
          </a>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-brand border-2 border-brand-card-border px-3 py-2.5 text-[11px] font-black uppercase leading-none tracking-[1px] text-brand-on-surface-muted"
        >
          {open ? 'Isara' : 'Buksan'}
        </button>
      </div>

      {open && (
        <div className="border-t-2 border-dashed border-brand-hairline px-4 pb-4 pt-1">
          {lead.email && <Row k="Email">{lead.email}</Row>}
          {Object.entries(quals).map(([k, v]) => (
            <Row key={k} k={QUALIFIER_LABEL[k] ?? k}>
              {v}
            </Row>
          ))}
          {!lead.consent && (
            <Row k="Consent">
              <span className="text-brand-on-surface-dim">
                Hindi nya tinick. Pwede pa ring tawagan para sa booking.
              </span>
            </Row>
          )}

          <div className="mt-4 flex flex-wrap gap-1.5">
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

          <div className="mt-4 grid gap-3">
            <Field
              label="Magkano (₱)"
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
              placeholder="Saan sila nakatira"
              value={lead.address ?? ''}
              onCommit={(v) => onPatch(lead.id, { address: v.trim() || null })}
            />
            <Field
              label="Notes"
              placeholder="Kahit ano"
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
          Talaan ng booking
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-brand-on-surface-muted">
          May pangalan at numero ng totoong tao dito, kaya may password.
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
            Mali ang password. Subukan mo ulit.
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-brand bg-brand-primary px-4 py-3.5 font-display text-[1.3rem] uppercase leading-none text-[#0b1b33] disabled:opacity-60"
        >
          {busy ? 'Sandali' : 'Pasok'}
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
        Binubuksan
      </p>
    );
  }
  if (authed === false) return <Login onIn={() => void load()} />;

  return (
    <div className="mx-auto max-w-prose px-5 pb-16 pt-8">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="font-accent text-[11px] font-bold uppercase tracking-[3px] text-brand-primary">
            Oceanides
          </p>
          <h1 className="mt-1.5 font-display text-[2rem] uppercase leading-none text-brand-on-surface">
            Talaan ng booking
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="shrink-0 rounded-brand border-2 border-brand-card-border px-3 py-2 text-[11px] font-black uppercase leading-none tracking-[1px] text-brand-on-surface-muted"
        >
          Refresh
        </button>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-2.5">
        <StatTile label="Ngayong araw" value={String(stats.today)} />
        <StatTile label="Pitong araw" value={String(stats.week)} />
        <StatTile label="Naka-book" value={String(stats.booked)} accent />
        <StatTile label="Kabuuang benta" value={peso(stats.sales)} accent />
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
            {s === 'lahat' ? 'Lahat' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3">
        {shown.length === 0 ? (
          <p className="rounded-brand border-2 border-dashed border-brand-card-border px-4 py-8 text-center text-[15px] text-brand-on-surface-dim">
            {leads === null ? 'Kinukuha pa' : 'Wala pang lead dito.'}
          </p>
        ) : (
          shown.map((l) => <LeadCard key={l.id} lead={l} onPatch={patch} />)
        )}
      </div>

      <p className="mt-10 border-t border-dashed border-brand-hairline pt-4 text-[13px] leading-relaxed text-brand-on-surface-dim">
        Ang halaga at ang pinanggalingang ad ang magsasabi kung aling ad ang may
        totoong booking, hindi lang kung alin ang may murang lead. Punan mo ang
        <span className="text-brand-on-surface-muted"> Magkano </span>
        kada tapos na trabaho.
      </p>
    </div>
  );
};

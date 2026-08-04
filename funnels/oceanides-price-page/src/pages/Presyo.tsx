import React, { useMemo, useState } from 'react';
import { RATE, checkLocation } from '../lib/rates.js';

// ===========================================================================
// /presyo — ang presyo cheat sheet nina Zam at Ejay.
//
// Ginawa para sa taong NASA TAWAG: type ang lugar, pindot ang problema, kopya
// ang sagot. Walang AI dito, sinadya: sa presyo, ang deterministic na buttons
// ang hindi nagkakamali at hindi nagha-hallucinate ng rate.
//
// 🔴 TAGLISH ANG PAGE NA TO, ENGLISH ANG /ops. Pareho silang sinadya (Neil,
// 2026-08-04): ang /ops ay pinupunan lang, ang /presyo ay BINABASA NANG MALAKAS
// habang may kausap na client, at ang mga spiel ay ipapadala verbatim sa
// Taglish. Wag "ayusin" ang isa gamit ang isa.
//
// 🔴 WALA NA DITO ANG RATES. Nasa src/lib/rates.ts na sila (2026-08-04, Tawag
// Cockpit): ang table, ang aliases, at ang checkLocation. Doon din ang paalala
// na DITO MUNA papasok ang bagong presyo bago sa kahit anong chat o poster.
// Inilipat sila dahil binabasa na rin ng briefing card sa /ops ang parehong
// presyo, at ang dalawang kopya ng rate ay dalawang petsa ng pagbabago.
// Ang laman ng page na to ngayon ay ang mga SPIEL: kung paano sabihin.
// ===========================================================================

// --- spiels -----------------------------------------------------------------

const SPIEL = {
  mmSiphon:
    'Hello po. Para sa septic tank siphoning sa Metro Manila, ang rate po ay ₱5,000 kada truckload, kasya hanggang 4,000 liters. Kasama na po ang tamang pagtatapon ng waste at may 30-day service warranty. Libre po ang pagtingin sa tank, at sasabihin namin ang buong presyo bago magsimula. Anong araw po ang okay sa inyo?',
  city: (city: string, rate: string, note?: string) =>
    `Hello po. Para sa septic tank siphoning sa ${city}, nasa ${rate} po kada truckload, kasya hanggang 4,000 liters. ${note ? note + ' ' : ''}Ico-confirm po namin ang final na presyo bago magsimula, pagkatapos makita ang lugar at ang daanan ng truck. May 30-day service warranty po. Anong araw po ang okay sa inyo?`,
  outside: (loc: string) =>
    `Hello po. Sakop po namin ang ${loc || 'lugar nyo'}, may team po kaming pumupunta dyan. Para maibigay ang tamang presyo, ike-check lang po namin ang lugar, kung anong service ang kailangan, at ang daanan ng truck. Pwede po makuha ang buong address at number nyo? Tatawagan po kayo sa loob ng 1 hanggang 2 oras para sa presyo.`,
  barado:
    'Hello po. Kapag barado ang CR o lababo, minsan po declogging ang kailangan, hindi agad siphoning. Ike-check muna po natin kung sa tubo ang bara o puno na ang septic tank, para hindi po sayang ang bayad nyo. Umaapaw po ba ang septic tank, o ang CR lang po ang barado?',
  balikBalik:
    'Hello po. Kapag bumabalik po ang bara after ng service, minsan may bara sa tubo o tumigas na ang laman ng tank, at hindi ordinaryong siphoning ang lunas dun. Mas okay pong matingnan muna para malaman kung declogging, siphoning, o lusong ang kailangan. Kailan po kayo available?',
  lusongRes:
    'Hello po. Para sa lusong o manual na paglilinis ng septic tank ng bahay, nasa ₱15,000 hanggang ₱20,000 po ang karaniwang presyo, depende sa laki, lalim, at tigas ng laman. Kailangan po munang matingnan para tama ang presyo at ligtas ang trabaho. Kailan po kayo available?',
  lusongComm:
    'Hello po. Para sa company o commercial na manual cleaning, nasa ₱20,000 hanggang ₱50,000 po, depende sa laki, lalim, access, at hirap ng tank. Ia-assess muna po ng team para tama at ligtas ang quote. Saan po ang location ng site?',
  denrRes:
    'Hello po. Para sa siphoning ng bahay na may kasamang DENR na papeles, ₱12,000 po ang standard na rate. Ico-confirm lang po namin ang lugar, ang daanan ng truck, at ilang load ang kailangan bago ang final na booking. Saan po ang buong address nyo?',
  denrComm:
    'Hello po. Para sa company o commercial na service na may DENR na papeles, ₱15,000 po ang standard na rate. Ico-confirm po namin ang laki ng tank, ang access, at ang kailangang dokumento para tama ang final na scope. Pwede po makuha ang location at contact person ng company?',
  discount:
    'Ang rate po namin sa Metro Manila ay ₱5,000 kada truckload, kasya hanggang 4,000 liters, kasama ang tamang pagtatapon ng waste at 30-day warranty. Pare-pareho po ang presyo para malinis at tama ang service sa lahat. Anong araw po ang gusto nyo para ma-check ko ang schedule?',
  maliitTank:
    'Kada truckload po ang bilang, pero ang totoong laman lang po ng tank ang hihigupin, kasya hanggang 4,000 liters. Sa Metro Manila, ₱5,000 po kada load. Anong araw po ang okay sa inyo?',
  anoKasama:
    'Kasama po ang paghigop hanggang 4,000 liters kada truckload, ang tamang pagtatapon ng waste, at ang 30-day service warranty. Sa Metro Manila, ₱5,000 po kada load. Gusto nyo po bang mag-reserve ng schedule?',
};

// 80/20 (Neil, 2026-08-04): pito lang ang talagang kailangan para makapag-book.
// Ang tank size, access, at DENR ay tanong ni Zam sa usapan, hindi na form.
const BOOKING_FORM = [
  'Name:',
  'Number:',
  'Buong address (kasama ang barangay at city):',
  'Landmark:',
  'Bahay o company:',
  'Ano ang problema:',
  'Kailan nyo gusto:',
].join('\n');

// --- maliliit na piyesa -----------------------------------------------------

const CopyBtn: React.FC<{ text: string }> = ({ text }) => {
  const [done, setDone] = useState(false);
  const copy = async () => {
    const ok = await navigator.clipboard?.writeText(text).then(() => true, () => false);
    if (!ok) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={`shrink-0 rounded-brand px-3 py-2 text-[11px] font-black uppercase leading-none tracking-[1px] ${
        done ? 'bg-brand-good text-white' : 'bg-brand-primary text-[#0b1b33]'
      }`}
    >
      {done ? 'Nakopya' : 'Kopyahin'}
    </button>
  );
};

/** Ang ipapadalang sagot: amber na label sa taas, PUTING chat bubble ang laman.
 *  Sinadya ang dalawang kulay (Neil, 2026-08-04): sa isang tingin, kita agad
 *  ni Zam kung alin ang tanong/label at alin ang mismong ikokopya nya. */
const Spiel: React.FC<{ label: string; text: string }> = ({ label, text }) => (
  <div className="mt-4">
    <div className="flex items-center justify-between gap-3">
      <p className="text-[11px] font-black uppercase leading-none tracking-[1.2px] text-brand-primary">
        {label}
      </p>
      <CopyBtn text={text} />
    </div>
    <p className="mt-2 rounded-brand rounded-tl-none bg-white px-4 py-3 text-[15px] leading-relaxed text-[#0b1b33] shadow-[0_3px_0_rgba(0,0,0,.3)]">
      {text}
    </p>
  </div>
);

const Tanong: React.FC<{ items: string[] }> = ({ items }) => (
  <div className="mt-4">
    <p className="text-[10px] font-black uppercase leading-none tracking-[1.2px] text-brand-on-surface-dim">
      Itanong mo bago mag-book
    </p>
    <ul className="mt-2 grid gap-1.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2 text-[14px] leading-snug text-brand-on-surface-muted">
          <span className="text-brand-primary">•</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  </div>
);

const Babala: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-3 rounded-brand border-2 border-brand-primary/60 bg-brand-primary/10 px-3 py-2 text-[13px] leading-snug text-brand-on-surface">
    {children}
  </p>
);

const Kard: React.FC<{ title: string; sub: string; children: React.ReactNode }> = ({
  title,
  sub,
  children,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <article className="min-w-0 rounded-brand border-2 border-brand-card-border bg-brand-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <h2 className="font-display text-[1.25rem] uppercase leading-tight text-brand-on-surface">
            {title}
          </h2>
          <p className="mt-1 text-[13px] leading-snug text-brand-on-surface-dim">{sub}</p>
        </div>
        <span className="shrink-0 rounded-brand border-2 border-brand-card-border px-2.5 py-1.5 text-[11px] font-black uppercase leading-none tracking-[1px] text-brand-on-surface-muted">
          {open ? 'Isara' : 'Buksan'}
        </span>
      </button>
      {open && <div className="border-t-2 border-dashed border-brand-hairline px-4 pb-4 pt-2">{children}</div>}
    </article>
  );
};

const TeamNote: React.FC = () => (
  <Babala>
    Sabihin: <b>"may team po kami dyan."</b> Wag sabihing si Kuya Marvin mismo
    ang pupunta sa labas ng Metro Manila, at wag mangako ng libreng punta o
    libreng check sa labas ng NCR.
  </Babala>
);

// --- login (kapareho ng /ops, iisang cookie) --------------------------------

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
          Presyo cheat sheet
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-brand-on-surface-muted">
          Presyo at proseso ng kompanya ang nandito, kaya may password. Pareho
          sya sa password ng booking list.
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
            Mali ang password. Subukan ulit.
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

// --- ang page ---------------------------------------------------------------

export const Presyo: React.FC = () => {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loc, setLoc] = useState('');
  const verdict = useMemo(() => checkLocation(loc), [loc]);

  React.useEffect(() => {
    void fetch('/api/ops?action=ping', { headers: { accept: 'application/json' } })
      .then((r) => setAuthed(r.status !== 401))
      .catch(() => setAuthed(true));
  }, []);

  if (authed === null) {
    return (
      <p className="p-8 font-accent text-[12px] uppercase tracking-[2px] text-brand-on-surface-dim">
        Binubuksan
      </p>
    );
  }
  if (authed === false) return <Login onIn={() => setAuthed(true)} />;

  return (
    <div className="mx-auto max-w-prose px-5 pb-16 pt-8">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="font-accent text-[11px] font-bold uppercase tracking-[3px] text-brand-primary">
            Oceanides
          </p>
          <h1 className="mt-1.5 font-display text-[2rem] uppercase leading-none text-brand-on-surface">
            Presyo cheat sheet
          </h1>
        </div>
        <a
          href="/ops"
          className="shrink-0 rounded-brand border-2 border-brand-card-border px-3 py-2 text-[11px] font-black uppercase leading-none tracking-[1px] text-brand-on-surface-muted"
        >
          Booking list
        </a>
      </header>

      <Babala>
        Ito ang bagong presyo. <b>₱5,000 na ang lahat ng Metro Manila.</b> Wala
        na ang lumang ₱3,000 / ₱3,500 / ₱4,000, wag na silang gamitin kahit
        nakita mo pa sa lumang chat o poster.
      </Babala>

      {/* ---- 1 · saan ang client ---- */}
      <section className="mt-6 rounded-brand border-2 border-brand-card-border bg-brand-card p-4">
        <h2 className="font-display text-[1.25rem] uppercase leading-tight text-brand-on-surface">
          1 · Saan ang client?
        </h2>
        <p className="mt-1 text-[13px] text-brand-on-surface-dim">
          I-type ang city o province, lalabas ang presyo at ang sagot.
        </p>
        <input
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          placeholder="Hal. Pasig, QC, Bacoor, Lipa, Bulacan"
          className="mt-3 w-full rounded-brand border-2 border-brand-card-border bg-brand-surface px-4 py-3 text-[16px] text-brand-on-surface placeholder:text-brand-on-surface-dim focus:border-brand-primary focus:outline-none"
        />

        {verdict?.kind === 'mm' && (
          <div className="mt-3 rounded-brand border-2 border-brand-good bg-brand-surface p-3">
            <p className="font-display text-[1.1rem] uppercase leading-none text-brand-good">
              {verdict.city} · Metro Manila rate
            </p>
            <p className="mt-2 text-[15px] text-brand-on-surface-muted">
              Siphoning: <b className="text-brand-on-surface">{RATE.mmSiphon}</b>, {RATE.load}.
              Libre ang pagtingin sa tank, may 30-day warranty.
            </p>
            <Spiel label="Ipadala o basahin sa client" text={SPIEL.mmSiphon} />
          </div>
        )}

        {verdict?.kind === 'city' && (
          <div className="mt-3 rounded-brand border-2 border-brand-good bg-brand-surface p-3">
            <p className="font-display text-[1.1rem] uppercase leading-none text-brand-good">
              {verdict.entry.city}, {verdict.province.name} · May rate
            </p>
            <p className="mt-2 text-[15px] text-brand-on-surface-muted">
              Siphoning: <b className="text-brand-on-surface">{verdict.entry.rate} kada truckload</b>.
              {verdict.entry.note ? ` ${verdict.entry.note}` : ''} Kapag range, sabihin ang range,
              tapos final na presyo bago magsimula.
            </p>
            <Spiel
              label="Ipadala o basahin sa client"
              text={SPIEL.city(verdict.entry.city, verdict.entry.rate, verdict.entry.note)}
            />
            <TeamNote />
          </div>
        )}

        {verdict?.kind === 'province' && (
          <div className="mt-3 rounded-brand border-2 border-brand-primary bg-brand-surface p-3">
            <p className="font-display text-[1.1rem] uppercase leading-none text-brand-primary">
              {verdict.province.name} · {verdict.province.region}
            </p>
            <div className="mt-2 overflow-hidden rounded-brand border border-brand-hairline">
              {verdict.province.cities.map((c) => (
                <div
                  key={c.city}
                  className="flex items-baseline justify-between gap-3 border-b border-dashed border-brand-hairline px-3 py-2 last:border-b-0"
                >
                  <span className="text-[13px] font-bold text-brand-on-surface-dim">{c.city}</span>
                  <span className="text-right text-[14px] font-bold text-brand-on-surface">{c.rate}</span>
                </div>
              ))}
            </div>
            <Babala>
              Kapag wala sa listahan ang city ng client pero <b>kalapit lang ng
              mga nandito</b>, gamitin ang rate ng pinakamalapit na city sa
              listahan. Kapag malayo sa lahat, kunin ang info at quote sa loob
              ng 1 hanggang 2 oras.
            </Babala>
            <TeamNote />
          </div>
        )}

        {verdict?.kind === 'outside' && (
          <div className="mt-3 rounded-brand border-2 border-brand-primary bg-brand-surface p-3">
            <p className="font-display text-[1.1rem] uppercase leading-none text-brand-primary">
              Wala sa listahan · Sakop pa rin, quote muna
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-brand-on-surface-muted">
              Nationwide tayo. <b className="text-brand-on-surface">Kapag kalapit
              lang sya ng isang city na may rate sa listahan, gamitin ang rate ng
              pinakamalapit.</b> Kapag hindi, wag manghula: kunin ang buong info,
              tapos sabihing tatawagan sya sa loob ng 1 hanggang 2 oras.
            </p>
            <Spiel label="Ipadala o basahin sa client" text={SPIEL.outside(verdict.typed)} />
            <TeamNote />
            <Tanong
              items={[
                'Buong address: barangay, city, province, landmark',
                'Bahay ba o company',
                'Ano ang problema at anong service ang hinihingi',
                'Gaano kalaki ang tank at madadaanan ba ng truck',
                'Number na matatawagan sa loob ng 1 hanggang 2 oras',
              ]}
            />
          </div>
        )}

        {verdict?.kind === 'ambiguous' && (
          <div className="mt-3 rounded-brand border-2 border-brand-primary bg-brand-surface p-3">
            <p className="text-[15px] leading-relaxed text-brand-on-surface-muted">
              <b className="text-brand-on-surface">Quezon City ba o Quezon
              province?</b> Kapag Quezon City, Metro Manila rate. Kapag Quezon
              province, i-type ang "Lucena" o "Tayabas" para sa rate. Itanong
              muna sa client.
            </p>
          </div>
        )}
      </section>

      {/* ---- 2 · ano ang problema ---- */}
      <h2 className="mt-8 font-display text-[1.5rem] uppercase leading-none text-brand-on-surface">
        2 · Ano ang problema ng client?
      </h2>
      <div className="mt-4 grid gap-3">
        <Kard title="Puno o umaapaw ang septic tank" sub="Siphoning ang kailangan">
          <p className="text-[15px] text-brand-on-surface-muted">
            Metro Manila: <b className="text-brand-on-surface">{RATE.mmSiphon}</b>,{' '}
            {RATE.load}. Sa labas ng NCR, gamitin ang location check sa taas para
            sa kada-city na rate.
          </p>
          <Spiel label="Metro Manila" text={SPIEL.mmSiphon} />
          <Spiel label="Kapag sinabing maliit lang ang tank" text={SPIEL.maliitTank} />
          <Tanong
            items={[
              'Saan ang bahay (city at barangay)',
              'Saan ang tank at madadaanan ba ng truck at hose',
              'Kailan huling nagpa-siphon',
              'Umaapaw na ba o mabagal pa lang ang flush',
            ]}
          />
        </Kard>

        <Kard title="Barado ang CR, lababo, o drain" sub="Baka declogging, hindi siphoning">
          <p className="text-[15px] text-brand-on-surface-muted">
            Walang fixed na rate dito. I-check muna kung sa tubo ang bara o puno
            ang tank, tapos ipa-quote sa team.
          </p>
          <Spiel label="Ipadala o basahin sa client" text={SPIEL.barado} />
          <Babala>
            Wag sabihin kailanman na siguradong maaayos ng siphoning ang barado
            na tubo. Magkaibang problema ang barado at puno.
          </Babala>
          <Tanong
            items={[
              'Isang CR lang ba o lahat ng drain sa bahay',
              'Bumabalik ba ang tubig sa ibang drain',
              'Umaapaw ba ang septic tank',
              'May amoy ba kahit hindi umuulan',
            ]}
          />
        </Kard>

        <Kard title="Paulit-ulit ang bara" sub="Assessment muna bago ang kahit ano">
          <p className="text-[15px] text-brand-on-surface-muted">
            Kapag bumabalik ang bara, maraming drain ang apektado, o kaka-siphon
            lang pero may problema ulit: wag pumili ng service agad, ipa-check.
          </p>
          <Spiel label="Ipadala o basahin sa client" text={SPIEL.balikBalik} />
        </Kard>

        <Kard title="Matigas o siksik na ang laman" sub="Lusong / manual cleaning">
          <p className="text-[15px] text-brand-on-surface-muted">
            Bahay: <b className="text-brand-on-surface">{RATE.lusongRes}</b>.
            Company o commercial:{' '}
            <b className="text-brand-on-surface">{RATE.lusongComm}</b>. Ang final
            na presyo ay depende sa laki, lalim, tigas ng laman, access, at
            hirap.
          </p>
          <Spiel label="Bahay" text={SPIEL.lusongRes} />
          <Spiel label="Company o commercial" text={SPIEL.lusongComm} />
          <Babala>
            Wag mangako ng pinakamababang presyo bago ang assessment. Range
            muna, tapos assessment, saka final.
          </Babala>
        </Kard>

        <Kard title="Kailangan ng DENR papers para sa trabaho" sub="May sariling rate">
          <p className="text-[15px] text-brand-on-surface-muted">
            Siphoning na may kasamang DENR na dokumento para sa trabahong yun:
            bahay <b className="text-brand-on-surface">{RATE.denrRes}</b>, company{' '}
            <b className="text-brand-on-surface">{RATE.denrComm}</b>.
          </p>
          <Spiel label="Bahay" text={SPIEL.denrRes} />
          <Spiel label="Company o commercial" text={SPIEL.denrComm} />
          <Babala>
            Iba ang DENR credential ng kompanya sa dokumentong hinihingi ng
            client para sa trabaho nila. Ang rates dito ay para sa hinihinging
            dokumento. Kapag nalilito, i-message si Neil.
          </Babala>
        </Kard>

        <Kard title="Tanong sa presyo: mahal, discount, ano kasama" sub="Ready na sagot">
          <Spiel label="Humihingi ng discount" text={SPIEL.discount} />
          <Spiel label="Ano ang kasama sa bayad" text={SPIEL.anoKasama} />
        </Kard>
      </div>

      {/* ---- 3 · presyo sa isang tingin ---- */}
      <h2 className="mt-8 font-display text-[1.5rem] uppercase leading-none text-brand-on-surface">
        3 · Presyo sa isang tingin
      </h2>
      <div className="mt-4 overflow-hidden rounded-brand border-2 border-brand-card-border">
        {[
          ['Siphoning, Metro Manila', `${RATE.mmSiphon} · ${RATE.load}`],
          ['Siphoning, mga province na nakalista', 'Kada city ang rate. I-type ang city sa location check sa taas'],
          ['Siphoning, wala sa listahan', 'Kalapit ng nakalista: rate ng pinakamalapit. Kung hindi: quote sa 1 hanggang 2 oras'],
          ['May DENR papers, bahay', RATE.denrRes],
          ['May DENR papers, company', RATE.denrComm],
          ['Lusong, bahay', RATE.lusongRes],
          ['Lusong, company', RATE.lusongComm],
          ['Declogging / plumbing', 'I-assess muna, walang fixed rate dito'],
          ['Warranty', '30-day service warranty sa siphoning, subject sa terms'],
        ].map(([k, v]) => (
          <div
            key={k}
            className="flex items-baseline justify-between gap-3 border-b border-dashed border-brand-hairline bg-brand-card px-4 py-2.5 last:border-b-0"
          >
            <span className="text-[13px] font-bold text-brand-on-surface-dim">{k}</span>
            <span className="text-right text-[14px] font-bold text-brand-on-surface">{v}</span>
          </div>
        ))}
      </div>

      {/* ---- 4 · booking form ---- */}
      <h2 className="mt-8 font-display text-[1.5rem] uppercase leading-none text-brand-on-surface">
        4 · Booking form, kopyahin
      </h2>
      <div className="mt-4 rounded-brand border-2 border-brand-card-border bg-brand-card p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] text-brand-on-surface-dim">
            I-paste sa chat tapos punan kasama ng client. Pito lang, sadya:
            ang tank size, access, at DENR ay itatanong mo na lang sa usapan.
          </p>
          <CopyBtn text={BOOKING_FORM} />
        </div>
        <pre className="mt-3 whitespace-pre-wrap rounded-brand bg-white px-4 py-3 text-[14px] leading-relaxed text-[#0b1b33]">
          {BOOKING_FORM}
        </pre>
      </div>

      {/* ---- 5 · kailan magtanong muna ---- */}
      <h2 className="mt-8 font-display text-[1.5rem] uppercase leading-none text-brand-on-surface">
        5 · I-message muna si Neil kapag
      </h2>
      <ul className="mt-4 grid gap-1.5 rounded-brand border-2 border-brand-card-border bg-brand-card p-4">
        {[
          'Labas ng Metro Manila at may DENR papers na hinihingi',
          'Mukhang lagpas sa isang truckload (maliban sa Aurora na talagang minimum 3)',
          'Mahirap ang daanan ng truck o hose',
          'Sobrang laki ng tank o factory ang usapan',
          'May hinihinging ibang dokumento o special na tapunan',
          'May humihinging presyo na wala sa page na to',
        ].map((t) => (
          <li key={t} className="flex gap-2 text-[14px] leading-snug text-brand-on-surface-muted">
            <span className="text-brand-primary">•</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>

      {/* ---- 6 · mga bawal ---- */}
      <h2 className="mt-8 font-display text-[1.5rem] uppercase leading-none text-brand-on-surface">
        6 · Mga bawal
      </h2>
      <ul className="mt-4 grid gap-1.5 rounded-brand border-2 border-brand-card-border bg-brand-card p-4">
        {[
          'Wag gamitin ang lumang presyo. ₱5,000 na ang buong Metro Manila.',
          'Wag manghula ng presyo sa lugar na wala sa listahan at malayo sa lahat ng nakalista.',
          'Wag mangako ng pinakamurang lusong bago ang assessment.',
          'Wag sabihing sigurado nang maaayos ng siphoning ang barado na tubo.',
          'Wag mangako ng eksaktong araw nang hindi che-check ang schedule.',
          'Walang pekeng "ngayon lang" o pekeng promo.',
          'Wag sabihin kahit kailan ang gastos o kita ng kompanya.',
          'Laging may isang tanong sa dulo ng bawat sagot: susunod na hakbang.',
        ].map((t) => (
          <li key={t} className="flex gap-2 text-[14px] leading-snug text-brand-on-surface-muted">
            <span className="text-brand-primary">✕</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>

      <p className="mt-10 border-t border-dashed border-brand-hairline pt-4 text-[13px] leading-relaxed text-brand-on-surface-dim">
        Ito ang source of truth ng presyo. Kapag may bago si Neil na rate, dito
        muna sya papasok bago sa kahit anong chat. Huling bago: 2026-08-04
        (provincial city rates, dagdag ₱1,500 na lahat).
      </p>
    </div>
  );
};

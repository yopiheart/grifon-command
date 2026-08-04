// ===========================================================================
// rates.ts — ang presyo at ang paghahanap ng lugar. Isang file lang.
//
// 🔴 ANG FILE NA TO ANG SOURCE OF TRUTH NG PRESYO para kina Zam. Kapag may
// binago si Neil sa rates, DITO muna bago sa kahit anong chat o poster.
// Pinagmulan: nationwide pricing brief ni Neil 2026-08-04 + provincial na city
// list ni Neil (parehong araw). 🔴 ANG LAHAT NG PROVINCIAL RATE DITO AY MAY
// DAGDAG NANG ₱1,500 sa raw na listahan ni Neil — huwag nang dagdagan ulit.
// WALANG internal na puhunan o tubo dito, sinadya: customer-facing na presyo
// lang ang laman, kahit nasa likod pa ng password.
//
// 🔴 DALAWA NA ANG BUMABASA NITO: ang /presyo cheat sheet (tina-type ni Zam ang
// lugar) at ang Tawag Cockpit sa /ops (galing sa `city` na sinagot ng lead).
// Kaya sya inilabas ng Presyo.tsx: ang lumang presyo sa briefing card ay hindi
// napipigilan ng paalala, napipigilan sya ng iisang pinagmulan.
// ===========================================================================

// --- lugar ------------------------------------------------------------------

/** Lahat ng NCR city + Pateros. Ang susi ay normalized (maliit, walang ñ). */
const NCR: Record<string, string> = {
  manila: 'Manila', maynila: 'Manila',
  'quezon city': 'Quezon City', qc: 'Quezon City', kyusi: 'Quezon City',
  caloocan: 'Caloocan', kalookan: 'Caloocan', kalokan: 'Caloocan',
  'las pinas': 'Las Piñas', laspinas: 'Las Piñas',
  makati: 'Makati',
  malabon: 'Malabon',
  mandaluyong: 'Mandaluyong',
  marikina: 'Marikina',
  muntinlupa: 'Muntinlupa',
  navotas: 'Navotas',
  paranaque: 'Parañaque',
  pasay: 'Pasay',
  pasig: 'Pasig',
  pateros: 'Pateros',
  'san juan': 'San Juan',
  taguig: 'Taguig', bgc: 'Taguig',
  valenzuela: 'Valenzuela',
};

/** Kada city sa labas ng NCR na may sariling rate (galing kay Neil, +₱1,500 na). */
export interface CityRate {
  city: string;
  rate: string;
  note?: string;
  aliases?: string[];
}
export interface Province {
  name: string;
  region: string;
  cities: CityRate[];
}

export const PROVINCES: Province[] = [
  {
    name: 'Aurora', region: 'Central Luzon',
    cities: [
      { city: 'Baler', rate: '₱13,500', note: 'Minimum 3 truckloads dahil sa layo.' },
      { city: 'Ibang bayan ng Aurora', rate: '₱13,500', note: 'Minimum 3 truckloads dahil sa layo.', aliases: ['aurora'] },
    ],
  },
  {
    name: 'Bataan', region: 'Central Luzon',
    cities: [
      { city: 'Balanga', rate: '₱6,000 hanggang ₱6,500' },
      { city: 'Dinalupihan', rate: '₱6,000 hanggang ₱6,500' },
      { city: 'Mariveles', rate: '₱7,500 hanggang ₱8,500' },
    ],
  },
  {
    name: 'Bulacan', region: 'Central Luzon',
    cities: [
      { city: 'Malolos', rate: '₱4,500 hanggang ₱5,500' },
      { city: 'Meycauayan', rate: '₱4,500 hanggang ₱5,500' },
      { city: 'San Jose del Monte', rate: '₱5,000 hanggang ₱6,000', aliases: ['sjdm'] },
    ],
  },
  {
    name: 'Nueva Ecija', region: 'Central Luzon',
    cities: [
      { city: 'Cabanatuan', rate: '₱6,500 hanggang ₱7,500' },
      { city: 'Gapan', rate: '₱6,500 hanggang ₱7,500' },
      { city: 'Muñoz', rate: '₱8,500 hanggang ₱9,000', aliases: ['munoz'] },
      { city: 'Palayan', rate: '₱9,000 hanggang ₱9,500' },
      { city: 'San Jose City', rate: '₱9,000 hanggang ₱9,500' },
    ],
  },
  {
    name: 'Pampanga', region: 'Central Luzon',
    cities: [
      { city: 'Angeles City', rate: '₱6,500', aliases: ['angeles'] },
      { city: 'Mabalacat', rate: '₱5,500 hanggang ₱6,000' },
      { city: 'San Fernando', rate: '₱5,500' },
    ],
  },
  {
    name: 'Tarlac', region: 'Central Luzon',
    cities: [{ city: 'Tarlac City', rate: '₱6,500 hanggang ₱7,500', aliases: ['tarlac'] }],
  },
  {
    name: 'Zambales', region: 'Central Luzon',
    cities: [{ city: 'Olongapo City', rate: '₱8,000 hanggang ₱8,500', aliases: ['olongapo'] }],
  },
  {
    name: 'Cavite', region: 'CALABARZON',
    cities: [
      { city: 'Bacoor', rate: '₱5,000 hanggang ₱5,500' },
      { city: 'Cavite City', rate: '₱5,000 hanggang ₱5,500' },
      { city: 'Dasmariñas', rate: '₱5,000 hanggang ₱5,500', aliases: ['dasma', 'dasmarinas'] },
      { city: 'General Trias', rate: '₱5,000 hanggang ₱5,500', aliases: ['gentri'] },
      { city: 'Imus', rate: '₱5,000 hanggang ₱5,500' },
      { city: 'Noveleta', rate: '₱5,000 hanggang ₱5,500' },
      { city: 'Tagaytay', rate: '₱6,500 hanggang ₱7,500' },
      { city: 'Trece Martires', rate: '₱6,500 hanggang ₱7,500', aliases: ['trece'] },
    ],
  },
  {
    name: 'Laguna', region: 'CALABARZON',
    cities: [
      { city: 'Biñan', rate: '₱5,000 hanggang ₱5,500', aliases: ['binan'] },
      { city: 'Cabuyao', rate: '₱5,500' },
      { city: 'Calamba', rate: '₱5,500 hanggang ₱6,000' },
      { city: 'San Pablo', rate: '₱6,500 hanggang ₱7,500' },
      { city: 'Santa Rosa', rate: '₱5,000 hanggang ₱5,500', aliases: ['sta rosa'] },
      { city: 'San Pedro', rate: '₱5,000 hanggang ₱5,500' },
    ],
  },
  {
    name: 'Batangas', region: 'CALABARZON',
    cities: [
      { city: 'Batangas City', rate: '₱7,000 hanggang ₱7,500' },
      { city: 'Lipa', rate: '₱6,000 hanggang ₱7,000' },
      { city: 'Tanauan', rate: '₱6,000 hanggang ₱7,000' },
    ],
  },
  {
    name: 'Rizal', region: 'CALABARZON',
    cities: [
      { city: 'Antipolo', rate: '₱5,500 hanggang ₱6,000' },
      { city: 'Taytay', rate: '₱5,500 hanggang ₱6,000' },
      { city: 'Cainta', rate: '₱5,500 hanggang ₱6,000' },
      { city: 'Montalban / Rodriguez', rate: '₱5,500 hanggang ₱6,000', aliases: ['montalban', 'rodriguez'] },
      { city: 'San Mateo', rate: '₱5,500 hanggang ₱6,000' },
      { city: 'Binangonan', rate: '₱5,000 hanggang ₱5,500' },
      { city: 'Ibang bayan ng Rizal', rate: '₱5,000 hanggang ₱5,500', aliases: ['rizal'] },
    ],
  },
  {
    name: 'Quezon Province', region: 'CALABARZON',
    cities: [
      { city: 'Lucena', rate: '₱7,500 hanggang ₱8,500' },
      { city: 'Tayabas', rate: '₱7,500 hanggang ₱8,500' },
    ],
  },
];

const normalize = (s: string): string =>
  s
    .toLowerCase()
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** alias (normalized) -> tinuturo. Mahaba muna ang susi para hindi unahan ng
 *  maikli ("san jose city" bago ang "san jose del monte" lookup order ay ayos
 *  dahil buong susi ang tinutugma, hindi prefix). */
const CITY_INDEX: Array<{ key: string; province: Province; entry: CityRate }> = [];
for (const p of PROVINCES) {
  for (const c of p.cities) {
    const keys = [normalize(c.city), ...(c.aliases ?? []).map(normalize)];
    for (const key of keys) CITY_INDEX.push({ key, province: p, entry: c });
  }
}
CITY_INDEX.sort((a, b) => b.key.length - a.key.length);

const PROVINCE_INDEX: Record<string, Province> = {};
for (const p of PROVINCES) PROVINCE_INDEX[normalize(p.name)] = p;
PROVINCE_INDEX['quezon province'] = PROVINCE_INDEX['quezon province'] ?? PROVINCES[PROVINCES.length - 1];

export type LocVerdict =
  | { kind: 'mm'; city: string }
  | { kind: 'city'; province: Province; entry: CityRate }
  | { kind: 'province'; province: Province }
  | { kind: 'outside'; typed: string }
  | { kind: 'ambiguous' }
  | null;

export const checkLocation = (raw: string): LocVerdict => {
  const n = normalize(raw);
  if (n.length < 3) return null;
  // "quezon city" bago ang "quezon": magkaibang lugar sila.
  if (n.includes('quezon city') || n === 'qc' || n === 'kyusi') {
    return { kind: 'mm', city: 'Quezon City' };
  }
  if (n === 'quezon') return { kind: 'ambiguous' };
  const stripped = n.replace(/\bcity\b/g, '').replace(/\s+/g, ' ').trim();

  // 1 · NCR
  for (const key of [n, stripped]) {
    if (NCR[key]) return { kind: 'mm', city: NCR[key] };
  }
  for (const [key, city] of Object.entries(NCR)) {
    if (key.length >= 5 && (` ${n} `).includes(` ${key} `)) return { kind: 'mm', city };
  }

  // 2 · city na may sariling rate (exact muna, tapos nasa loob ng address)
  for (const { key, province, entry } of CITY_INDEX) {
    if (n === key || stripped === key) return { kind: 'city', province, entry };
  }
  for (const { key, province, entry } of CITY_INDEX) {
    if (key.length >= 5 && (` ${n} `).includes(` ${key} `)) return { kind: 'city', province, entry };
  }

  // 3 · province lang ang na-type
  for (const [key, province] of Object.entries(PROVINCE_INDEX)) {
    if (n === key || (` ${n} `).includes(` ${key} `)) return { kind: 'province', province };
  }

  return { kind: 'outside', typed: raw.trim() };
};

// --- presyo -----------------------------------------------------------------

// Hiwalay ang halaga sa unit para may iisang pinagmulan pa rin ang ₱5,000 kahit
// dalawa ang hugis na kailangan: buong pangungusap sa /presyo, malaking numero
// lang sa briefing card ng cockpit.
const MM_AMOUNT = '₱5,000';
const PER_LOAD = 'kada truckload';

export const RATE = {
  mmSiphon: `${MM_AMOUNT} ${PER_LOAD}`,
  load: 'hanggang 4,000 liters (4 cubic meters) kada load',
  denrRes: '₱12,000',
  denrComm: '₱15,000',
  lusongRes: '₱15,000 hanggang ₱20,000',
  lusongComm: '₱20,000 hanggang ₱50,000',
};

/** Ang sagot ng `findRate`, hinati na para may malaking numero ang cockpit. */
export interface RateHit {
  /** Ang lugar na tumugma, hindi ang tinype. */
  place: string;
  /** Metro Manila, o ang province ng city. */
  area: string;
  /** '₱5,000' o '₱6,000 hanggang ₱6,500'. */
  amount: string;
  unit: string;
  note?: string;
}

/**
 * Isang lugar papasok, isang presyo palabas. Ito ang binubuksan ng Tawag
 * Cockpit gamit ang `city` na sinagot mismo ng lead sa form.
 *
 * `null` ang sagot kapag walang katiyakan: province lang ang alam, Quezon na
 * hindi malinaw, o wala talaga sa listahan. Sinadya na walang hula dito. Ang
 * kalapit-lugar na fallback ay desisyon ng tao (nasa /presyo ang paalala kung
 * paano), at ang hulang presyo sa gitna ng tawag ay mas mahal kaysa sa
 * pagsabing titingnan ko lang.
 */
export const findRate = (cityRaw: string): RateHit | null => {
  const verdict = checkLocation(cityRaw);
  if (verdict?.kind === 'mm') {
    return { place: verdict.city, area: 'Metro Manila', amount: MM_AMOUNT, unit: PER_LOAD };
  }
  if (verdict?.kind === 'city') {
    return {
      place: verdict.entry.city,
      area: verdict.province.name,
      amount: verdict.entry.rate,
      unit: PER_LOAD,
      note: verdict.entry.note,
    };
  }
  return null;
};

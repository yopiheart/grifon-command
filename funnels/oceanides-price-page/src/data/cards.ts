// ===========================================================================
// cards.ts — ang deck ng Tawag Cockpit. Si Zam ang nagsasalita, kausap ang lead
// sa telepono.
//
// 🔴 APROBADO NG SALITA PER SALITA (Neil, 2026-08-04: "Okay na to. Approved").
// Kopya to ng §5 ng clients/oceanides/tawag-cockpit-plan.md. Wag i-rewrite, wag
// "ayusin", wag i-translate. Kapag may bagong objection na lumabas sa tawag:
// ilo-log ni Zam, magda-draft ang AI, si Neil ang mag-a-approve, saka lang sya
// papasok dito. Ganyan lumalago ang playbook, at yun din ang nagpapanatiling
// totoo ng bawat linya sa ibaba.
//
// Boses: kalmadong eksperto, hindi masiglang salesman. Walang em dash, walang
// apostrophe sa contractions (nyo, yun, di).
// ===========================================================================

export type CardId = 'mahal' | 'schedule' | 'legit';

export interface TawagCard {
  id: CardId;
  /** Ang nasa button. Maikli, kasi tatlo sila sa isang hanay habang may tawag. */
  buttonLabel: string;
  /** Ang binabasa. Malaki sa screen, kaya walang scroll habang may kausap. */
  text: string;
}

/** Ang bukas na linya sa outbound na tawag. Ang `[lungsod]` ay pinapalitan ng
 *  city na sinagot mismo ng lead sa form. */
export const OPENING_LINE =
  'Hello po, si Zam po to ng Oceanides. Nakita ko po yung form nyo sa website namin, yung sa [lungsod] po. Tinawagan ko po kayo para masagot agad kung magkano at kung kailan kami pwede. Ilang minuto lang po to.';

/** Ang palitan sa `OPENING_LINE`. Nasa isang lugar para pareho ang hugis nya
 *  kahit saan gamitin. */
export const LUNGSOD_SLOT = '[lungsod]';

export const CARDS: TawagCard[] = [
  {
    id: 'mahal',
    buttonLabel: 'Mahal daw',
    text: 'Ganyan po ang presyo kasi kasama na lahat: hose ng truck, before at after na litrato ng tank nyo, 30-day warranty kung bumalik ang bara, at BIR receipt. Walang dagdag na singil pagdating ng truck, nakasulat na presyo bago kami magsimula. Yung mas mura po, kadalasan may dagdag pa sa hose tapos di nyo alam kung saan itinatapon. Sa amin po, DENR-partner facility ang tapunan.',
  },
  {
    id: 'schedule',
    buttonLabel: 'Kailan / Iisipin ko',
    text: 'Sige po, walang problema. Isang bagay lang po: kapag umapaw na, mas magastos na po yun kasi may lilinisin pa. Kung gusto nyo po, i-hold ko na ang schedule nyo ngayon, libre ang pag-hold, tapos text nyo na lang ako kung tuloy. Anong araw po ang maganda sa inyo?',
  },
  {
    id: 'legit',
    buttonLabel: 'Legit ba',
    text: 'Kumpleto po ang papeles namin: DENR ang tapunan, may Certificate of Treatment kami, at BIR official receipt ang matatanggap nyo. Nasa website po namin lahat. At bago kami magsimula, nakasulat na po ang presyo, para walang gulatan.',
  },
];

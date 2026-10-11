const keyDrawing = `<svg viewBox="0 0 520 740" role="img" aria-label="Illustrated house key"><g fill="none" stroke="currentColor" stroke-width="35" stroke-linejoin="round"><circle cx="245" cy="165" r="125"/><circle cx="245" cy="165" r="46" stroke-width="20"/><path d="M245 291v365h140v-75h-70v-70h-70"/></g></svg>`;
const homeDrawing = `<svg viewBox="0 0 980 700" role="img" aria-label="Conceptual miniature house illustration"><path fill="#DFE8F5" d="M45 522 466 305 940 517 516 690Z"/><path fill="#FFFFFF" d="M215 310 535 150 535 505 215 665Z"/><path fill="#8FB3DD" d="M535 150 825 305 825 640 535 505Z"/><path fill="#0A1F45" d="m135 306 302-236 178 87-320 235Z"/><path fill="#0E2C5E" d="m437 70 288 153 180 167-290-153Z"/><path fill="#F5B301" d="M350 443 450 393 450 548 350 598Z"/><path fill="#0E2C5E" d="M590 320 670 363 670 455 590 414ZM714 386 780 422 780 514 714 478Z"/><path fill="#FFFFFF" d="m615 261 65 35v-130l-65-36Z"/><path fill="none" stroke="#0A1F45" stroke-width="5" d="m45 522 471 168 424-173M215 665V310M535 505V150"/><path fill="none" stroke="#1C63AD" stroke-width="5" stroke-dasharray="14 12" d="m110 560 118-62m600 53 70 37"/></svg>`;
const cutawayDrawing = `<svg viewBox="0 0 1080 700" role="img" aria-label="Conceptual house and unknown tank location below ground"><path fill="#FFFFFF" d="M90 303V145l180-112 180 112v158Z"/><path fill="#0A1F45" d="m48 148 222-136 222 136-30 46L270 77 78 194Z"/><path fill="#F5B301" d="M229 212h85v91h-85Z"/><path fill="#8FB3DD" d="M125 186h63v62h-63ZM354 186h63v62h-63Z"/><path fill="#DFE8F5" d="M0 304h1080v396H0Z"/><path stroke="#0E2C5E" stroke-width="7" d="M0 305h1080"/><path fill="none" stroke="#0E2C5E" stroke-width="5" stroke-dasharray="18 15" d="M340 354h580v230H340Z"/><path fill="none" stroke="#8FB3DD" stroke-width="3" d="M55 394h145m-95 65h90m-90 101h136m728-189h56m-51 114h66M260 626h130m300 22h230"/><path fill="none" stroke="#0E2C5E" stroke-width="5" stroke-dasharray="13 13" d="M270 311v123h70"/><path fill="none" stroke="#F5B301" stroke-width="12" d="M550 333h135"/></svg>`;
const boardArrows = `<svg class="board-arrows" viewBox="0 0 900 510" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><path d="M430 25c-175 30-220 70-220 141m-22-24 23 25 21-28M500 55c210 15 251 70 244 151m-21-26 20 28 25-21M510 220c-17 89-72 122-154 150m16-28-19 29 31 9"/></g></svg>`;
const folderDrawing = `<svg class="folder-outline" viewBox="0 0 960 600" aria-hidden="true"><path fill="#FFFFFF" stroke="#0A1F45" stroke-width="8" stroke-linejoin="round" d="m29 115 9-77 283 6 82 81 509-9 12 431-891 14Z"/><path fill="none" stroke="#0A1F45" stroke-width="6" d="m30 116 883 1M48 567l870-9"/><path fill="none" stroke="#F5B301" stroke-width="13" stroke-linecap="round" d="m612 83 263 3m-270 13 215 5"/></svg>`;

export function renderVarietyCanvas(post, assets, { brand, footer, photo, escape }) {
  const headline = (html) => `<h1>${html}</h1>`;
  const support = (classes = '') => `<p class="variety-support ${classes}">${escape(post.support)}</p>`;
  const templates = {
    '07': () => `${brand(assets.logo, 'PARA SA TENANT')}
      <section class="tenant-title">${headline('NANGUNGUPAHAN<br><em>KA?</em>')}</section>
      <div class="tenant-note"><span class="tenant-tab">OWNER /<br>MANAGER</span>${support()}<p class="tenant-small">Sino ang<br>mag-aapprove?</p></div>
      <figure class="tenant-property"><div class="tenant-home">${homeDrawing}</div><div class="tenant-key">${keyDrawing}</div><figcaption>CONCEPTUAL ILLUSTRATION</figcaption><span class="portrait-corner"></span></figure>
      ${footer('ISAMA ANG OWNER SA USAPAN')}`,
    '08': () => `${brand(assets.logo, 'BUSINESS / BUILDING')}
      <div class="notice-wall" aria-hidden="true"><span></span><span></span><span></span></div>
      <section class="business-poster"><p class="poster-kicker">PARA SA NAKA-ASSIGN</p>${headline('IKAW ANG<br>NAKA-ASSIGN?')}<div class="poster-rule"></div>${support()}<div class="poster-details"><p>Oras ng operations</p><p>Kausap sa site</p><p>Approval ng admin</p></div><p class="poster-foot">Ipa-confirm ang schedule.</p></section>
      ${footer('GABAY SA MAINTENANCE INQUIRY')}`,
    '09': () => `${brand(assets.logo, 'OKAY LANG KUNG HINDI SURE')}
      <section class="unknown-title">${headline('HINDI SURE<br>SA <em>TANGKE?</em>')}</section>
      <div class="unknown-cutaway">${cutawayDrawing}<span class="unknown-question">?</span><p class="cutaway-caption">CONCEPTUAL ILLUSTRATION</p></div>
      <div class="unknown-close">${support()}<p>Size. Location. Huling service.</p></div>
      ${footer('INFO MUNA, HINDI HULA')}`,
    '10': () => `${brand(assets.logo, 'OBSERVATION MUNA')}
      <section class="observation-board"><div class="board-title">${headline('ISA LANG<br>ANG BARADO?')}<span class="board-underline"></span></div>${boardArrows}<p class="board-note board-kitchen">Kitchen<br>sink?</p><p class="board-note board-cr">CR?</p><p class="board-note board-other">Iba pang<br>area?</p><div class="board-close">${support()}<p>Mga observation muna,<br>hindi diagnosis.</p></div></section>
      ${footer('SAAN / KAILAN / ANO ANG NAPANSIN')}`,
    '11': () => `${brand(assets.logo, 'MOVE-IN NOTES')}
      <div class="move-key">${keyDrawing}</div><section class="move-strips">${headline('<span>BAGONG</span><span>LIPAT KA?</span>')}<p class="move-support">${escape(post.support)}</p></section>
      <div class="move-records"><p>Kailan ang<br>huling service?</p><p>May receipt o<br>lumang record?</p><p>Sino ang<br>dating kausap?</p></div>
      <p class="move-note">Kung wala, sabihin lang na<br>hindi verified ang history.</p>
      ${footer('I-SAVE KASAMA NG RECORDS NG BAHAY')}`,
    '12': () => `${brand(assets.logo, 'BAGO ANG PROJECT')}
      <section class="renovation-sign">${headline('MAY RENOVATION<br><em>KA?</em>')}${support()}</section>
      <div class="miniature-home">${homeDrawing}<p>CONCEPTUAL ILLUSTRATION</p></div>
      <div class="renovation-records"><span>Lumang plans</span><span>Service records</span><span>Mga concern</span></div>
      ${footer('ISAMA SA USAPAN NG OWNER AT CONTRACTOR')}`,
    '13': () => `${brand(assets.logo, 'ISANG FOLDER LANG')}
      <section class="history-title">${headline('HULING SERVICE?<br><em>I-SAVE MO.</em>')}</section>
      <section class="history-folder">${folderDrawing}<div class="folder-content"><p class="folder-label">MAINTENANCE RECORDS</p><div><span>DATE</span><i></i></div><div><span>RECEIPT</span><i></i></div><div><span>GINAWA</span><i></i></div></div><span class="folder-asterisk">*</span></section>
      <div class="history-close">${support()}<p>May mababalikan kang record.</p></div>
      ${footer('I-SAVE SA PHONE PARA MADALING MAHANAP')}`,
    '14': () => `${brand(assets.logo, 'GATE / STREET / PARKING')}
      <section class="access-title">${headline('MAKAKAPASOK<br>BA ANG TRUCK?')}</section>
      <figure class="access-photo">${photo(assets.truck, 'Existing edited Oceanides fleet-context image. Actual vehicle and setup require confirmation.')}<figcaption>FLEET CONTEXT / EDITED IMAGE</figcaption></figure>
      <div class="access-close">${support()}<p>Gate. Street. Parking rules.</p></div>
      ${footer('VEHICLE AT SETUP: IPA-CONFIRM MUNA')}`,
    '15': () => `${brand(assets.logo, 'MAS MALINAW NA INQUIRY')}
      <section class="message-title">${headline('I-SEND MO<br><em>NANG MALINAW.</em>')}</section>
      <div class="message-notes"><p>Lugar.</p><p>Problema.</p><p>Target<br>na araw.</p><span class="message-arrow" aria-hidden="true"></span><p class="message-note">Panimula ito<br>ng usapan.</p></div>
      <figure class="inquiry-screenshot"><div class="phone-camera" aria-hidden="true"></div>${photo(assets.inquiryUI, 'Screenshot of the actual local private Oceanides inquiry guide. No request is sent.')}<figcaption>ACTUAL INQUIRY PREVIEW</figcaption></figure>
      ${footer('IHANDA ANG INFO BAGO HUMINGI NG QUOTE')}`,
    '16': () => `${brand(assets.logo, 'APARTMENT / SHARED BUILDING')}
      <section class="shared-top">${headline('UNIT MO<br>LANG BA?')}<p>Huwag munang mag-assume<br>kung iisang system ang gamit.</p><div class="shared-units" aria-hidden="true"><span></span><span></span><span></span></div></section>
      <section class="shared-bottom"><p class="shared-kicker">I-NOTE ANG OBSERVATIONS</p>${support()}<div class="shared-people"><span>OWNER</span><b>/</b><span>ADMIN</span></div><p>Unit o area na affected.</p></section>
      ${footer('ISAMA ANG OWNER O ADMIN SA USAPAN')}`,
    '17': () => `${brand(assets.logo, 'PHOTO + CONTEXT')}
      <section class="photo-title">${headline('PHOTO LANG?<br>LAGYAN NG CONTEXT.')}</section>
      <section class="context-notebook"><div class="notebook-rings" aria-hidden="true">${'<span></span>'.repeat(8)}</div><figure class="context-photo">${photo(assets.ba3Before, 'Historical Oceanides tank archive photo, used to illustrate the need for image context.')}<figcaption>PHOTO ARCHIVE</figcaption></figure><div class="context-questions"><p>Saan?</p><p>Kailan?</p><p>Ano ang<br>napansin?</p></div><p class="context-note">Kung luma ang photo,<br>sabihin din.</p></section>
      ${footer('PHOTO LANG AY HINDI SAPAT PARA SA DIAGNOSIS')}`,
    '18': () => `${brand(assets.logo, 'GABAY SA MAINTENANCE')}
      <figure class="planning-calendar"><svg viewBox="0 0 440 600" aria-label="Illustrated maintenance record with a check mark"><rect x="8" y="45" width="422" height="540" rx="8" fill="#F4F6FA"/><path d="M8 150h422" stroke="#F5B301" stroke-width="12"/><path d="M100 8v74M330 8v74" stroke="#8FB3DD" stroke-width="22" stroke-linecap="round"/><circle cx="220" cy="315" r="110" fill="#0E2C5E"/><path d="m155 315 45 48 88-99" fill="none" stroke="#F5B301" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><path d="M70 475h300M70 515h210" stroke="#8FB3DD" stroke-width="10"/></svg><figcaption>CONCEPTUAL ILLUSTRATION</figcaption></figure>
      <section class="planning-title">${headline('WALANG<br>ISSUE<br><em>NGAYON?</em>')}</section>
      <div class="planning-close">${support()}<p>I-save ang huling service<br>at kung ano ang ginawa.</p></div>
      ${footer('PLANUHIN AYON SA PROPERTY MO')}`,
  };
  if (!templates[post.id]) throw new Error(`Unknown variety template: ${post.id}`);
  return `<main id="canvas" class="canvas post-${post.id} variety" aria-label="${escape(post.title)}">${templates[post.id]()}</main>`;
}

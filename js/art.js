// ============================================================
// Иллюстрации-карточки легенд.
// Каждая картинка собирается из слоёв: небо → дальние горы/море → главный мотив.
// Стиль один для всех: плоские слои, мягкие цвета, как корейская народная живопись.
// Если позже появится настоящая картинка img/legends/<id>.webp — она заменит рисунок
// (см. ART_IMAGES внизу файла).
// ============================================================
window.Art = (function () {
  // ----- Палитры по времени суток -----
  const PAL = {
    dawn:  { s1:"#F6D7B0", s2:"#E9A98B", sun:"#FFF1D6", far:"#B98C8C", mid:"#8E6F7A", near:"#5E4E5F", ink:"#2E2633", acc:"#C2412D", gold:"#E8B44C", light:"#FFF6E8", water:"#C79A97" },
    day:   { s1:"#CFE3EC", s2:"#9CC3D5", sun:"#FFF8E1", far:"#9DB8A8", mid:"#6E9483", near:"#3F6655", ink:"#1F3329", acc:"#B8352B", gold:"#D9A23A", light:"#F7FBF5", water:"#7FAFC4" },
    dusk:  { s1:"#F2B880", s2:"#C8656B", sun:"#FFE0A3", far:"#9A5C6B", mid:"#6D4060", near:"#3F2A45", ink:"#1E1424", acc:"#E2533B", gold:"#F2C14E", light:"#FFE9CF", water:"#B0607A" },
    night: { s1:"#2D3E66", s2:"#141D36", sun:"#F3E9C6", far:"#33456E", mid:"#26365A", near:"#18233F", ink:"#0B1022", acc:"#D9573F", gold:"#E9C064", light:"#E9EEF7", water:"#30466F" }
  };

  // Псевдослучайные числа от строки — чтобы у каждой легенды горы были свои, но всегда одинаковые
  function rng(seed) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909), (h >>> 0) / 4294967296)); }

  // Гряда гор: плавная линия через случайные вершины
  function ridge(r, y, amp, n, color, op = 1) {
    let d = `M0 300 L0 ${y}`;
    const step = 400 / n;
    for (let i = 0; i < n; i++) {
      const x1 = i * step + step / 2, x2 = (i + 1) * step;
      const peak = y - amp * (0.4 + r() * 0.6);
      d += ` Q${x1.toFixed(0)} ${peak.toFixed(0)} ${x2.toFixed(0)} ${(y - r() * amp * 0.25).toFixed(0)}`;
    }
    return `<path d="${d} L400 300 Z" fill="${color}" opacity="${op}"/>`;
  }
  const sea = (p, y = 205) => `<rect x="0" y="${y}" width="400" height="${300 - y}" fill="${p.water}"/>
    ${[0, 1, 2, 3].map(i => `<path d="M${20 + i * 95} ${y + 18 + i * 14 % 30} q15 -6 30 0" stroke="${p.light}" stroke-width="2" fill="none" opacity=".5"/>`).join("")}`;
  const sky = (p, id) => `<defs><linearGradient id="sk-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.s2}"/><stop offset="1" stop-color="${p.s1}"/></linearGradient></defs>
    <rect width="400" height="300" fill="url(#sk-${id})"/>`;
  const sun = (p, x = 300, y = 70, r = 26) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.sun}" opacity=".95"/>`;
  const stars = (p, r) => Array.from({ length: 18 }, () => `<circle cx="${(r() * 400).toFixed(0)}" cy="${(r() * 120).toFixed(0)}" r="${(r() * 1.4 + .4).toFixed(1)}" fill="${p.light}" opacity=".8"/>`).join("");
  const pine = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${c}"><rect x="-2" y="-6" width="4" height="26"/><path d="M0 -40 L-16 -14 L-6 -16 L-20 4 L20 4 L6 -16 L16 -14 Z"/></g>`;
  const roof = (x, y, w, c) => `<path d="M${x - w / 2 - 14} ${y + 4} Q${x - w / 2} ${y + 2} ${x - w / 2 + 8} ${y - 12} L${x + w / 2 - 8} ${y - 12} Q${x + w / 2} ${y + 2} ${x + w / 2 + 14} ${y + 4} Q${x} ${y - 4} ${x - w / 2 - 14} ${y + 4} Z" fill="${c}"/>`;

  // ----- Главные мотивы -----
  const M = {
    // Храм с красными воротами хонсальмун
    temple: p => `${roof(200, 170, 150, p.ink)}<rect x="138" y="172" width="124" height="46" fill="${p.light}"/>
      ${[150, 175, 200, 225, 250].map(x => `<rect x="${x - 3}" y="172" width="6" height="46" fill="${p.acc}"/>`).join("")}
      <rect x="120" y="218" width="160" height="10" fill="${p.mid}"/>
      <g stroke="${p.acc}" stroke-width="4"><path d="M56 262 V196 M104 262 V196 M50 200 H110"/>${[64, 72, 80, 88, 96].map(x => `<path d="M${x} 200 V186" stroke-width="2"/>`).join("")}</g>`,
    // Царский курган с соснами и круглым прудом-жемчужиной
    tomb: p => `<ellipse cx="200" cy="208" rx="70" ry="30" fill="${p.mid}"/><path d="M130 208 Q200 150 270 208 Z" fill="${p.near}"/>
      <path d="M118 212 H282" stroke="${p.light}" stroke-width="5"/>
      ${pine(92, 196, 1.1, p.ink)}${pine(312, 200, 1.2, p.ink)}${pine(340, 214, .9, p.ink)}
      <ellipse cx="200" cy="262" rx="44" ry="13" fill="${p.water}"/><circle cx="200" cy="260" r="6" fill="${p.gold}"/>`,
    // Крепостная стена с воротами
    fortress: p => `<rect x="0" y="196" width="400" height="44" fill="${p.light}"/>
      ${Array.from({ length: 20 }, (_, i) => `<rect x="${i * 20 + 2}" y="186" width="14" height="12" fill="${p.light}"/>`).join("")}
      <rect x="0" y="232" width="400" height="8" fill="${p.mid}" opacity=".5"/>
      <path d="M200 240 v-30 a18 18 0 0 1 36 0 v30 z" transform="translate(-18 0)" fill="${p.ink}"/>
      ${roof(200, 166, 110, p.ink)}<rect x="152" y="168" width="96" height="20" fill="${p.acc}"/>`,
    // Большой колокол
    bell: p => `<path d="M110 92 H290" stroke="${p.ink}" stroke-width="10"/><path d="M130 92 V250 M270 92 V250" stroke="${p.ink}" stroke-width="8"/>
      <path d="M200 100 c-8 0 -10 8 -10 14 h20 c0 -6 -2 -14 -10 -14 z" fill="${p.gold}"/>
      <path d="M168 116 h64 q6 0 8 10 l14 92 q2 10 -10 10 h-94 q-12 0 -10 -10 l14 -92 q2 -10 8 -10 z" fill="${p.gold}"/>
      <path d="M152 206 h96" stroke="${p.ink}" stroke-width="3" opacity=".5"/><circle cx="200" cy="190" r="10" fill="none" stroke="${p.ink}" stroke-width="3" opacity=".5"/>`,
    // Павильон над рекой, бамбук и белая бабочка
    pavilion: p => `<path d="M0 230 Q120 200 230 222 L230 300 L0 300 Z" fill="${p.near}"/>${roof(120, 150, 130, p.ink)}
      <rect x="66" y="152" width="108" height="10" fill="${p.acc}"/>${[72, 100, 140, 168].map(x => `<rect x="${x - 3}" y="160" width="6" height="52" fill="${p.ink}"/>`).join("")}
      <rect x="58" y="210" width="124" height="8" fill="${p.ink}"/>
      ${[300, 318, 336, 354, 372].map((x, i) => `<path d="M${x} 300 V${110 + i * 9}" stroke="${p.mid}" stroke-width="7"/>${[0, 1, 2, 3].map(k => `<path d="M${x - 4} ${150 + k * 34 + i * 6} h8" stroke="${p.near}" stroke-width="2"/>`).join("")}`).join("")}
      <g transform="translate(250 120)" fill="${p.light}"><path d="M0 0 q-14 -16 -18 2 q8 8 18 -2 q14 -16 18 2 q-8 8 -18 -2"/></g>`,
    // Каменный алтарь на вершине с одиноким деревом
    altar: p => `<path d="M60 300 L200 150 L340 300 Z" fill="${p.near}"/>
      <rect x="160" y="128" width="80" height="26" fill="${p.light}" stroke="${p.ink}" stroke-width="2"/><ellipse cx="200" cy="158" rx="58" ry="10" fill="${p.mid}"/>
      <path d="M200 128 V96" stroke="${p.ink}" stroke-width="4"/><circle cx="200" cy="88" r="16" fill="${p.mid}"/><circle cx="188" cy="96" r="10" fill="${p.mid}"/><circle cx="212" cy="96" r="10" fill="${p.mid}"/>`,
    // Феникс над вершиной
    phoenix: p => `<g transform="translate(200 104)" fill="${p.gold}">
      <path d="M0 0 C-30 -30 -70 -24 -96 -6 C-66 -12 -40 -6 -18 8 Z"/><path d="M0 0 C30 -30 70 -24 96 -6 C66 -12 40 -6 18 8 Z"/>
      <ellipse cx="0" cy="6" rx="10" ry="16"/><circle cx="0" cy="-14" r="7"/><path d="M0 -20 q6 -12 14 -10 q-6 2 -8 10z"/>
      <path d="M0 20 C-10 60 -40 80 -70 96 M0 20 C6 60 10 90 2 118 M0 20 C14 56 44 78 72 90" stroke="${p.acc}" stroke-width="5" fill="none" stroke-linecap="round"/></g>`,
    // Высокий обрыв и крошечная фигурка, держащаяся за край
    cliff: p => `<path d="M170 300 L170 110 L230 92 L300 120 L320 300 Z" fill="${p.ink}"/><path d="M170 110 L230 92 L250 104 L170 122 Z" fill="${p.mid}"/>
      <g fill="${p.acc}"><circle cx="170" cy="128" r="6"/><rect x="164" y="134" width="12" height="20" rx="4"/></g><path d="M170 112 V124" stroke="${p.acc}" stroke-width="3"/>
      <g transform="translate(96 250)" fill="${p.light}"><circle r="6" cy="-26"/><path d="M-8 -18 h16 l4 28 h-24z"/></g>`,
    // Плачущая скала
    tears: p => `<path d="M120 300 C110 210 150 140 210 130 C270 124 300 190 290 300 Z" fill="${p.mid}"/><path d="M150 300 C150 230 170 180 210 168" stroke="${p.near}" stroke-width="6" fill="none"/>
      ${[[200, 190], [222, 214], [206, 236], [230, 256]].map(([x, y]) => `<path d="M${x} ${y} q-6 10 0 14 q6 -4 0 -14z" fill="${p.water}" stroke="${p.light}" stroke-width="1.5"/>`).join("")}`,
    // Огромная дзельква
    tree: p => `<path d="M188 300 C190 250 180 220 160 196 M212 300 C210 250 222 220 244 196 M200 300 V180" stroke="${p.ink}" stroke-width="18" fill="none" stroke-linecap="round"/>
      ${[[200, 120, 70], [140, 150, 50], [262, 150, 52], [170, 100, 40], [236, 96, 42]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.near}"/>`).join("")}
      <path d="M150 196 h100" stroke="${p.acc}" stroke-width="4"/><path d="M164 196 v14 M186 196 v10 M210 196 v14 M234 196 v10" stroke="${p.light}" stroke-width="4"/>`,
    // Долина с флагами войска
    army: p => `<path d="M0 220 Q200 170 400 220 V300 H0Z" fill="${p.near}"/>
      ${[70, 130, 190, 250, 310].map((x, i) => `<path d="M${x} ${236 - i % 2 * 8} V${160 - i % 2 * 8}" stroke="${p.ink}" stroke-width="3"/><path d="M${x} ${160 - i % 2 * 8} l30 8 l-30 10z" fill="${i % 2 ? p.gold : p.acc}"/>`).join("")}
      ${Array.from({ length: 14 }, (_, i) => `<circle cx="${40 + i * 25}" cy="${248 + (i % 3) * 6}" r="6" fill="${p.ink}"/>`).join("")}`,
    // Гора в тумане и сороконожка
    centipede: p => `<rect y="150" width="400" height="80" fill="${p.light}" opacity=".45"/>
      <g fill="${p.acc}">${Array.from({ length: 12 }, (_, i) => `<circle cx="${110 + i * 16}" cy="${236 + Math.sin(i) * 8}" r="9"/><path d="M${110 + i * 16} ${236 + Math.sin(i) * 8} l-6 16 M${110 + i * 16} ${236 + Math.sin(i) * 8} l6 16" stroke="${p.ink}" stroke-width="3"/>`).join("")}</g>
      <circle cx="300" cy="${236 + Math.sin(12) * 8}" r="12" fill="${p.ink}"/>`,
    // Река, трижды огибающая землю
    river: p => `<path d="M-10 120 C120 120 300 140 300 170 C300 200 80 190 80 220 C80 250 330 250 410 270" stroke="${p.water}" stroke-width="26" fill="none"/>
      <path d="M-10 120 C120 120 300 140 300 170 C300 200 80 190 80 220 C80 250 330 250 410 270" stroke="${p.light}" stroke-width="2" fill="none" stroke-dasharray="6 10" opacity=".7"/>
      ${pine(330, 140, .7, p.ink)}${pine(60, 196, .7, p.ink)}`,
    // Портовая крепость и парус
    port: p => `${sea(p, 210)}<path d="M120 210 L180 150 L280 150 L340 210 Z" fill="${p.near}"/><path d="M180 150 h100" stroke="${p.light}" stroke-width="6"/>
      <g transform="translate(70 238)"><path d="M-30 0 h60 l-10 12 h-40z" fill="${p.ink}"/><path d="M0 0 V-46 L26 -6 Z" fill="${p.light}"/></g>`,
    // Остров и дорога по дну моря
    island: p => `${sea(p, 180)}<ellipse cx="300" cy="190" rx="80" ry="22" fill="${p.near}"/><path d="M240 186 Q300 140 360 186 Z" fill="${p.mid}"/>
      <path d="M0 300 C120 260 200 220 250 196" stroke="${p.gold}" stroke-width="16" fill="none" opacity=".85"/>
      <g transform="translate(120 262)" fill="${p.ink}"><circle r="5" cy="-22"/><rect x="-5" y="-17" width="10" height="17" rx="3"/></g>`,
    // Лодка в бурю
    storm: p => `${sea(p, 190)}${[0, 1, 2, 3, 4].map(i => `<path d="M${i * 90 - 20} ${210 + i % 2 * 20} q45 -30 90 0" stroke="${p.light}" stroke-width="4" fill="none"/>`).join("")}
      <g transform="translate(200 210) rotate(-14)"><path d="M-60 0 h120 l-20 20 h-80z" fill="${p.ink}"/><path d="M0 0 V-70 L40 -10 Z" fill="${p.light}"/></g>
      <path d="M300 30 l-20 50 h16 l-14 44" stroke="${p.gold}" stroke-width="5" fill="none"/>`,
    // Пещера в горе и дым
    cave: p => `<path d="M40 300 C60 160 150 100 220 100 C300 100 370 180 380 300 Z" fill="${p.near}"/><path d="M190 300 v-70 a30 34 0 0 1 60 0 v70z" fill="${p.ink}"/>
      <path d="M210 230 c-20 -30 20 -40 0 -70 c-20 -30 20 -40 0 -70" stroke="${p.light}" stroke-width="10" fill="none" opacity=".45" stroke-linecap="round"/>
      <path d="M260 60 l30 -14 l-10 18 l26 -2" stroke="${p.gold}" stroke-width="4" fill="none"/>`,
    // Каменная стела под навесом
    stele: p => `${roof(200, 112, 120, p.ink)}<rect x="146" y="114" width="108" height="10" fill="${p.acc}"/>
      <rect x="176" y="126" width="48" height="106" rx="6" fill="${p.light}"/>${[0, 1, 2, 3, 4].map(i => `<path d="M190 ${144 + i * 16} h20" stroke="${p.ink}" stroke-width="3" opacity=".5"/>`).join("")}
      <rect x="160" y="230" width="80" height="16" fill="${p.mid}"/>`,
    // Тигр несёт юношу
    tiger: p => `<g transform="translate(200 220)"><path d="M-80 0 C-80 -40 70 -40 76 0 C76 14 -80 14 -80 0Z" fill="${p.gold}"/>
      ${[-50, -20, 10, 40].map(x => `<path d="M${x} -26 l6 24" stroke="${p.ink}" stroke-width="5"/>`).join("")}
      <circle cx="84" cy="-14" r="20" fill="${p.gold}"/><circle cx="90" cy="-18" r="3" fill="${p.ink}"/><path d="M-80 -6 C-110 -20 -100 -50 -120 -60" stroke="${p.gold}" stroke-width="8" fill="none"/>
      ${[-60, -20, 30, 60].map(x => `<rect x="${x}" y="6" width="10" height="26" fill="${p.gold}"/>`).join("")}
      <g fill="${p.light}"><circle cx="0" cy="-58" r="9"/><path d="M-12 -48 h24 l4 20 h-32z"/></g></g>`,
    // Колодец
    well: p => `<ellipse cx="200" cy="236" rx="70" ry="18" fill="${p.ink}"/><rect x="130" y="196" width="140" height="40" fill="${p.mid}"/>
      ${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${130 + i * 28} 196 v40" stroke="${p.near}" stroke-width="3"/>`).join("")}
      <ellipse cx="200" cy="196" rx="70" ry="16" fill="${p.water}"/><path d="M140 196 V120 M260 196 V120 M128 120 H272" stroke="${p.ink}" stroke-width="7"/>`
  };
  // Будда отдельно — рядом с колодцем
  M.buddha = p => `<g transform="translate(80 10) scale(.8)">${M.well(p)}</g>
    <g transform="translate(110 190)" fill="${p.gold}"><circle cy="-60" r="16"/><path d="M-30 0 C-30 -40 30 -40 30 0Z"/><ellipse cy="2" rx="40" ry="10"/></g>
    <circle cx="110" cy="130" r="34" fill="none" stroke="${p.gold}" stroke-width="3" opacity=".6"/>`;
  // Колодец сестёр — колодец и два цветка
  M.sisters = p => `${M.well(p)}${[140, 260].map(x => `<g transform="translate(${x} 262)"><path d="M0 0 v-30" stroke="${p.near}" stroke-width="3"/>${[0, 72, 144, 216, 288].map(a => `<ellipse rx="5" ry="9" cy="-38" transform="rotate(${a} 0 -30)" fill="${p.acc}"/>`).join("")}<circle cy="-30" r="4" fill="${p.gold}"/></g>`).join("")}`;
  // Маленький курган
  M.smalltomb = p => `<path d="M120 236 Q200 170 280 236 Z" fill="${p.near}"/><path d="M110 238 H290" stroke="${p.light}" stroke-width="4"/>${pine(320, 230, .9, p.ink)}<rect x="190" y="236" width="20" height="18" fill="${p.light}"/>`;
  // Золотой петух над горой и семь звёзд
  M.rooster = p => `<g transform="translate(200 130)" fill="${p.gold}"><ellipse rx="34" ry="24"/><circle cx="30" cy="-28" r="13"/><path d="M28 -42 l6 -10 l4 10 l6 -8 l2 10z" fill="${p.acc}"/><path d="M42 -26 l12 4 l-12 4z" fill="${p.acc}"/>
      <path d="M-30 -6 C-60 -50 -70 -10 -56 14 C-70 -20 -46 -30 -30 6" /><path d="M-6 22 v22 M10 22 v22" stroke="${p.gold}" stroke-width="4"/></g>
    ${[0, 1, 2, 3, 4, 5, 6].map(i => `<circle cx="${60 + i * 46}" cy="${40 + (i % 2) * 12}" r="4" fill="${p.light}"/>`).join("")}`;
  // Золотой пруд
  M.goldpond = p => `<ellipse cx="200" cy="240" rx="150" ry="34" fill="${p.water}"/>${Array.from({ length: 16 }, (_, i) => `<circle cx="${80 + (i * 53) % 240}" cy="${226 + (i * 17) % 28}" r="${2 + i % 3}" fill="${p.gold}"/>`).join("")}
    ${pine(60, 220, .8, p.ink)}${pine(352, 224, .9, p.ink)}`;
  // Красные ворота и карп подо льдом
  M.carp = p => `<rect x="0" y="230" width="400" height="70" fill="${p.light}"/>${[[60, 248], [210, 270], [300, 244]].map(([x, y]) => `<path d="M${x} ${y} l40 4" stroke="${p.water}" stroke-width="2"/>`).join("")}
    <g transform="translate(200 262)"><ellipse rx="34" ry="12" fill="${p.acc}"/><path d="M30 0 l20 -12 v24z" fill="${p.acc}"/><circle cx="-22" cy="-3" r="2.5" fill="${p.light}"/></g>
    <g stroke="${p.acc}" stroke-width="7"><path d="M130 230 V120 M270 230 V120"/><path d="M116 124 H284" stroke-width="9"/></g>${roof(200, 108, 150, p.ink)}`;
  // Скалистая гора-«гуляка»
  M.rocky = p => `<path d="M40 300 L120 170 L160 196 L210 110 L260 180 L300 150 L370 300 Z" fill="${p.near}"/>
    ${[[150, 230], [210, 160], [250, 220], [300, 250], [190, 260]].map(([x, y]) => `<path d="M${x - 14} ${y + 8} l10 -16 l16 2 l6 14 z" fill="${p.mid}"/>`).join("")}`;

  // ----- Какая картинка у какой легенды -----
  // time — время суток, bg — фон (hills/sea/none), m — мотив
  const SCENES = {
    yongju:{time:"dawn", bg:"hills", m:"temple"},  yungneung:{time:"day", bg:"hills", m:"tomb"},
    geolleung:{time:"dusk", bg:"hills", m:"tomb"}, hwaseong:{time:"day", bg:"hills", m:"fortress"},
    emille:{time:"dusk", bg:"none", m:"bell"},     arang:{time:"night", bg:"hills", m:"pavilion"},
    chamseong:{time:"dawn", bg:"sea", m:"altar"},  seobongsan:{time:"dawn", bg:"hills", m:"phoenix"},
    swingil:{time:"dusk", bg:"hills", m:"cliff"},  nunmul:{time:"night", bg:"hills", m:"tears"},
    geondalsan:{time:"day", bg:"none", m:"rocky"}, jeunggeo:{time:"day", bg:"hills", m:"tree"},
    samcheon:{time:"dusk", bg:"hills", m:"army"},  jinesan:{time:"dawn", bg:"hills", m:"centipede"},
    joam:{time:"day", bg:"hills", m:"river"},      dangseong:{time:"night", bg:"none", m:"port"},
    jebudo:{time:"day", bg:"none", m:"island"},    salgoji:{time:"night", bg:"none", m:"storm"},
    bonghyeol:{time:"dusk", bg:"none", m:"cave"},  bugyang:{time:"day", bg:"hills", m:"stele"},
    "hyoja-tiger":{time:"night", bg:"hills", m:"tiger"}, aegineung:{time:"dusk", bg:"hills", m:"smalltomb"},
    geumbul:{time:"dawn", bg:"hills", m:"buddha"}, yeogae:{time:"night", bg:"hills", m:"sisters"},
    mubongsan:{time:"day", bg:"hills", m:"phoenix"}, chilbosan:{time:"night", bg:"hills", m:"rooster"},
    geumdang:{time:"dawn", bg:"hills", m:"goldpond"}, igon:{time:"day", bg:"none", m:"carp"}
  };

  // Собрать SVG для легенды
  function svg(id) {
    const sc = SCENES[id] || { time: "day", bg: "hills", m: null };
    const p = PAL[sc.time], r = rng(id);
    let bg = "";
    if (sc.bg === "hills") bg = ridge(r, 170, 50, 4, p.far, .9) + ridge(r, 205, 40, 5, p.mid, .9);
    if (sc.bg === "sea") bg = sea(p, 210);
    const night = sc.time === "night" ? stars(p, r) : "";
    const body = sc.m && M[sc.m] ? M[sc.m](p) : `<text x="200" y="190" text-anchor="middle" font-size="90" fill="${p.light}" opacity=".6">?</text>`;
    return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">
      ${sky(p, id)}${night}${sun(p, sc.time === "night" ? 320 : 300, sc.time === "dusk" ? 120 : 64, sc.time === "night" ? 18 : 26)}${bg}${body}</svg>`;
  }

  // Готовые картинки (если художник/нейросеть нарисует) — перечислить id тут,
  // положить файл в img/legends/<id>.webp, и он заменит рисунок.
  const ART_IMAGES = [];

  return {
    // HTML карточки: картинка-файл, если есть, иначе рисунок
    html(id, cls = "") {
      if (ART_IMAGES.includes(id)) return `<img class="art ${cls}" src="img/legends/${id}.webp" alt="">`;
      if (!SCENES[id]) return `<div class="art art-none ${cls}"></div>`;
      return `<div class="art ${cls}">${svg(id)}</div>`;
    },
    has(id) { return !!SCENES[id] || ART_IMAGES.includes(id); },
    svg, SCENES
  };
})();

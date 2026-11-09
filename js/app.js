// ============================================================
// 누비 — основная логика приложения
// ============================================================

// ===== Хранилище на телефоне =====
const store = {
  get(k, d) { try { const v = localStorage.getItem("nubi_" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("nubi_" + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem("nubi_" + k); } catch (e) {} }
};

// ===== Состояние =====
let visits  = store.get("visits", {});      // id легенды -> {t: время, test: true/false}
let mine    = store.get("mine", []);        // легенды, добавленные пользователем
let lang    = store.get("lang", DEFAULT_LANG);
let profile = store.get("profile", null);   // {nick, title}
let seen    = store.get("seenTitles", []);  // звания, о которых уже показали уведомление
let testMode = store.get("testMode", false);
let markMode = store.get("markMode", false); // режим разметки: записывать точки легенд
let pins    = store.get("pins", {});        // id легенды -> {lat, lng}: точки, записанные на месте
let finds   = store.get("finds", []);       // находки: фото табличек с координатами, ждут обработки ИИ

// Старый формат печатей (просто время) переводим в новый
for (const k in visits) if (typeof visits[k] === "number") visits[k] = { t: visits[k], test: true };

// Состояние экрана (не сохраняется)
let ui = { tab: "walk", openId: null, adding: false, region: "all", editing: false, confirmReset: false,
           checkMsg: null, checking: false, draft: null, camMsg: null, mapFocus: null };

const app = document.getElementById("app");
let map = null; // объект карты Leaflet

// ===== Помощники =====
const t = (k, vars = {}) => String(I18N[lang][k] ?? I18N.ko[k] ?? k).replace(/\{(\w)\}/g, (_, v) => vars[v] ?? "");
const tr = obj => obj[lang] ?? obj.ko ?? Object.values(obj)[0];   // текст на нужном языке, иначе оригинал
const regionName = c => REGIONS[c] ? REGIONS[c][lang] : c;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const all = () => LEGENDS.concat(mine);
const byId = id => all().find(l => l.id === id);
const count = () => Object.keys(visits).length;
const titleById = id => TITLES.find(x => x.id === id);
const vTime = id => visits[id] && visits[id].t;
const dateFmt = ts => new Date(ts).toLocaleDateString(t("locale"));
const shortDate = s => new Date(s + "T00:00").toLocaleDateString(t("locale"), { month: "short", day: "numeric" });

function toast(s) {
  const el = document.getElementById("toast");
  el.textContent = s; el.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 2600);
}

// ===== Челленджи и звания =====
function progress(c) {
  const times = Object.values(visits).map(v => v.t);
  if (c.type === "chain") {
    const ts = c.ids.map(vTime).filter(Boolean);
    const done = ts.length === c.ids.length && Math.max(...ts) - Math.min(...ts) <= c.days * 864e5;
    return { got: ts.length, total: c.ids.length, done };
  }
  if (c.type === "period") {
    const a = new Date(c.from + "T00:00").getTime(), b = new Date(c.to + "T23:59:59").getTime();
    const got = times.filter(x => x >= a && x <= b).length;
    return { got: Math.min(got, c.need), total: c.need, done: got >= c.need };
  }
  if (c.type === "weekend") {
    const got = times.filter(x => [0, 6].includes(new Date(x).getDay())).length;
    return { got: Math.min(got, c.need), total: c.need, done: got >= c.need };
  }
}
function regionIds(r) { return LEGENDS.filter(l => l.region === r).map(l => l.id); }
function hasTitle(x) {
  if (x.kind === "count") return count() >= x.need;
  if (x.kind === "region") { const ids = regionIds(x.region), n = ids.filter(i => visits[i]).length; return x.need ? n >= x.need : n === ids.length; }
  if (x.kind === "challenge") return progress(CHALLENGES.find(c => c.id === x.ch)).done;
  if (x.kind === "submit") return mine.length >= x.need;
}
function titleProg(x) {
  if (x.kind === "count") return `${Math.min(count(), x.need)}/${x.need}`;
  if (x.kind === "region") { const ids = regionIds(x.region), need = x.need || ids.length; return `${Math.min(ids.filter(i => visits[i]).length, need)}/${need}`; }
  if (x.kind === "challenge") { const p = progress(CHALLENGES.find(c => c.id === x.ch)); return `${p.got}/${p.total}`; }
  if (x.kind === "submit") return `${Math.min(mine.length, x.need)}/${x.need}`;
}
const earned = () => TITLES.filter(hasTitle);
const wornName = () => profile && profile.title && titleById(profile.title) && hasTitle(titleById(profile.title))
  ? tr(titleById(profile.title).name) : t("noTitle");

// После печати или новой легенды проверяем новые звания. Первое звание надевается само.
function checkNewTitles(fallback) {
  const fresh = earned().filter(x => !seen.includes(x.id));
  if (fresh.length) {
    seen = seen.concat(fresh.map(x => x.id)); store.set("seenTitles", seen);
    if (profile && !profile.title) { profile.title = fresh[0].id; store.set("profile", profile); }
    toast(t("toastTitle", { t: tr(fresh[fresh.length - 1].name) }));
  } else if (fallback) toast(fallback);
}

// ===== Отметка на месте =====
function stamp(id, isTest) {
  visits[id] = { t: Date.now(), test: !!isTest };
  store.set("visits", visits);
  ui.checkMsg = null;
  checkNewTitles(t("toastStamp"));
  render();
}
async function tryCheckin(id) {
  const l = byId(id);
  if (testMode) return stamp(id, true);
  const p = pos(l);
  if (!p) { ui.checkMsg = { err: true, text: t("noCoords") }; return render(); }
  ui.checking = true; ui.checkMsg = { text: t("locating") }; render();
  try {
    const pos = await Geo.locate();
    const d = Geo.distance(pos, p);
    ui.checking = false;
    if (d <= radius(l)) return stamp(id, false);
    ui.checkMsg = { err: true, text: t("tooFar", { d: Geo.format(d), r: radius(l) }) };
  } catch (e) {
    ui.checking = false;
    ui.checkMsg = { err: true, text: e === "denied" ? t("gpsDenied") : t("gpsErr") };
  }
  render();
}
// Координаты места: записанная на месте точка важнее данных из файла
function pos(l) { return pins[l.id] || (l.lat != null ? { lat: l.lat, lng: l.lng } : null); }
// Радиус отметки: у приблизительных точек больше
function radius(l) { return l.approx && !pins[l.id] ? CHECKIN_RADIUS_APPROX : CHECKIN_RADIUS; }
// Расстояние до места по последним известным координатам
function distTo(l) { const p = pos(l); return Geo.last && p ? Geo.distance(Geo.last, p) : null; }

// ===== Общие части экранов =====
function langSwitch() {
  return `<div class="lang" role="group" aria-label="Language">${LANGS.map(([c, s]) =>
    `<button data-lang="${c}" aria-pressed="${c === lang}">${s}</button>`).join("")}</div>`;
}
function topBar() {
  return `<div class="bar">
    <button class="who" data-tab="me"><span class="ava">${esc(profile.nick[0].toUpperCase())}</span>
      <span class="who-txt"><b>${esc(profile.nick)}</b><span class="ttl">${esc(wornName())}</span></span></button>
    ${langSwitch()}</div>`;
}
function chCard(c) {
  const p = progress(c);
  const label = c.type === "chain" ? t("chChain", { d: c.days })
    : c.type === "period" ? t("chPeriod", { a: shortDate(c.from), b: shortDate(c.to) }) : t("chWeekend");
  return `<section class="ch ${p.done ? "done" : ""}">
    <div class="eyebrow">${label}</div>
    <h2>${esc(tr(c.name))}</h2>
    <div class="steps">${Array.from({ length: p.total }, (_, i) => `<span class="${i < p.got ? "on" : ""}"></span>`).join("")}</div>
    <p>${p.done ? t("chDone") : esc(tr(c.desc)) + ` (${p.got}/${p.total})`}</p>
    <div class="reward">${t("reward", { t: esc(tr(titleById(c.reward).name)) })}</div>
  </section>`;
}

// ===== Первый запуск =====
function welcomeView() {
  return `<div class="welcome">
    <div class="brand">누비</div>
    <h2>${t("wTitle")}</h2>
    <p>${t("wText")}</p>
    <div><div class="meta" style="margin-bottom:6px">${t("wLang")}</div>
      <div class="langbig">${LANGS.map(([c, , full]) => `<button data-lang="${c}" aria-pressed="${c === lang}">${full}</button>`).join("")}</div></div>
    <form id="nickForm">
      <label for="w-nick">${t("wNick")}<input id="w-nick" maxlength="12" placeholder="${t("wNickPh")}" autocomplete="nickname"></label>
      <button class="btn" type="submit">${t("wStart")}</button>
    </form>
  </div>`;
}

// ===== Вкладка «Легенды» =====
function walkView() {
  if (ui.finding) return findView();
  if (ui.adding) return addView();
  if (ui.openId) return detailView(byId(ui.openId));
  const codes = ["all", ...new Set(all().map(l => l.region))];
  let list = all().filter(l => ui.region === "all" || l.region === ui.region);
  // Если знаем, где пользователь — сортируем по расстоянию
  if (Geo.last) list = list.slice().sort((a, b) => (distTo(a) ?? 1e9) - (distTo(b) ?? 1e9));
  const next = CHALLENGES.filter(c => !progress(c).done)
    .sort((a, b) => progress(b).got / progress(b).total - progress(a).got / progress(a).total)[0];
  return topBar() + `
  <div class="top"><div class="brand">누비<small>${t("sub")}</small></div>
    <div class="stampcount">${t("stamps")} <b>${count()}</b> / ${all().length}</div></div>
  ${next ? `<div class="mini">${chCard(next)}<button class="link" data-tab="chal">${t("seeAll")}</button></div>` : ""}
  <div class="filters">${codes.map(r => `<button class="chip" data-region="${r}" aria-pressed="${r === ui.region}">${r === "all" ? t("all") : esc(regionName(r))}</button>`).join("")}</div>
  <div class="addrow"><button class="link" data-find>📋 ${t("findBtn")}</button><button class="link" data-add>${t("addBtn")}</button></div>
  <div class="list">${list.map(l => {
    const d = distTo(l);
    return `<button class="item" data-open="${esc(l.id)}">
      ${Art.html(l.id, "thumb")}
      <div><h3>${esc(tr(l.name))}${lang !== "ko" && !l.user ? `<span class="orig">${esc(l.name.ko)}</span>` : ""}${l.user ? `<span class="user-tag">${t("tagUser")}</span>` : ""}</h3>
      <div class="meta">${esc(regionName(l.region))} · ${esc(tr(l.place))}</div>
      ${d != null ? `<div class="dist">${t("distAway", { d: Geo.format(d) })}</div>` : !pos(l) ? `<div class="meta">${t("noPin")}</div>` : ""}</div>
      <div class="seal ${visits[l.id] ? "got" : ""}">${visits[l.id] ? t("sealGot") : "?"}</div>
    </button>`;
  }).join("")}</div>`;
}

// Текст из нескольких абзацев (разделены пустой строкой)
const paras = txt => esc(txt).split(/\n\n+/).map(x => `<p>${x}</p>`).join("");

function detailView(l) {
  if (!l) { ui.openId = null; return walkView(); }
  const v = visits[l.id];
  const foreign = l.user && l.lang !== lang;
  const d = distTo(l), p = pos(l);
  const kakao = p ? `https://map.kakao.com/link/map/${encodeURIComponent(tr(l.name))},${p.lat},${p.lng}` : null;
  // Встроенные легенды: legend / fact / find. Легенды пользователей: story.
  const body = l.legend
    ? `<section class="part"><h3>${t("hLegend")}</h3>${paras(tr(l.legend))}</section>
       ${l.fact ? `<section class="part fact"><h3>${t("hFact")}</h3>${paras(tr(l.fact))}</section>` : ""}
       ${l.find ? `<section class="part find"><h3>${t("hFind")}</h3>${paras(tr(l.find))}</section>` : ""}`
    : `<section class="part">${paras(tr(l.story))}</section>`;
  return topBar() + `<button class="back" data-back>${t("back")}</button>
  ${Art.has(l.id) ? Art.html(l.id, "hero") : ""}
  <article class="detail">
    <div class="meta">${esc(regionName(l.region))}${l.user ? " · " + t("userLegend", { n: esc(l.author || "?") }) : ""}</div>
    <h2>${esc(tr(l.name))}</h2>
    ${lang !== "ko" && !l.user ? `<div class="ko">${esc(l.name.ko)}</div>` : ""}
    <div class="place"><b>${t("where")}</b><span>${esc(tr(l.place))}</span>
      ${lang !== "ko" && !l.user ? `<span class="meta">${esc(l.place.ko)}</span>` : ""}
      ${d != null ? `<span class="dist">${t("distAway", { d: Geo.format(d) })}</span>` : !p ? `<span class="meta">${t("noPin")}</span>` : ""}
      ${l.approx && !pins[l.id] ? `<span class="meta">${t("approxNote", { r: radius(l) })}</span>` : ""}</div>
    <div class="links">
      ${p ? `<button data-showmap="${esc(l.id)}">${t("showMap")}</button>` : ""}
      ${kakao ? `<a href="${kakao}" target="_blank" rel="noopener">${t("kakao")}</a>` : ""}
    </div>
    ${foreign ? `<div class="langnote">${t("origLang", { l: I18N[lang].langName[l.lang] || l.lang })}</div>` : ""}
    ${l.hasPhoto ? `<img class="lphoto" id="lphoto" alt="${esc(tr(l.name))}">
      <p class="note">${t("photoBy", { n: esc(l.author || "?"), d: dateFmt(l.photoTime) })}</p>` : ""}
    <div class="story">${body}</div>
    ${v
      ? `<div class="bigseal">${esc(tr(l.name))}<br>${t("sealBig")}</div>
         <p class="note">${t("visited", { d: dateFmt(v.t) })}${v.test ? ` <span class="testtag">${t("testStamp")}</span>` : ""}</p>`
      : `<button class="btn" data-checkin="${esc(l.id)}" ${ui.checking ? "disabled" : ""}>${t("checkin")}</button>
         ${ui.checkMsg ? `<div class="msg ${ui.checkMsg.err ? "err" : ""}">${ui.checkMsg.text}</div>` : ""}
         <p class="note">${testMode ? t("testHint") : t("checkinHint", { r: radius(l) })}</p>`}
    ${markMode ? `<div class="card markbox"><b>${t("markMode")}</b>
       <span class="meta">${pins[l.id] ? t("pinSaved", { c: pins[l.id].lat.toFixed(5) + ", " + pins[l.id].lng.toFixed(5) }) : t("markHint")}</span>
       <button class="ghostbtn" data-pin="${esc(l.id)}">${t("pinHere")}</button></div>` : ""}
  </article>`;
}

// Предупреждение о качестве снимка (не запрещает, только советует переснять)
function qualityNote(q) {
  if (!q || (!q.dark && !q.blurry)) return "";
  return `<div class="msg err">${q.dark ? t("qDark") : t("qBlurry")}</div>`;
}

// ===== Добавление легенды =====
function addView() {
  const c = ui.draft; // {photo, lat, lng, time} — снимок из камеры приложения
  return topBar() + `<button class="back" data-back>${t("back")}</button>
  <h2 class="sec-h">${t("addH")}</h2>
  <form id="addForm">
    <label for="f-name">${t("fName")}<input id="f-name" required placeholder="${t("fNamePh")}"></label>
    <label for="f-region">${t("fRegion")}<select id="f-region">
      ${Object.keys(REGIONS).map(r => `<option value="${r}">${REGIONS[r][lang]}</option>`).join("")}
    </select></label>
    <label for="f-place">${t("fPlace")}<input id="f-place" required placeholder="${t("fPlacePh")}"></label>
    <label for="f-story">${t("fStory")}<textarea id="f-story" required placeholder="${t("fStoryPh")}"></textarea></label>
    <div class="coordbox"><span style="font-size:13px;font-weight:500">${t("photoH")}</span>
      ${c ? `<img class="lphoto" src="${c.photo}" alt="">
        <span class="meta">${t("photoCoords", { d: dateFmt(c.time), c: c.lat.toFixed(5) + ", " + c.lng.toFixed(5) })}</span>
        ${qualityNote(c.quality)}
        <button type="button" class="ghostbtn" data-shoot>${t("retake")}</button>`
      : `<button type="button" class="ghostbtn" data-shoot>📷 ${t("takePhoto")}</button>
        <span class="meta">${t("photoNeed")}</span>`}
      ${ui.camMsg ? `<div class="msg err">${ui.camMsg}</div>` : ""}</div>
    <button class="btn" type="submit">${t("fSubmit")}</button>
    <p class="note">${t("fNote")}</p>
  </form>`;
}

// ===== Находка: фото таблички =====
function findView() {
  const c = ui.findDraft;
  return topBar() + `<button class="back" data-back>${t("back")}</button>
  <h2 class="sec-h">${t("findH")}</h2>
  <p class="meta" style="margin-top:-6px">${t("findIntro")}</p>
  ${c ? `<img class="lphoto" src="${c.photo}" alt="">
     <span class="meta">${t("photoCoords", { d: dateFmt(c.time), c: c.lat.toFixed(5) + ", " + c.lng.toFixed(5) })}</span>
     ${qualityNote(c.quality)}
     <form id="findForm">
       <label for="fd-note">${t("findNote")}<textarea id="fd-note" placeholder="${t("findNotePh")}"></textarea></label>
       <div class="row"><button class="btn" type="submit">${t("save")}</button>
       <button class="btn ghost" type="button" data-shootfind>${t("retake")}</button></div>
     </form>`
   : `<button class="btn" data-shootfind>📷 ${t("findShoot")}</button>
      <ul class="tips"><li>${t("findTip1")}</li><li>${t("findTip2")}</li><li>${t("findTip3")}</li></ul>`}
  ${ui.camMsg ? `<div class="msg err">${ui.camMsg}</div>` : ""}`;
}

// Отправить находку: фото + координаты через меню «Поделиться» телефона
async function shareFind(id) {
  const f = finds.find(x => x.id === id); if (!f) return;
  const src = await Photos.get(id);
  const text = `누비 · ${t("findH")}\n${f.lat.toFixed(6)}, ${f.lng.toFixed(6)}\n${new Date(f.time).toLocaleString(t("locale"))}${f.note ? "\n" + f.note : ""}`;
  try {
    const blob = await (await fetch(src)).blob();
    const file = new File([blob], `nubi-${id}.jpg`, { type: "image/jpeg" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text });
    } else {
      // Запасной вариант: открыть фото, чтобы сохранить долгим нажатием, и скопировать текст
      await navigator.clipboard.writeText(text).catch(() => {});
      ui.viewFind = id; render(); toast(t("findCopied")); return;
    }
    f.sent = true; store.set("finds", finds); render(); toast(t("findSent"));
  } catch (e) { if (e && e.name !== "AbortError") toast(t("findShareErr")); }
}

// ===== Вкладка «Карта» =====
function mapView() {
  return topBar() + `<div class="mapwrap"><div id="map"></div>
    <button class="mapbtn mapadd" data-add-from-map>${t("addBtn")}</button>
    <button class="mapbtn" data-locate>${t("myLoc")}</button></div>`;
}
function initMap() {
  if (typeof L === "undefined") return; // библиотека карты не загрузилась (нет интернета)
  const focus = ui.mapFocus && byId(ui.mapFocus);
  const fp = focus && pos(focus);
  const center = fp ? [fp.lat, fp.lng] : Geo.last ? [Geo.last.lat, Geo.last.lng] : [37.21, 126.99];
  map = L.map("map", { zoomControl: false }).setView(center, fp ? 15 : 10);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  // Метки легенд: красная — печать есть, синяя — ещё нет
  all().filter(l => pos(l)).forEach(l => {
    const icon = L.divIcon({ className: "", html: `<div class="pin ${visits[l.id] ? "got" : ""}"></div>`, iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] });
    const p = pos(l);
    const m = L.marker([p.lat, p.lng], { icon }).addTo(map)
      .bindPopup(`<b>${esc(tr(l.name))}</b><br>${esc(tr(l.place))}<br><button class="popbtn" data-open-map="${esc(l.id)}">→</button>`);
    if (focus && focus.id === l.id) m.openPopup();
  });
  if (Geo.last) drawMe();
  ui.mapFocus = null;
}
function drawMe() {
  if (!map || !Geo.last) return;
  const icon = L.divIcon({ className: "", html: '<div class="me-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
  if (drawMe.m) drawMe.m.remove();
  drawMe.m = L.marker([Geo.last.lat, Geo.last.lng], { icon }).addTo(map);
}

// ===== Вкладка «Челленджи» =====
function chalView() {
  const act = CHALLENGES.filter(c => !progress(c).done), done = CHALLENGES.filter(c => progress(c).done);
  return topBar() + `<h2 class="sec-h">${t("chH")}</h2>
    ${act.length ? `<h3 class="sub-h" style="margin-top:0">${t("chActive")}</h3>${act.map(chCard).join("")}` : ""}
    ${done.length ? `<h3 class="sub-h">${t("chDoneH")}</h3>${done.map(chCard).join("")}` : ""}`;
}

// ===== Вкладка «Профиль» =====
function meView() {
  const got = earned();
  const visited = all().filter(l => visits[l.id]).sort((a, b) => vTime(b.id) - vTime(a.id));
  const me = { nick: profile.nick, stamps: count(), title: profile.title, me: true };
  const rank = SAMPLE_PLAYERS.concat([me]).sort((a, b) => b.stamps - a.stamps || (b.me ? 1 : -1));
  return `<div class="bar"><span></span>${langSwitch()}</div>
  <h2 class="sec-h">${t("meH")}</h2>
  <div class="card">
    ${ui.editing
      ? `<form id="editForm"><label for="e-nick">${t("wNick")}<input id="e-nick" maxlength="12" value="${esc(profile.nick)}"></label>
         <div class="row"><button class="btn" type="submit">${t("save")}</button><button class="btn ghost" type="button" data-cancel>${t("cancel")}</button></div></form>`
      : `<div class="prof"><span class="ava">${esc(profile.nick[0].toUpperCase())}</span>
          <div style="min-width:0"><h2>${esc(profile.nick)}</h2><div class="ttl">${esc(wornName())}</div>
          <button class="link" data-edit>${t("edit")}</button></div></div>`}
    <div class="stats">
      <div><b>${count()}</b><span>${t("stStamps")}</span></div>
      <div><b>${got.length}</b><span>${t("stTitles")}</span></div>
      <div><b>${mine.length}</b><span>${t("stAdded")}</span></div>
    </div>
  </div>

  ${finds.length ? `<h3 class="sub-h">${t("findsH", { n: finds.length })}</h3>
  <p class="meta" style="margin:-4px 0 10px">${t("findsHint")}</p>
  <div class="finds">${finds.slice().reverse().map(f => `<div class="fitem">
    <img data-fimg="${f.id}" alt="">
    <div><b>${dateFmt(f.time)}</b><span class="meta">${f.lat.toFixed(5)}, ${f.lng.toFixed(5)}</span>
      ${f.note ? `<span class="meta">${esc(f.note)}</span>` : ""}
      <span class="${f.sent ? "dist" : "meta"}">${f.sent ? t("findSentTag") : t("findWaitTag")}</span></div>
    <div class="factions"><button class="wear" data-sharefind="${f.id}">${t("findSend")}</button>
      <button class="link" data-delfind="${f.id}">✕</button></div></div>`).join("")}</div>
  ${ui.viewFind ? `<img class="lphoto" id="fbig" alt=""><p class="note">${t("findLongPress")}</p>` : ""}` : ""}

  <h3 class="sub-h">${t("titlesH")}</h3>
  <p class="meta" style="margin:-4px 0 10px">${t("titlesHint")}</p>
  <div class="titles">${TITLES.map(x => {
    const on = hasTitle(x), worn = on && profile.title === x.id;
    return `<div class="title ${on ? "on" : ""} ${worn ? "worn" : ""}"><div class="rank">${on ? "✓" : titleProg(x)}</div>
      <div><h3>${esc(tr(x.name))}</h3><p>${esc(tr(x.desc))}</p></div>
      ${on ? (worn ? `<button class="wear" disabled>${t("worn")}</button>` : `<button class="wear" data-wear="${x.id}">${t("wear")}</button>`) : "<span></span>"}</div>`;
  }).join("")}</div>

  <h3 class="sub-h">${t("bookH")}</h3>
  <div class="book">${visited.length
    ? visited.map(l => `<button data-open-from-me="${esc(l.id)}">${Art.has(l.id) ? Art.html(l.id, "stamp-art") : ""}<span>${esc(tr(l.name))}</span></button>`).join("")
    : `<button class="empty" disabled>${t("bookEmpty")}</button>`}</div>

  <h3 class="sub-h">${t("rankH")}</h3>
  <div class="rankbox">${rank.map((p, i) => `<div class="rk ${p.me ? "me" : ""}"><span class="n">${i + 1}</span>
    <div><b>${esc(p.nick)}</b>${p.me ? ` <span class="meta">(${t("you")})</span>` : ""}<span class="ttl">${p.title && titleById(p.title) ? esc(tr(titleById(p.title).name)) : ""}</span></div>
    <span class="s">${p.stamps}</span></div>`).join("")}</div>
  <p class="sample">${t("rankNote")}</p>

  <h3 class="sub-h">${t("settingsH")}</h3>
  <div class="card">
    <label class="switch" for="s-test"><span>${t("testMode")}<br><span class="meta" style="font-weight:400">${t("testHint")}</span></span>
      <input type="checkbox" id="s-test" ${testMode ? "checked" : ""}></label>
    <label class="switch" for="s-mark"><span>${t("markMode")}<br><span class="meta" style="font-weight:400">${t("markHint")}</span></span>
      <input type="checkbox" id="s-mark" ${markMode ? "checked" : ""}></label>
    ${Object.keys(pins).length ? `<div class="coordbox"><b>${t("pinsH", { n: Object.keys(pins).length })}</b>
      <textarea id="pins-out" readonly rows="4">${esc(pinsText())}</textarea>
      <button type="button" class="ghostbtn" data-copypins>${t("pinsCopy")}</button></div>` : ""}
  </div>
  ${ui.confirmReset
    ? `<div class="card" style="margin-top:16px"><p style="margin:0">${t("resetQ")}</p>
       <div class="row"><button class="btn danger" data-reset-yes>${t("resetYes")}</button><button class="btn ghost" data-reset-no>${t("cancel")}</button></div></div>`
    : `<button class="btn ghost" style="margin-top:16px" data-reset>${t("reset")}</button>`}`;
}

// Точки в виде текста, который удобно отправить разработчику
function pinsText() {
  return Object.entries(pins).map(([id, p]) => {
    const l = byId(id); return `${id} | ${l ? l.name.ko : "?"} | ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`;
  }).join("\n");
}

// ===== Вкладка «Нуби» =====
function moreView() {
  const s = I18N[lang].sec;
  return topBar() + `<h2 class="sec-h">${t("moreH")}</h2><div class="soon">
    ${["walk", "meet", "gear", "cup", "cult"].map((k, i) => `<div><span><b>${s[k][0]}</b><br><span class="meta">${s[k][1]}</span></span><em>${i === 0 ? t("inUse") : t("soon")}</em></div>`).join("")}
  </div>`;
}

// ===== Отрисовка =====
function render() {
  document.documentElement.lang = lang;
  if (map) { map.remove(); map = null; drawMe.m = null; }
  const nav = document.getElementById("nav");
  if (!profile) { nav.hidden = true; app.innerHTML = welcomeView(); return; }
  nav.hidden = false;
  app.innerHTML = { walk: walkView, map: mapView, chal: chalView, me: meView, more: moreView }[ui.tab]();
  document.querySelectorAll("nav button").forEach(b => b.setAttribute("aria-current", b.dataset.tab === ui.tab));
  document.querySelectorAll("[data-i]").forEach(el => el.textContent = t(el.dataset.i));
  if (ui.tab === "map") initMap();
  document.querySelectorAll("[data-fimg]").forEach(im => Photos.get(im.dataset.fimg).then(src => { if (src) im.src = src; }));
  const big = document.getElementById("fbig");
  if (big && ui.viewFind) Photos.get(ui.viewFind).then(src => { if (src) big.src = src; });
  const img = document.getElementById("lphoto");
  if (img && ui.openId) Photos.get(ui.openId).then(src => { if (src) img.src = src; else img.remove(); });
}
function go(tab) {
  ui = { ...ui, tab, openId: null, adding: false, finding: false, viewFind: null, editing: false, confirmReset: false, checkMsg: null };
  render(); window.scrollTo(0, 0);
}
function openLegend(id) { ui = { ...ui, tab: "walk", openId: id, adding: false, checkMsg: null }; render(); window.scrollTo(0, 0); }

// ===== Нажатия =====
document.addEventListener("click", async e => {
  const b = e.target.closest("button"); if (!b) return;
  const d = b.dataset;
  if (d.lang) { lang = d.lang; store.set("lang", lang); render(); }
  else if (d.tab) go(d.tab);
  else if (d.region) { ui.region = d.region; render(); }
  else if (d.open) openLegend(d.open);
  else if (d.openFromMe) openLegend(d.openFromMe);
  else if (d.openMap) openLegend(d.openMap);
  else if (d.showmap) { ui.mapFocus = d.showmap; go("map"); }
  else if (b.hasAttribute("data-back")) { ui.openId = null; ui.adding = false; ui.finding = false; ui.checkMsg = null; render(); }
  else if (b.hasAttribute("data-find")) { ui.finding = true; ui.findDraft = null; ui.camMsg = null; render(); window.scrollTo(0, 0); }
  else if (b.hasAttribute("data-shootfind")) {
    ui.camMsg = null;
    try { const shot = await Camera.shoot({ cancel: t("cancel"), shutter: t("shutter"), locating: t("locating") }); if (shot) ui.findDraft = shot; }
    catch (err) { ui.camMsg = { camDenied: t("camDenied"), camErr: t("camErr"), gpsDenied: t("gpsDenied"), gpsErr: t("photoGpsFail") }[err] || t("camErr"); }
    render();
  }
  else if (d.sharefind) shareFind(d.sharefind);
  else if (d.delfind) { finds = finds.filter(f => f.id !== d.delfind); store.set("finds", finds); if (ui.viewFind === d.delfind) ui.viewFind = null; render(); }
  else if (b.hasAttribute("data-add")) { ui.adding = true; ui.draft = null; ui.camMsg = null; render(); window.scrollTo(0, 0); }
  else if (b.hasAttribute("data-add-from-map")) {
    ui = { ...ui, tab: "walk", openId: null, adding: true, draft: null, camMsg: null };
    render(); window.scrollTo(0, 0);
  }
  else if (d.checkin) tryCheckin(d.checkin);
  else if (b.hasAttribute("data-locate")) {
    try { await Geo.locate(); drawMe(); map && map.setView([Geo.last.lat, Geo.last.lng], 15); }
    catch (err) { toast(err === "denied" ? t("gpsDenied") : t("gpsErr")); }
  }
  else if (b.hasAttribute("data-shoot")) {
    // Сохраняем то, что уже введено в форме, чтобы не пропало после перерисовки
    const keep = ["f-name", "f-region", "f-place", "f-story"].map(id => [id, document.getElementById(id).value]);
    ui.camMsg = null;
    try {
      const shot = await Camera.shoot({ cancel: t("cancel"), shutter: t("shutter"), locating: t("locating") });
      if (shot) ui.draft = shot;
    } catch (err) {
      ui.camMsg = { camDenied: t("camDenied"), camErr: t("camErr"), gpsDenied: t("gpsDenied"), gpsErr: t("photoGpsFail") }[err] || t("camErr");
    }
    render(); keep.forEach(([id, v]) => { const el = document.getElementById(id); if (el) el.value = v; });
  }
  else if (d.pin) {
    b.disabled = true; b.textContent = t("locating");
    try { const p = await Geo.locate(); pins[d.pin] = { lat: p.lat, lng: p.lng }; store.set("pins", pins); toast(t("pinOk")); }
    catch (err) { toast(err === "denied" ? t("gpsDenied") : t("gpsErr")); }
    render();
  }
  else if (b.hasAttribute("data-copypins")) {
    const txt = pinsText();
    try { await navigator.clipboard.writeText(txt); toast(t("pinsCopied")); }
    catch (err) { const ta = document.getElementById("pins-out"); ta.focus(); ta.select(); }
  }
  else if (d.wear) { profile.title = d.wear; store.set("profile", profile); render(); toast(t("toastWorn", { t: tr(titleById(d.wear).name) })); }
  else if (b.hasAttribute("data-edit")) { ui.editing = true; render(); }
  else if (b.hasAttribute("data-cancel")) { ui.editing = false; render(); }
  else if (b.hasAttribute("data-reset")) { ui.confirmReset = true; render(); }
  else if (b.hasAttribute("data-reset-no")) { ui.confirmReset = false; render(); }
  else if (b.hasAttribute("data-reset-yes")) {
    ["visits", "mine", "profile", "seenTitles", "testMode", "markMode", "finds"].forEach(store.del);
    Photos.clear().catch(() => {});
    finds = []; visits = {}; mine = []; profile = null; seen = []; testMode = false; markMode = false; // записанные точки не удаляем
    go("walk");
  }
});

// Тестовый режим
document.addEventListener("change", e => {
  if (e.target.id === "s-mark") {
    markMode = e.target.checked; store.set("markMode", markMode);
    toast(markMode ? t("markOn") : t("markOff"));
  }
  if (e.target.id === "s-test") {
    testMode = e.target.checked; store.set("testMode", testMode);
    toast(testMode ? t("testOn") : t("testOff"));
  }
});

// Формы: ник при первом запуске, смена ника, новая легенда
document.addEventListener("submit", e => {
  e.preventDefault();
  const v = id => document.getElementById(id).value.trim();
  if (e.target.id === "nickForm" || e.target.id === "editForm") {
    const nick = v(e.target.id === "nickForm" ? "w-nick" : "e-nick");
    if (nick.length < 2 || nick.length > 12) return toast(t("nickErr"));
    if (!profile) {
      profile = { nick, title: null };
      const got = earned(); seen = got.map(x => x.id); store.set("seenTitles", seen);
      if (got.length) profile.title = got[got.length - 1].id;
    } else { profile.nick = nick; toast(t("toastSaved")); }
    store.set("profile", profile); ui.editing = false; render(); return;
  }
  if (e.target.id === "findForm") {
    const c = ui.findDraft; if (!c) return;
    const id = "f" + Date.now();
    Photos.put(id, c.photo).catch(() => {});
    finds.push({ id, lat: c.lat, lng: c.lng, acc: c.acc, time: c.time, note: v("fd-note"), sent: false });
    store.set("finds", finds);
    ui.finding = false; ui.findDraft = null;
    toast(t("findSaved")); go("me"); return;
  }
  if (e.target.id === "addForm") {
    const c = ui.draft;
    if (!c) { ui.camMsg = t("photoNeed"); const keep = ["f-name", "f-region", "f-place", "f-story"].map(id => [id, v(id)]);
      render(); keep.forEach(([id, x]) => document.getElementById(id).value = x); return; }
    const one = s => ({ [lang]: s }); // текст сохраняется на языке, на котором его написали
    const id = "u" + Date.now();
    Photos.put(id, c.photo).catch(() => {});
    mine.push({ id, user: true, lang, author: profile.nick, region: v("f-region"),
      lat: c.lat, lng: c.lng, hasPhoto: true, photoTime: c.time,
      name: one(v("f-name")), place: one(v("f-place")), story: one(v("f-story")) });
    store.set("mine", mine);
    ui.region = "all"; ui.draft = null; ui.camMsg = null;
    checkNewTitles(t("toastAdded")); go("walk");
  }
});

render();
// Тихо пытаемся узнать местоположение, если пользователь уже разрешал доступ, — чтобы показать расстояния
if (profile && navigator.permissions) {
  navigator.permissions.query({ name: "geolocation" }).then(p => {
    if (p.state === "granted") Geo.locate().then(() => { if (ui.tab !== "map") render(); else drawMe(); }).catch(() => {});
  }).catch(() => {});
}

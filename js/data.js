// ============================================================
// Данные приложения: регионы, челленджи, звания.
// Сами легенды — в файлах legends-main.js и legends-hwaseong.js.
// ============================================================

// Радиус отметки в метрах: ближе — печать ставится
window.CHECKIN_RADIUS = 150;
// Для мест с приблизительной точкой (approx:true) — радиус больше
window.CHECKIN_RADIUS_APPROX = 1000;

window.REGIONS = {
  hs:{ko:"화성",ru:"Хвасон",en:"Hwaseong"},
  gg:{ko:"경기",ru:"Кёнгидо",en:"Gyeonggi"}, se:{ko:"서울",ru:"Сеул",en:"Seoul"}, ic:{ko:"인천",ru:"Инчхон",en:"Incheon"},
  gw:{ko:"강원",ru:"Канвондо",en:"Gangwon"}, cc:{ko:"충청",ru:"Чхунчхон",en:"Chungcheong"}, jl:{ko:"전라",ru:"Чолла",en:"Jeolla"},
  gb:{ko:"경북",ru:"Кёнсан-Пукто",en:"N. Gyeongsang"}, gn:{ko:"경남",ru:"Кёнсан-Намдо",en:"S. Gyeongsang"}, jj:{ko:"제주",ru:"Чеджу",en:"Jeju"}
};

// Челленджи: chain — маршрут за N дней; period — между датами; weekend — в субботу/воскресенье
window.CHALLENGES = [
  {id:"jeongjo", type:"chain", ids:["yongju","yungneung","geolleung"], days:7, reward:"t_jeongjo",
   name:{ko:"정조의 길",ru:"Путь Чонджо",en:"Jeongjo's Path"},
   desc:{ko:"용주사 · 융릉 · 건릉을 7일 안에 모두 방문하세요. 아버지를 향한 아들의 길입니다.",
         ru:"Посетите Ёнджуса, Юннын и Гоннын за 7 дней. Это путь сына к отцу — все три места рядом.",
         en:"Visit Yongjusa, Yungneung and Geolleung within 7 days. A son's path to his father; all three are close together."}},
  {id:"monk", type:"chain", ids:["seobongsan","swingil","nunmul"], days:1, reward:"t_monk",
   name:{ko:"스님과 처녀",ru:"Монах и девушка",en:"The Monk and the Girl"},
   desc:{ko:"하루 안에 서봉산 정상, 쉰길바위, 눈물바위를 모두 찾아가세요.",
         ru:"За один день найдите вершину Собонсан, Скалу Шинкиль и Скалу слёз.",
         en:"In one day, visit Seobongsan summit, Swingil Rock and Tear Rock."}},
  {id:"phoenix", type:"chain", ids:["seobongsan","bonghyeol","mubongsan"], days:30, reward:"t_phoenix",
   name:{ko:"화성의 봉황",ru:"Фениксы Хвасона",en:"Phoenixes of Hwaseong"},
   desc:{ko:"30일 안에 봉황 전설이 깃든 세 곳을 모두 찾아가세요.",
         ru:"За 30 дней посетите три места, связанные с легендами о фениксе.",
         en:"Within 30 days, visit three places tied to phoenix legends."}},
  {id:"nov", type:"period", from:"2026-11-01", to:"2026-11-30", need:3, reward:"t_autumn",
   name:{ko:"늦가을 전설 주간",ru:"Легенды поздней осени",en:"Late Autumn Legends"},
   desc:{ko:"11월 안에 아무 전설 3곳을 방문하세요.",ru:"Посетите любые 3 легенды до конца ноября.",en:"Visit any 3 legends before the end of November."}},
  {id:"weekend", type:"weekend", need:2, reward:"t_weekend",
   name:{ko:"주말 산책자",ru:"Прогулка выходного дня",en:"Weekend Walker"},
   desc:{ko:"토요일이나 일요일에 도장 2개를 찍으세요.",ru:"Поставьте 2 печати в субботу или воскресенье.",en:"Collect 2 stamps on a Saturday or Sunday."}}
];

// Звания: count — за число печатей, region — все места региона, challenge — за челлендж, submit — за добавленные легенды
window.TITLES = [
  {id:"t_first", kind:"count", need:1, name:{ko:"첫 발걸음",ru:"Первый шаг",en:"First Step"}, desc:{ko:"전설 1곳 방문",ru:"Посетить 1 легенду",en:"Visit 1 legend"}},
  {id:"t_hunter", kind:"count", need:3, name:{ko:"이야기 사냥꾼",ru:"Охотник за историями",en:"Story Hunter"}, desc:{ko:"전설 3곳 방문",ru:"Посетить 3 легенды",en:"Visit 3 legends"}},
  {id:"t_collector", kind:"count", need:10, name:{ko:"전설 수집가",ru:"Собиратель легенд",en:"Legend Collector"}, desc:{ko:"전설 10곳 방문",ru:"Посетить 10 легенд",en:"Visit 10 legends"}},
  {id:"t_master", kind:"count", need:25, name:{ko:"전설의 대가",ru:"Мастер легенд",en:"Legend Master"}, desc:{ko:"전설 25곳 방문",ru:"Посетить 25 легенд",en:"Visit 25 legends"}},
  {id:"t_hs", kind:"region", region:"hs", need:10, name:{ko:"화성 토박이",ru:"Знаток Хвасона",en:"Hwaseong Local"}, desc:{ko:"화성 전설 10곳 방문",ru:"Посетить 10 легенд Хвасона",en:"Visit 10 Hwaseong legends"}},
  {id:"t_jeongjo", kind:"challenge", ch:"jeongjo", name:{ko:"정조의 벗",ru:"Друг Чонджо",en:"Friend of Jeongjo"}, desc:{ko:"챌린지 ‘정조의 길’ 완료",ru:"Челлендж «Путь Чонджо»",en:"Complete “Jeongjo's Path”"}},
  {id:"t_monk", kind:"challenge", ch:"monk", name:{ko:"서봉산의 증인",ru:"Свидетель Собонсана",en:"Witness of Seobongsan"}, desc:{ko:"챌린지 ‘스님과 처녀’ 완료",ru:"Челлендж «Монах и девушка»",en:"Complete “The Monk and the Girl”"}},
  {id:"t_phoenix", kind:"challenge", ch:"phoenix", name:{ko:"봉황을 본 자",ru:"Видевший феникса",en:"Phoenix Seeker"}, desc:{ko:"챌린지 ‘화성의 봉황’ 완료",ru:"Челлендж «Фениксы Хвасона»",en:"Complete “Phoenixes of Hwaseong”"}},
  {id:"t_autumn", kind:"challenge", ch:"nov", name:{ko:"늦가을 나그네",ru:"Осенний странник",en:"Autumn Wanderer"}, desc:{ko:"챌린지 ‘늦가을 전설 주간’ 완료",ru:"Челлендж «Легенды поздней осени»",en:"Complete “Late Autumn Legends”"}},
  {id:"t_weekend", kind:"challenge", ch:"weekend", name:{ko:"주말 산책자",ru:"Гуляка выходного дня",en:"Weekend Walker"}, desc:{ko:"챌린지 ‘주말 산책자’ 완료",ru:"Челлендж «Прогулка выходного дня»",en:"Complete “Weekend Walker”"}},
  {id:"t_scribe", kind:"submit", need:1, name:{ko:"이야기꾼",ru:"Сказитель",en:"Storyteller"}, desc:{ko:"전설 1개 제보",ru:"Добавить 1 легенду",en:"Submit 1 legend"}}
];

// Игроки-примеры для рейтинга (заменятся данными с сервера)
window.SAMPLE_PLAYERS = [
  {nick:"산바람", stamps:9, title:"t_collector"}, {nick:"Minji", stamps:7, title:"t_jeongjo"},
  {nick:"화성토박이", stamps:5, title:"t_hs"}, {nick:"Алексей", stamps:2, title:"t_first"}
];

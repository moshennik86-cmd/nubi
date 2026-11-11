// ============================================================
// Связь с сервером Supabase.
// Ключ publishable — открытый, его можно хранить в приложении.
// Все очки и проверки считает сервер (функции в nubi-server/01_schema.sql).
// ============================================================
window.SUPABASE_URL = "https://bbxjpvbpyaixqzklrawy.supabase.co";
window.SUPABASE_KEY = "sb_publishable_FsJueD00h5TOYBtpyMaXMQ_HzXWzV0x";

window.Server = {
  db: null,
  user: null,      // текущий пользователь (анонимный аккаунт; позже — Kakao)
  online: false,   // есть ли связь с сервером

  // Подключение. Если библиотека не загрузилась или нет сети — работаем без сервера.
  async init() {
    try {
      if (!window.supabase || !window.supabase.createClient) return false;
      this.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, storageKey: "nubi_auth" }
      });
      const { data } = await this.db.auth.getSession();
      this.user = data.session ? data.session.user : null;
      this.online = true;
      return true;
    } catch (e) { this.online = false; return false; }
  },

  // Войти (создать анонимный аккаунт, если ещё нет)
  async ensureUser() {
    if (this.user) return this.user;
    const { data, error } = await this.db.auth.signInAnonymously();
    if (error) throw error;
    this.user = data.user;
    return this.user;
  },

  // Профиль игрока на сервере
  async getProfile() {
    if (!this.user) return null;
    const { data } = await this.db.from("profiles").select("*").eq("id", this.user.id).maybeSingle();
    return data;
  },

  // Создать профиль. Ошибка "taken" — ник уже занят.
  async createProfile(nick, lang) {
    await this.ensureUser();
    const { error } = await this.db.from("profiles").insert({ id: this.user.id, nick, lang });
    if (error) throw (error.code === "23505" ? "taken" : error.message);
  },

  async updateProfile(fields) {
    if (!this.user) return;
    const { error } = await this.db.from("profiles").update(fields).eq("id", this.user.id);
    if (error) throw (error.code === "23505" ? "taken" : error.message);
  },

  // Мои печати с сервера: { id места: {t, walked} }
  async myVisits() {
    const { data, error } = await this.db.from("visits")
      .select("place_id, at, walked").order("at", { ascending: true }).limit(5000);
    if (error) throw error.message;
    const out = {};
    for (const v of data) out[v.place_id] = { t: new Date(v.at).getTime(), test: false, server: true };
    return out;
  },

  // Отметиться на месте. Ответ сервера: {ok, reason, pts_collection, pts_hikes, walked, bonuses...}
  async checkin(placeId, pos) {
    const { data, error } = await this.db.rpc("checkin",
      { p_place: placeId, p_lat: pos.lat, p_lng: pos.lng, p_acc: pos.acc });
    if (error) throw error.message;
    return data;
  },

  async startAscent(pos) {
    const { data, error } = await this.db.rpc("start_ascent", { p_lat: pos.lat, p_lng: pos.lng, p_acc: pos.acc });
    if (error) throw error.message;
    return data;
  },

  async leaderboard(kind, month, region) {
    const { data, error } = await this.db.rpc("leaderboard",
      { p_kind: kind, p_month: month, p_region: region || null, p_limit: 50 });
    if (error) throw error.message;
    return data || [];
  },

  async keeper(placeId) {
    const { data } = await this.db.rpc("place_keeper", { p_place: placeId });
    return data && data[0] ? data[0] : null;
  },

  async totals() {
    const { data } = await this.db.rpc("my_totals");
    return data;
  },

  // Координаты мест с сервера (там они уточняются после модерации)
  async places() {
    const { data } = await this.db.from("places").select("id, lat, lng, approx, difficulty");
    return data || [];
  },

  // Одобренные легенды других игроков + мои (любого статуса)
  async userLegends() {
    const { data } = await this.db.from("user_legends")
      .select("id, author, author_nick, lang, region, name, place, story, lat, lng, photo_path, photo_at, status")
      .order("created_at", { ascending: false }).limit(500);
    return data || [];
  },

  // Загрузить фото (dataURL) в папку bucket/<мой id>/<имя>.jpg. Возвращает путь.
  async uploadPhoto(bucket, name, dataUrl) {
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${this.user.id}/${name}.jpg`;
    const { error } = await this.db.storage.from(bucket).upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (error) throw error.message;
    return path;
  },
  photoUrl(path) { return this.db.storage.from("legends").getPublicUrl(path).data.publicUrl; },

  async submitLegend(l, shot) {
    const id = crypto.randomUUID();
    const photo_path = await this.uploadPhoto("legends", id, shot.photo);
    const { error } = await this.db.from("user_legends").insert({
      id, lang: l.lang, region: l.region, name: l.name, place: l.place, story: l.story,
      lat: shot.lat, lng: shot.lng, photo_path, photo_at: new Date(shot.time).toISOString()
    });
    if (error) throw error.message;
    return id;
  },

  async submitFind(f, dataUrl) {
    const id = crypto.randomUUID();
    const photo_path = await this.uploadPhoto("finds", id, dataUrl);
    const { error } = await this.db.from("finds").insert({
      id, lat: f.lat, lng: f.lng, acc: f.acc, shot_at: new Date(f.time).toISOString(), note: f.note || null, photo_path
    });
    if (error) throw error.message;
    return id;
  },

  async submitPin(placeId, pos) {
    const { error } = await this.db.from("pin_suggestions").insert({ place_id: placeId, lat: pos.lat, lng: pos.lng, acc: pos.acc });
    if (error) throw error.message;
  }
};

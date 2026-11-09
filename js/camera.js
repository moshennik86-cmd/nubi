// ============================================================
// Камера внутри приложения и хранение фото.
// Фото можно сделать ТОЛЬКО камерой приложения (галереи нет),
// и в момент снимка автоматически записываются GPS-координаты.
// ============================================================

// ----- Хранилище фото на телефоне (IndexedDB: фото слишком большие для localStorage) -----
window.Photos = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const r = indexedDB.open("nubi-photos", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("photos");
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => rej(r.error);
    });
  },
  async put(id, dataUrl) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const tx = db.transaction("photos", "readwrite");
      tx.objectStore("photos").put(dataUrl, id);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  },
  async get(id) {
    const db = await this.open();
    return new Promise(res => {
      const r = db.transaction("photos").objectStore("photos").get(id);
      r.onsuccess = () => res(r.result || null); r.onerror = () => res(null);
    });
  },
  async clear() {
    const db = await this.open();
    return new Promise(res => { const tx = db.transaction("photos", "readwrite"); tx.objectStore("photos").clear(); tx.oncomplete = res; });
  }
};

// ----- Камера -----
// Camera.shoot() открывает камеру на весь экран и возвращает Promise:
//   {photo: dataURL, lat, lng, acc, time} — снимок с координатами
//   null — пользователь нажал «Отмена»
// Ошибки: "camDenied" — нет доступа к камере, "camErr" — камера не открылась,
//         "gpsDenied"/"gpsErr" — снимок сделан, но координаты не получены (снимок не принимается)
window.Camera = {
  shoot(texts) {
    return new Promise(async (resolve, reject) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return reject("camErr");
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false
        });
      } catch (e) { return reject(e && e.name === "NotAllowedError" ? "camDenied" : "camErr"); }

      // Сразу начинаем определять координаты, пока человек наводит камеру
      const gps = Geo.locate();
      gps.catch(() => {});

      // Полноэкранный слой с видео и кнопками
      const box = document.createElement("div");
      box.className = "cam";
      box.innerHTML = `<video playsinline autoplay muted></video>
        <div class="cam-bar">
          <button type="button" class="cam-cancel">${texts.cancel}</button>
          <button type="button" class="cam-shutter" aria-label="${texts.shutter}"></button>
          <span class="cam-status">${texts.locating}</span>
        </div>`;
      document.body.appendChild(box);
      const video = box.querySelector("video");
      video.srcObject = stream;
      const status = box.querySelector(".cam-status");
      gps.then(() => status.textContent = "📍 GPS ✓").catch(() => status.textContent = "📍 GPS ✗");

      const close = () => { stream.getTracks().forEach(t => t.stop()); box.remove(); };

      box.querySelector(".cam-cancel").onclick = () => { close(); resolve(null); };
      box.querySelector(".cam-shutter").onclick = async () => {
        // Кадр с видео -> картинка не больше 1280 px по длинной стороне (экономим место)
        const w = video.videoWidth, h = video.videoHeight;
        if (!w) return;
        const k = Math.min(1, 1280 / Math.max(w, h));
        const c = document.createElement("canvas");
        c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext("2d").drawImage(video, 0, 0, c.width, c.height);
        const photo = c.toDataURL("image/jpeg", 0.75);
        const quality = Camera.quality(c);
        const time = Date.now();
        close();
        try {
          const p = await gps;
          resolve({ photo, lat: p.lat, lng: p.lng, acc: p.acc, time, quality });
        } catch (e) { reject(e); }
      };
    });
  },

  // Простая проверка качества прямо на телефоне:
  //   dark   — слишком темно (средняя яркость ниже порога)
  //   blurry — смазано (мало резких перепадов яркости, «дисперсия лапласиана»)
  // Пороги подобраны с запасом; если будут ложные срабатывания — поправим.
  quality(canvas) {
    const W = 320, H = Math.round(canvas.height * W / canvas.width);
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d"); ctx.drawImage(canvas, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data;
    const g = new Float32Array(W * H);
    let sum = 0;
    for (let i = 0; i < W * H; i++) { g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; sum += g[i]; }
    const mean = sum / (W * H);
    let n = 0, m = 0, m2 = 0;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const lap = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - W] - g[i + W];
      n++; const dl = lap - m; m += dl / n; m2 += dl * (lap - m);
    }
    const sharp = m2 / n;
    return { dark: mean < 45, blurry: sharp < 30, mean: Math.round(mean), sharp: Math.round(sharp) };
  }
};

/* ============================================================================
 *  app.js — движок лендинга.
 *  Читает site-config.js и строит страницу. ТРОГАТЬ НЕ НУЖНО.
 * ==========================================================================*/

(function () {
  "use strict";

  if (typeof SITE === "undefined") {
    document.body.innerHTML =
      '<p style="padding:40px;font:16px sans-serif;color:#fff;background:#111">' +
      "Не найден site-config.js — он должен лежать рядом с index.html</p>";
    return;
  }

  /* ---------- утилиты ---------------------------------------------------- */

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const escapeHtml = (str) =>
    String(str ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // переносы строк в тексте -> <br>
  const nl2br = (str) => escapeHtml(str).replace(/\n/g, "<br>");

  /* ---------- 1. ЦВЕТА / ПЕРЕМЕННЫЕ -------------------------------------- */

  function applyTheme() {
    const palette = (typeof PALETTES !== "undefined" && PALETTES[SITE.palette]) || {};
    const c = Object.assign({}, palette, SITE.colorsOverride || {});
    const mode = (typeof EASY !== "undefined" && EASY.mode) || "dark";
    const a = SITE.animations || {};
    const f = SITE.fonts || {};
    const sh = SITE.shape || {};

    const root = document.documentElement;
    const set = (k, v) => root.style.setProperty(k, v);

    Object.keys(c).forEach((k) => {
      const cssName =
        { bg: "--bg", surface: "--surface", surfaceAlt: "--surface-alt",
          text: "--text", muted: "--muted", border: "--border",
          primary: "--primary", primaryDark: "--primary-dark", accent: "--accent",
          gradientFrom: "--gradient-from", gradientTo: "--gradient-to" }[k] || "--" + k;
      set(cssName, c[k]);
    });

    set("--radius", (sh.radius ?? 18) + "px");
    set("--btn-radius", (sh.buttonRadius ?? 999) + "px");
    set("--anim-duration", (a.duration ?? 700) + "ms");
    set("--anim-dist", (a.distance ?? 40) + "px");
    set("--base-size", f.baseSize ?? 17);
    set("--font-heading", `"${f.heading || "sans-serif"}"`);
    set("--font-body", `"${f.body || "sans-serif"}"`);
    set("--smooth", a.smoothScroll === false ? "auto" : "smooth");

    document.documentElement.dataset.mode = mode;
    if (mode === "light") document.documentElement.style.colorScheme = "light";

    if (!a.enabled) document.body.classList.add("no-anim");
    if (a.smoothScroll === false) document.documentElement.classList.add("no-smooth");

    // шрифты Google
    if (f.google && f.heading) {
      const families = [f.heading, f.body].filter(Boolean).map(
        (name) => "family=" + name.trim().replace(/ /g, "+") + ":wght@400;600;700;800"
      );
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?" + families.join("&") + "&display=swap";
      document.head.appendChild(link);
    }
  }

  /* ---------- 2. МЕТА И ОФОРМЛЕНИЕ --------------------------------------- */

  function applyMeta() {
    const m = SITE.meta || {};
    document.title = m.title || SITE.brand?.name || "Сайт";

    const desc = document.createElement("meta");
    desc.name = "description";
    desc.content = m.description || "";
    document.head.appendChild(desc);

    const viewport = document.createElement("meta");
    viewport.name = "viewport";
    viewport.content = "width=device-width, initial-scale=1";
    document.head.appendChild(viewport);

    // иконка вкладки из эмодзи
    if (m.emoji) {
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
        `<text y=".9em" font-size="90">${m.emoji}</text></svg>`;
      const ico = document.createElement("link");
      ico.rel = "icon";
      ico.href = "data:image/svg+xml," + encodeURIComponent(svg);
      document.head.appendChild(ico);
    }
  }

  /* ---------- 3. АНИМАЦИИ ПРОКРУТКИ ------------------------------------- */

  let observer = null;

  function revealEngine() {
    const a = SITE.animations || {};
    if (!a.enabled || !("IntersectionObserver" in window)) {
      $$(".reveal").forEach((el) => el.classList.add("is-in"));
      return;
    }

    observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.classList.add("is-in");
          obs.unobserve(el);

          // после появления снимаем анимационные стили, чтобы они не мешали
          // наклону карточки за курсором и другим интерактивным эффектам
          const delay = parseFloat(el.style.getPropertyValue("--anim-delay")) || 0;
          const dur = SITE.animations?.duration ?? 700;
          window.setTimeout(() => {
            el.classList.remove("reveal", "is-in");
            el.style.removeProperty("--anim-delay");
            el.style.removeProperty("transform");
          }, delay + dur + 60);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    $$(".reveal").forEach((el) => observer.observe(el));
  }

  // помечает элемент как анимируемый со сдвигом по времени
  const reveal = (el, index = 0, animOverride) => {
    if (!el) return el;
    el.classList.add("reveal");
    el.dataset.anim = animOverride || (SITE.animations?.style ?? "up");
    const stagger = SITE.animations?.stagger ?? 90;
    el.style.setProperty("--anim-delay", (index % 8) * stagger + "ms");
    return el;
  };

  /* ---------- 4. СБОРКА БЛОКОВ ------------------------------------------ */

  const starRow = (n) => "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));

  const visual = (image, emoji) =>
    image
      ? `<img src="${escapeHtml(image)}" alt="" loading="lazy">`
      : `<span aria-hidden="true">${emoji || "✨"}</span>`;

  function buildHeader() {
    const b = SITE.brand || {};
    const nav = (SITE.nav || [])
      .map((n) => `<a href="${escapeHtml(n.href)}">${escapeHtml(n.text)}</a>`)
      .join("");

    const header = `
      <div class="container header__inner">
        <a class="logo" href="#top">
          <span class="logo__mark">${b.logoEmoji || "✦"}</span>
          <span>
            <span class="logo__name">${escapeHtml(b.name || "")}</span>
            <span class="logo__slogan">${escapeHtml(b.slogan || "")}</span>
          </span>
        </a>
        <nav class="nav" id="nav">${nav}</nav>
        <a class="btn btn--primary btn--sm header__cta" href="${escapeHtml(SITE.booking?.telegram || "#booking")}" target="_blank" rel="noopener">
          ${escapeHtml(SITE.booking?.buttonText || "Записаться")}
        </a>
        <button class="burger" id="burger" aria-label="Меню">
          <span></span><span></span><span></span>
        </button>
      </div>`;

    const headerEl = $("#header");
    headerEl.innerHTML = header;
    headerEl.className = "header";
  }

  function buildHero() {
    const h = SITE.hero || {};
    const hero = $("#hero");
    if (!hero) return;

    const isImage = (typeof EASY !== "undefined" && EASY.heroStyle === "image") && h.cardImage;

    hero.innerHTML = `
      <div class="hero__bg" data-parallax="0.5">
        <span class="blob blob--1"></span>
        <span class="blob blob--2"></span>
        <span class="blob blob--3"></span>
      </div>
      <div class="container hero__grid">
        <div class="hero__text">
          <div class="badge"><span class="badge__dot"></span>${escapeHtml(h.badge || "")}</div>
          <h1 class="hero__title">${nl2br(h.title || "")}</h1>
          <p class="hero__subtitle">${escapeHtml(h.subtitle || "")}</p>
          <div class="hero__actions">
            <a class="btn btn--primary" href="${escapeHtml(h.primaryButton?.href || "#booking")}">${escapeHtml(h.primaryButton?.text || "")}</a>
            <a class="btn btn--ghost" href="${escapeHtml(h.secondaryButton?.href || "#services")}">${escapeHtml(h.secondaryButton?.text || "")}</a>
          </div>
        </div>
        <div class="hero__card" data-tilt>
          <div class="float-tag">${escapeHtml(SITE.contacts?.hours?.[0]?.time || "Открыто")}</div>
          <div class="hero__visual">${visual(isImage ? h.cardImage : "", h.cardEmoji)}</div>
          <h3>${escapeHtml(h.cardTitle || "")}</h3>
          <p>${escapeHtml(h.cardNote || "")}</p>
          <div class="chip-row">
            <span class="chip chip--free">10:00</span>
            <span class="chip chip--free">13:00</span>
            <span class="chip">16:00</span>
            <span class="chip">19:00</span>
          </div>
        </div>
      </div>`;
  }

  function buildStats() {
    const box = $("#stats");
    if (!box) return;
    if (typeof EASY !== "undefined" && EASY.showStats === false) { box.remove(); return; }

    box.className = "section";
    box.innerHTML = `
      <div class="container">
        <div class="stats">
          ${(SITE.stats || [])
            .map(
              (s, i) => `
            <div class="stat" data-reveal-index="${i}">
              <div class="stat__value" data-count="${s.value}" data-suffix="${escapeHtml(s.suffix || "")}" data-decimals="${s.decimals || 0}">0</div>
              <div class="stat__label">${escapeHtml(s.label || "")}</div>
            </div>`
            )
            .join("")}
        </div>
      </div>`;
  }

  function buildAbout() {
    const a = SITE.about || {};
    const box = $("#about");
    if (!box) return;

    box.className = "section section--alt";
    box.innerHTML = `
      <div class="container">
        <div class="section-head section-head--center">
          <div class="eyebrow">О нас</div>
          <h2 class="h2">${escapeHtml(a.title || "")}</h2>
          <p class="lead">${escapeHtml(a.subtitle || "")}</p>
        </div>
        <div class="grid grid--4">
          ${(a.features || [])
            .map(
              (f, i) => `
            <article class="card" data-reveal-index="${i}">
              <div class="card__icon">${f.emoji || "✦"}</div>
              <h3>${escapeHtml(f.title)}</h3>
              <p>${escapeHtml(f.text)}</p>
            </article>`
            )
            .join("")}
        </div>
      </div>`;
  }

  function buildServices() {
    const s = SITE.services || {};
    const box = $("#services");
    if (!box) return;

    box.className = "section";
    box.innerHTML = `
      <div class="container">
        <div class="section-head">
          <div class="eyebrow">Прайс</div>
          <h2 class="h2">${escapeHtml(s.title || "")}</h2>
          <p class="lead">${escapeHtml(s.subtitle || "")}</p>
        </div>
        <div class="grid grid--3">
          ${(s.items || [])
            .map(
              (it, i) => `
            <article class="card service" data-reveal-index="${i}">
              ${it.badge ? `<span class="card__tag">${escapeHtml(it.badge)}</span>` : ""}
              <div class="service__top">
                <div class="card__icon">${it.emoji || "✦"}</div>
                <div class="service__price">
                  <b>${escapeHtml(it.price || "")}</b>
                  <span class="service__time">${escapeHtml(it.time || "")}</span>
                </div>
              </div>
              <h3>${escapeHtml(it.name)}</h3>
              <p>${escapeHtml(it.text || "")}</p>
            </article>`
            )
            .join("")}
        </div>
        ${s.note ? `<p class="lead" style="margin-top:28px;text-align:center">${escapeHtml(s.note)}</p>` : ""}
      </div>`;
  }

  function buildMasters() {
    const m = SITE.masters || {};
    const box = $("#masters");
    if (!box) return;
    if (!m.items || !m.items.length) { box.remove(); return; }

    box.className = "section section--alt";
    box.innerHTML = `
      <div class="container">
        <div class="section-head section-head--center">
          <div class="eyebrow">Команда</div>
          <h2 class="h2">${escapeHtml(m.title || "")}</h2>
          <p class="lead">${escapeHtml(m.subtitle || "")}</p>
        </div>
        <div class="grid grid--3">
          ${m.items
            .map(
              (p, i) => `
            <article class="card master" data-reveal-index="${i}">
              <div class="master__avatar">${visual(p.image, p.emoji)}</div>
              <h3>${escapeHtml(p.name)}</h3>
              <div class="master__role">${escapeHtml(p.role || "")}</div>
              <p>${escapeHtml(p.text || "")}</p>
            </article>`
            )
            .join("")}
        </div>
      </div>`;
  }

  function buildGallery() {
    const g = SITE.gallery || {};
    const box = $("#gallery");
    if (!box) return;
    if (typeof EASY !== "undefined" && EASY.showGallery === false) { box.remove(); return; }

    box.className = "section";
    box.innerHTML = `
      <div class="container">
        <div class="section-head section-head--center">
          <div class="eyebrow">Портфолио</div>
          <h2 class="h2">${escapeHtml(g.title || "")}</h2>
          <p class="lead">${escapeHtml(g.subtitle || "")}</p>
        </div>
        <div class="grid grid--3">
          ${(g.items || [])
            .map(
              (it, i) => `
            <figure class="gallery__item" data-reveal-index="${i}">
              ${visual(it.image, it.emoji)}
              <figcaption class="gallery__caption">${escapeHtml(it.caption || "")}</figcaption>
            </figure>`
            )
            .join("")}
        </div>
      </div>`;
  }

  function buildTestimonials() {
    const t = SITE.testimonials || {};
    const box = $("#reviews");
    if (!box) return;
    if (typeof EASY !== "undefined" && EASY.showTestimonials === false) { box.remove(); return; }

    box.className = "section section--alt";
    box.innerHTML = `
      <div class="container">
        <div class="section-head section-head--center">
          <div class="eyebrow">Отзывы</div>
          <h2 class="h2">${escapeHtml(t.title || "")}</h2>
          <p class="lead">${escapeHtml(t.subtitle || "")}</p>
        </div>
        <div class="grid grid--3">
          ${(t.items || [])
            .map(
              (r, i) => `
            <article class="card" data-reveal-index="${i}">
              <div class="review__stars">${starRow(r.stars || 5)}</div>
              <p class="review__text">${escapeHtml(r.text)}</p>
              <div class="review__author">
                <div class="review__ava">${escapeHtml((r.name || "?").charAt(0))}</div>
                <div class="review__name">${escapeHtml(r.name)}</div>
              </div>
            </article>`
            )
            .join("")}
        </div>
      </div>`;
  }

  function buildContacts() {
    const c = SITE.contacts || {};
    const box = $("#contacts");
    if (!box) return;

    const map = c.map || {};
    let mapHtml = "";
    if (map.enabled) {
      let src = map.customEmbed;
      if (!src) {
        const d = 0.006 * Math.pow(2, 16 - (map.zoom || 16)) * 3;
        const bbox = [map.lon - d, map.lat - d / 2, map.lon + d, map.lat + d / 2].join(",");
        src =
          `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}` +
          `&layer=mapnik&marker=${map.lat},${map.lon}`;
      }
      mapHtml = `
        <div class="map-wrap">
          <iframe src="${escapeHtml(src)}" height="${map.height || 420}" loading="lazy"
                  title="Карта" referrerpolicy="no-referrer"></iframe>
          <div class="map-pill">📍 ${escapeHtml(map.title || c.addressShort || "")}</div>
        </div>`;
    } else {
      mapHtml = `
        <div class="map-wrap" style="min-height:${map.height || 420}px;display:grid;place-items:center;font-size:56px">🗺</div>`;
    }

    box.className = "section";
    box.innerHTML = `
      <div class="container">
        <div class="section-head">
          <div class="eyebrow">Контакты</div>
          <h2 class="h2">${escapeHtml(c.title || "")}</h2>
          <p class="lead">${escapeHtml(c.subtitle || "")}</p>
        </div>
        <div class="contacts__grid">
          <div>
            <div class="info-list">
              <div class="info">
                <div class="info__icon">📍</div>
                <div>
                  <div class="info__label">Адрес</div>
                  <div class="info__value">${escapeHtml(c.address || "")}</div>
                </div>
              </div>
              <div class="info">
                <div class="info__icon">📞</div>
                <div>
                  <div class="info__label">Телефон</div>
                  <div class="info__value"><a href="tel:${escapeHtml(c.phoneLink || "")}">${escapeHtml(c.phone || "")}</a></div>
                </div>
              </div>
              <div class="info">
                <div class="info__icon">✉️</div>
                <div>
                  <div class="info__label">Почта</div>
                  <div class="info__value"><a href="mailto:${escapeHtml(c.email || "")}">${escapeHtml(c.email || "")}</a></div>
                </div>
              </div>
              <div class="info">
                <div class="info__icon">🕐</div>
                <div>
                  <div class="info__label">Часы работы</div>
                  <div class="hours">
                    ${(c.hours || [])
                      .map((h) => `<div class="hours__row"><span>${escapeHtml(h.days)}</span><span>${escapeHtml(h.time)}</span></div>`)
                      .join("")}
                  </div>
                </div>
              </div>
            </div>
            <div class="footer__socials">
              ${(c.socials || [])
                .map((s) => `<a href="${escapeHtml(s.link)}" target="_blank" rel="noopener">${s.emoji || ""} ${escapeHtml(s.text)}</a>`)
                .join("")}
            </div>
          </div>
          ${mapHtml}
        </div>
      </div>`;
  }

  function buildBooking() {
    const b = SITE.booking || {};
    const box = $("#booking");
    if (!box) return;

    box.className = "section";
    box.innerHTML = `
      <div class="container">
        <div class="cta">
          <h2>${escapeHtml(b.title || "")}</h2>
          <p>${escapeHtml(b.subtitle || "")}</p>
          <p style="margin:26px 0 0">
            <a class="btn btn--primary" href="${escapeHtml(b.telegram || "#")}" target="_blank" rel="noopener">
              ${escapeHtml(b.buttonText || "Записаться")}
            </a>
          </p>
          ${b.note ? `<p class="cta__note">${escapeHtml(b.note)}</p>` : ""}
        </div>
      </div>`;
  }

  function buildFooter() {
    const f = SITE.footer || {};
    const c = SITE.contacts || {};
    const box = $("#footer");
    if (!box) return;

    box.className = "footer";
    box.innerHTML = `
      <div class="container footer__inner">
        <div>
          <div>${escapeHtml(f.text || "")}</div>
          ${f.note ? `<div style="opacity:.7;font-size:.84rem;margin-top:4px">${escapeHtml(f.note)}</div>` : ""}
        </div>
        <div class="footer__socials">
          <a href="tel:${escapeHtml(c.phoneLink || "")}">${escapeHtml(c.phone || "")}</a>
          <a href="#top">Наверх ↑</a>
        </div>
      </div>`;
  }

  /* ---------- 5. ПОВЕДЕНИЕ ---------------------------------------------- */

  function initHeader() {
    const header = $("#header");
    const nav = $("#nav");
    const burger = $("#burger");
    const progress = $("#progress");

    burger?.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      burger.classList.toggle("is-open", open);
      document.body.classList.toggle("no-scroll", open);
    });

    nav?.addEventListener("click", (e) => {
      if (e.target.tagName !== "A") return;
      nav.classList.remove("is-open");
      burger?.classList.remove("is-open");
      document.body.classList.remove("no-scroll");
    });

    const toTop = document.createElement("button");
    toTop.className = "to-top";
    toTop.setAttribute("aria-label", "Наверх");
    toTop.textContent = "↑";
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    document.body.appendChild(toTop);

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        header.classList.toggle("is-stuck", y > 40);
        toTop.classList.toggle("is-visible", y > 600);

        if (progress && SITE.animations?.scrollProgress !== false) {
          const max = document.documentElement.scrollHeight - window.innerHeight;
          progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
        }

        if (SITE.animations?.parallax) {
          const k = SITE.animations.parallaxStrength ?? 0.15;
          $$("[data-parallax]").forEach((el) => {
            const s = parseFloat(el.dataset.parallax) || 1;
            el.style.transform = `translate3d(0, ${y * k * s}px, 0)`;
          });
        }

        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // подсветка активного пункта меню
  function initNavSpy() {
    const links = $$("#nav a");
    if (!links.length || !("IntersectionObserver" in window)) return;
    const sections = links
      .map((a) => ({ a, el: document.querySelector(a.getAttribute("href")) }))
      .filter((x) => x.el);
    if (!sections.length) return;

    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          links.forEach((l) => l.classList.remove("is-active"));
          const hit = sections.find((s) => s.el === e.target);
          if (hit) hit.a.classList.add("is-active");
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => spy.observe(s.el));
  }

  // оживающие цифры
  function initCounters() {
    if (!SITE.animations?.counters) return;
    const nums = $$("[data-count]");
    if (!nums.length) return;

    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const run = (el) => {
      const target = parseFloat(el.dataset.count) || 0;
      const suffix = el.dataset.suffix || "";
      const decimals = parseInt(el.dataset.decimals || "0", 10);
      const dur = 1400;
      const t0 = performance.now();

      const step = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        const v = target * easeOut(p);
        el.textContent = v.toFixed(decimals).replace(".", ",") + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if (!("IntersectionObserver" in window)) { nums.forEach(run); return; }

    const io = new IntersectionObserver(
      (entries, obs) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        run(e.target);
        obs.unobserve(e.target);
      }),
      { threshold: 0.4 }
    );
    nums.forEach((n) => io.observe(n));
  }

  // лёгкий наклон карточки за курсором
  function initTilt() {
    if (typeof window.matchMedia !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    $$("[data-tilt]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
      });
    });
  }

  /* ---------- 6. ЗАПУСК -------------------------------------------------- */

  function boot() {
    applyMeta();
    applyTheme();

    buildHeader();
    buildHero();
    buildStats();
    buildAbout();
    buildServices();
    buildMasters();
    buildGallery();
    buildTestimonials();
    buildContacts();
    buildBooking();
    buildFooter();

    // размечаем анимируемые элементы
    $$("section, .section").forEach((sec) => {
      $$(".section-head", sec).forEach((el) => reveal(el, 0));
      const head = $(".section-head", sec);
      const title = head?.querySelector(".h2");
      const eyebrow = head?.querySelector(".eyebrow");

      if (eyebrow) { eyebrow.classList.add("reveal"); eyebrow.dataset.anim = "up"; eyebrow.style.setProperty("--anim-delay", "0ms"); }
      if (title)   { title.classList.add("reveal");   title.dataset.anim = "up";   title.style.setProperty("--anim-delay", "90ms"); }
      const lead = head?.querySelector(".lead");
      if (lead)    { lead.classList.add("reveal");    lead.dataset.anim = "up";    lead.style.setProperty("--anim-delay", "180ms"); }
    });

    $$("[data-reveal-index]").forEach((el) => reveal(el, parseInt(el.dataset.revealIndex, 10) || 0));

    $$(".hero__text > *").forEach((el, i) => reveal(el, i));
    reveal($(".hero__card"), 3, "zoom");
    $$(".info").forEach((el, i) => reveal(el, i, "left"));
    reveal($(".map-wrap"), 1, "zoom");
    reveal($(".cta"), 0, "zoom");
    $$(".footer").forEach((el) => reveal(el, 0));

    revealEngine();
    initHeader();
    initNavSpy();
    initCounters();
    initTilt();

    document.body.classList.add("is-ready");
    document.documentElement.classList.add("loaded");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

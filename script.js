/* ═══════════════════════════════════════════════════════════════
   INSEPRIN — Interacciones y animaciones
   · Funciona sin GSAP/Lenis (mejora progresiva): si las librerías no cargan,
     el sitio sigue 100 % usable con todo el contenido visible.
   · Respeta prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ───────── Helpers ───────── */
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var WA_NUMBER = '525662516690';

  var hasGsap = false, lenis = null;
  var body = document.body;
  body.classList.add('is-locked');

  /* ═════════════════════════════════════════
     LOADER
     ═════════════════════════════════════════ */
  function runLoader(onExitStart) {
    var loader = $('#loader');
    if (!loader) { body.classList.remove('is-locked'); onExitStart(); return; }

    var arc = $('#loaderArc'), bar = $('#loaderBar'), pct = $('#loaderPct'), log = $('#loaderLog');
    var steps = [
      [0,  'INICIALIZANDO SISTEMA'],
      [20, 'CARGANDO MÓDULOS DE VIGILANCIA'],
      [44, 'VERIFICANDO PERMISOS DGSP · REPSE'],
      [68, 'SINCRONIZANDO CENTRO DE MONITOREO'],
      [90, 'ACCESO AUTORIZADO']
    ];
    var minDur = reduce ? 500 : 2600;
    var start = performance.now();
    var pageLoaded = document.readyState === 'complete';
    var p = 0, done = false, lastStep = -1;

    if (!pageLoaded) window.addEventListener('load', function () { pageLoaded = true; });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {});

    function render() {
      var v = Math.round(p);
      if (pct) pct.textContent = String(v).padStart(3, '0');
      if (arc) arc.style.strokeDashoffset = String(100 - p);
      if (bar) bar.style.transform = 'scaleX(' + (p / 100) + ')';
      for (var i = steps.length - 1; i >= 0; i--) {
        if (p >= steps[i][0]) { if (i !== lastStep) { lastStep = i; if (log) log.textContent = steps[i][1]; } break; }
      }
    }

    function tick(now) {
      if (done) return;
      var elapsed = now - start;
      var timeP = clamp(elapsed / minDur, 0, 1);
      var eased = 1 - Math.pow(1 - timeP, 2.2);
      var cap = (pageLoaded || elapsed > 7000) ? 100 : 92;
      var target = Math.min(eased * 100, cap);
      p += (target - p) * 0.18;
      if (target - p < 0.15) p = target;
      render();
      if (p >= 99.9 && timeP >= 1 && (pageLoaded || elapsed > 7000)) { p = 100; render(); finish(); return; }
      requestAnimationFrame(tick);
    }

    function finish() {
      done = true;
      var core = $('.loader__core', loader), top = $('.loader__panel--top', loader), bot = $('.loader__panel--bottom', loader);
      var fade = $$('.loader__grid, .loader__scan', loader);
      var ease = 'cubic-bezier(.76,0,.24,1)';
      setTimeout(function () {
        if (loader.animate) {
          core.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.18)' }], { duration: 520, easing: ease, fill: 'forwards' });
          fade.forEach(function (f) { f.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' }); });
          top.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-101%)' }], { duration: 1000, delay: 220, easing: ease, fill: 'forwards' });
          var a = bot.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(101%)' }], { duration: 1000, delay: 220, easing: ease, fill: 'forwards' });
          a.onfinish = function () { loader.remove(); };
        } else { loader.remove(); }
        body.classList.remove('is-locked');
        if (lenis) lenis.start();
        setTimeout(onExitStart, reduce ? 0 : 520);
      }, 320);
    }

    if (lenis) lenis.stop();
    requestAnimationFrame(tick);
  }

  /* ═════════════════════════════════════════
     SMOOTH SCROLL (Lenis) + GSAP
     ═════════════════════════════════════════ */
  function initScrollEngine() {
    hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
    if (hasGsap) { gsap.registerPlugin(ScrollTrigger); ScrollTrigger.config({ ignoreMobileResize: true }); }

    if (typeof window.Lenis !== 'undefined' && !reduce) {
      try {
        lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
        if (hasGsap) {
          lenis.on('scroll', ScrollTrigger.update);
          gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
          gsap.ticker.lagSmoothing(0);
        } else {
          (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
        }
        lenis.stop(); // se libera al salir el loader
      } catch (e) { lenis = null; }
    }
  }

  function navOffset() { var n = $('.nav'); return n ? n.offsetHeight : 72; }

  function scrollToTarget(target) {
    if (!target) return;
    var off = navOffset();
    if (lenis) { lenis.scrollTo(target, { offset: -off, duration: 1.4 }); return; }
    var top = target.getBoundingClientRect().top + window.pageYOffset - off;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
  }

  function initAnchors() {
    $$('a[href^="#"]').forEach(function (a) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      a.addEventListener('click', function (e) {
        var t = document.getElementById(id.slice(1));
        if (!t) return;
        e.preventDefault();
        closeMenu();
        scrollToTarget(t);
        try { history.replaceState(null, '', id); } catch (err) {}
      });
    });
  }

  /* ═════════════════════════════════════════
     HEADER · MENÚ MÓVIL · NAV ACTIVA · PROGRESO
     ═════════════════════════════════════════ */
  var burger = $('#burger'), mobileMenu = $('#mobileMenu');
  function openMenu() {
    $('#siteHeader').classList.add('menu-open');
    mobileMenu.classList.add('is-open'); mobileMenu.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Cerrar menú');
    body.classList.add('is-locked'); if (lenis) lenis.stop();
  }
  function closeMenu() {
    if (!mobileMenu || !mobileMenu.classList.contains('is-open')) return;
    $('#siteHeader').classList.remove('menu-open');
    mobileMenu.classList.remove('is-open'); mobileMenu.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Abrir menú');
    body.classList.remove('is-locked'); if (lenis) lenis.start();
  }
  function initHeader() {
    var header = $('#siteHeader'), progress = $('#scrollProgress');
    var ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        var y = window.pageYOffset;
        header.classList.toggle('is-stuck', y > 40);
        var max = document.documentElement.scrollHeight - window.innerHeight;
        if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0) + ')';
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    burger.addEventListener('click', function () { mobileMenu.classList.contains('is-open') ? closeMenu() : openMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1100) closeMenu(); });

    // sección activa
    var links = $$('[data-nav]');
    var map = {};
    links.forEach(function (l) { map[l.getAttribute('href').slice(1)] = l; });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && map[en.target.id]) {
            links.forEach(function (l) { l.classList.remove('is-active'); });
            map[en.target.id].classList.add('is-active');
          } else if (en.isIntersecting) {
            links.forEach(function (l) { l.classList.remove('is-active'); });
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      $$('main > section[id]').forEach(function (s) { io.observe(s); });
    }
  }

  /* ═════════════════════════════════════════
     CURSOR PERSONALIZADO + BOTONES MAGNÉTICOS
     ═════════════════════════════════════════ */
  function initCursor() {
    if (!finePointer || reduce) return;
    var root = document.documentElement, cur = $('#cursor');
    if (!cur) return;
    root.classList.add('has-cursor');
    var dot = $('.cursor__dot', cur), ring = $('.cursor__ring', cur);
    var mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      var t = e.target;
      cur.classList.toggle('is-hover', !!(t.closest && t.closest('a, button, summary, [data-magnetic], .svc__tab')));
      cur.classList.toggle('is-dark', !!(t.closest && t.closest('.tech, .permits, .contact, .footer, .marquee, .mobile-menu')));
    }, { passive: true });
    document.addEventListener('mouseleave', function () { cur.style.opacity = '0'; });
    document.addEventListener('mouseenter', function () { cur.style.opacity = '1'; });
    (function loop() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      requestAnimationFrame(loop);
    })();
  }

  function initMagnetic() {
    if (!finePointer || reduce || !hasGsap) return;
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) * 0.28;
        var y = (e.clientY - (r.top + r.height / 2)) * 0.4;
        gsap.to(el, { x: x, y: y, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
      });
      el.addEventListener('pointerleave', function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
      });
    });
  }

  /* ═════════════════════════════════════════
     UTILIDADES DE TEXTO: contador y "scramble"
     ═════════════════════════════════════════ */
  function runCount(el, delay) {
    var end = parseInt(el.getAttribute('data-count'), 10) || 0;
    var pad = parseInt(el.getAttribute('data-pad'), 10) || 0;
    var fmt = function (n) { return pad ? String(n).padStart(pad, '0') : String(n); };
    if (reduce) { el.textContent = fmt(end); return; }
    el.textContent = fmt(0);
    var t0 = null;
    setTimeout(function () {
      requestAnimationFrame(function step(ts) {
        if (!t0) t0 = ts;
        var k = clamp((ts - t0) / 1600, 0, 1);
        el.textContent = fmt(Math.round((1 - Math.pow(1 - k, 4)) * end));
        if (k < 1) requestAnimationFrame(step);
      });
    }, delay || 0);
  }

  function runScramble(el, delay) {
    var final = el.getAttribute('data-scramble') || el.textContent;
    if (reduce) { el.textContent = final; return; }
    var glyphs = '01#/<>+*%$';
    var t0 = null, dur = 1300;
    setTimeout(function () {
      requestAnimationFrame(function step(ts) {
        if (!t0) t0 = ts;
        var k = clamp((ts - t0) / dur, 0, 1), out = '';
        for (var i = 0; i < final.length; i++) {
          var ch = final[i];
          if (ch === '/' || k > (i + 1) / (final.length + 0.6)) out += ch;
          else out += glyphs[Math.floor(Math.random() * glyphs.length)];
        }
        el.textContent = out;
        if (k < 1) requestAnimationFrame(step); else el.textContent = final;
      });
    }, delay || 0);
  }

  /* ═════════════════════════════════════════
     HERO: preparación, entrada, ciclo de palabras, parallax, canvas
     ═════════════════════════════════════════ */
  function prepHero() {
    if (!hasGsap || reduce) return;
    gsap.set('.line__in', { yPercent: 118 });
    gsap.set('[data-hero="fade"]', { autoAlpha: 0, y: 26 });
    gsap.set('[data-hero="stat"]', { autoAlpha: 0, y: 30 });
    gsap.set('.core', { autoAlpha: 0, scale: 0.88 });
    gsap.set('.hud', { autoAlpha: 0 });
    gsap.set('.hero__stats', { autoAlpha: 0 });
    gsap.set('.nav__in', { autoAlpha: 0, y: -16 });
  }

  function heroIntro() {
    var stats = $$('.stat__v');
    var runStats = function (d) {
      stats.forEach(function (s, i) {
        if (s.hasAttribute('data-count')) runCount(s, d + i * 120);
        else runScramble(s, d + i * 120);
      });
    };
    if (!hasGsap || reduce) { runStats(0); startCycle(); return; }

    var tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.to('.nav__in', { autoAlpha: 1, y: 0, duration: 1, clearProps: 'transform' }, 0)
      .to('.line__in', { yPercent: 0, duration: 1.3, stagger: 0.12, ease: 'expo.out' }, 0.05)
      .to('[data-hero="fade"]', { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.1, clearProps: 'transform' }, 0.45)
      .to('.core', { autoAlpha: 1, scale: 1, duration: 1.8, ease: 'expo.out', clearProps: 'transform' }, 0.2)
      .to('.hud', { autoAlpha: 1, duration: 1, stagger: 0.18, clearProps: 'opacity,visibility' }, 1)
      .to('.hero__stats', { autoAlpha: 1, duration: 0.8 }, 0.9)
      .to('[data-hero="stat"]', { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1, clearProps: 'transform' }, 1)
      .add(function () { runStats(0); startCycle(); }, 1.0);
  }

  var cycleTimer = null;
  function startCycle() {
    var cycle = $('#cycle');
    if (!cycle || cycleTimer) return;
    var words = $$('.cycle__w', cycle);
    if (words.length < 2) return;
    var i = 0;
    var setWidth = function (w) { cycle.style.width = w.offsetWidth + 'px'; };
    var fix = function () { cycle.style.width = ''; setWidth(words[i]); };
    // el ancho transiciona por CSS
    cycle.style.transition = 'width .8s cubic-bezier(.22,1,.36,1)';
    words.forEach(function (w) { w.style.transition = 'opacity .6s cubic-bezier(.22,1,.36,1), transform .9s cubic-bezier(.22,1,.36,1)'; });
    setWidth(words[0]);
    window.addEventListener('resize', function () { cycle.style.transition = 'none'; fix(); requestAnimationFrame(function () { cycle.style.transition = 'width .8s cubic-bezier(.22,1,.36,1)'; }); });
    if (reduce) return;
    cycleTimer = setInterval(function () {
      var cur = words[i];
      i = (i + 1) % words.length;
      var next = words[i];
      cur.classList.remove('is-on'); cur.style.transform = 'translateY(-75%)'; cur.style.opacity = '0';
      next.style.transition = 'none'; next.style.transform = 'translateY(75%)'; next.style.opacity = '0';
      void next.offsetWidth;
      next.style.transition = 'opacity .6s cubic-bezier(.22,1,.36,1), transform .9s cubic-bezier(.22,1,.36,1)';
      next.style.transform = 'translateY(0)'; next.style.opacity = '1';
      next.classList.add('is-on');
      setWidth(next);
    }, 2700);
  }

  function initHeroPointer() {
    var hero = $('#inicio'), core = $('#core');
    if (!hero || !core || !finePointer || reduce) return;
    var huds = $$('.hud', core), rings = $('.core__rings', core), shieldImg = $('#coreShield img');
    var tx = 0, ty = 0, cx = 0, cy = 0, running = false, inView = true;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { inView = en[0].isIntersecting; if (inView) loop(); }).observe(hero);
    function loop() {
      if (!inView) { running = false; return; }
      running = true;
      cx += (tx - cx) * 0.07; cy += (ty - cy) * 0.07;
      huds.forEach(function (h) {
        var d = parseFloat(h.getAttribute('data-depth')) || 16;
        h.style.transform = 'translate3d(' + (-cx * d * 1.6) + 'px,' + (-cy * d * 1.6) + 'px,0)';
      });
      rings.style.transform = 'translate3d(' + (cx * -16) + 'px,' + (cy * -16) + 'px,0)';
      if (shieldImg) shieldImg.style.transform = 'perspective(800px) rotateY(' + (cx * 22) + 'deg) rotateX(' + (-cy * 22) + 'deg)';
      requestAnimationFrame(loop);
    }
    loop();
  }

  function initCanvas() {
    var cv = $('#heroCanvas');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var w = 0, h = 0, dpr = 1, parts = [], packets = [], raf = 0, visible = true, lastPacket = 0;
    var mouse = { x: -9999, y: -9999 };
    var L = 130;

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = cv.getBoundingClientRect(); w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      L = w < 700 ? 96 : 135;
      var n = Math.round(clamp((w * h) / 16500, 24, 95));
      parts = [];
      for (var i = 0; i < n; i++) {
        parts.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.34, vy: (Math.random() - 0.5) * 0.34, r: Math.random() * 1.5 + 1, hub: Math.random() < 0.07, ph: Math.random() * 6.28 });
      }
      packets = [];
    }

    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      var i, j, a, b, dx, dy, d, al;
      for (i = 0; i < parts.length; i++) {
        a = parts[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < -10) a.x = w + 10; else if (a.x > w + 10) a.x = -10;
        if (a.y < -10) a.y = h + 10; else if (a.y > h + 10) a.y = -10;
        dx = a.x - mouse.x; dy = a.y - mouse.y; d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120 && d > 0) { a.x += (dx / d) * 0.6; a.y += (dy / d) * 0.6; }
      }
      ctx.lineWidth = 1;
      for (i = 0; i < parts.length; i++) {
        a = parts[i];
        for (j = i + 1; j < parts.length; j++) {
          b = parts[j]; dx = a.x - b.x; dy = a.y - b.y;
          if (Math.abs(dx) > L || Math.abs(dy) > L) continue;
          d = Math.sqrt(dx * dx + dy * dy);
          if (d < L) {
            al = (1 - d / L) * 0.3;
            ctx.strokeStyle = 'rgba(26,79,176,' + al + ')';
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        dx = a.x - mouse.x; dy = a.y - mouse.y; d = Math.sqrt(dx * dx + dy * dy);
        if (d < 190) {
          ctx.strokeStyle = 'rgba(47,123,255,' + ((1 - d / 190) * 0.55) + ')';
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      for (i = 0; i < parts.length; i++) {
        a = parts[i];
        ctx.fillStyle = a.hub ? 'rgba(47,123,255,.95)' : 'rgba(26,79,176,.6)';
        ctx.beginPath(); ctx.arc(a.x, a.y, a.hub ? a.r + 1.2 : a.r, 0, 6.283); ctx.fill();
        if (a.hub) {
          var pr = 6 + Math.sin(t / 500 + a.ph) * 2.5;
          ctx.strokeStyle = 'rgba(47,123,255,.4)'; ctx.beginPath(); ctx.arc(a.x, a.y, pr, 0, 6.283); ctx.stroke();
        }
      }
      // paquetes de datos viajando por los enlaces
      if (t - lastPacket > 650 && packets.length < 7) {
        lastPacket = t;
        a = parts[Math.floor(Math.random() * parts.length)];
        var cand = parts.filter(function (p) { var ddx = p.x - a.x, ddy = p.y - a.y; var dd = Math.sqrt(ddx * ddx + ddy * ddy); return dd > 20 && dd < L; });
        if (cand.length) packets.push({ a: a, b: cand[Math.floor(Math.random() * cand.length)], k: 0 });
      }
      for (i = packets.length - 1; i >= 0; i--) {
        var pk = packets[i]; pk.k += 0.022;
        if (pk.k >= 1) { packets.splice(i, 1); continue; }
        var px = pk.a.x + (pk.b.x - pk.a.x) * pk.k, py = pk.a.y + (pk.b.y - pk.a.y) * pk.k;
        var g = ctx.createRadialGradient(px, py, 0, px, py, 9);
        g.addColorStop(0, 'rgba(255,145,38,.95)'); g.addColorStop(1, 'rgba(255,145,38,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, 9, 0, 6.283); ctx.fill();
      }
    }

    function loop(t) { if (!visible || document.hidden) { raf = 0; return; } frame(t); raf = requestAnimationFrame(loop); }
    function start() { if (!raf && !reduce) raf = requestAnimationFrame(loop); }

    build();
    if (reduce) { frame(0); window.addEventListener('resize', function () { build(); frame(0); }); return; }
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 180); });
    var hero = $('#inicio');
    hero.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; }, { passive: true });
    hero.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); }).observe(hero);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) start(); });
    start();
  }

  /* ═════════════════════════════════════════
     REVEALS (GSAP + ScrollTrigger)
     ═════════════════════════════════════════ */
  function splitWords(el) {
    var text = el.textContent.trim().replace(/\s+/g, ' ');
    var words = text.split(' ');
    el.textContent = '';
    var inners = [];
    words.forEach(function (word, i) {
      var o = document.createElement('span'); o.className = 'w';
      var n = document.createElement('span'); n.className = 'wi'; n.textContent = word;
      o.appendChild(n); el.appendChild(o); inners.push(n);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return inners;
  }

  function initReveals() {
    if (!hasGsap || reduce) { $$('.step').forEach(function (s) { s.classList.add('is-on'); }); var f = $('#stepsFill'); if (f) f.style.transform = 'scaleY(1)'; return; }

    var st = function (el, start) { return { trigger: el, start: start || 'top 89%', once: true }; };

    $$('[data-split]').forEach(function (el) {
      var inners = splitWords(el);
      gsap.from(inners, { yPercent: 118, duration: 1.2, ease: 'expo.out', stagger: 0.055, scrollTrigger: st(el, 'top 90%') });
    });

    $$('[data-reveal]').forEach(function (el) {
      gsap.from(el, { y: 44, autoAlpha: 0, duration: 1.1, ease: 'power3.out', clearProps: 'all', scrollTrigger: st(el) });
    });

    $$('[data-reveal-group]').forEach(function (g) {
      gsap.from(g.children, { y: 48, autoAlpha: 0, duration: 1, ease: 'power3.out', stagger: 0.09, clearProps: 'all', scrollTrigger: st(g, 'top 86%') });
    });

    $$('[data-clip]').forEach(function (el) {
      gsap.fromTo(el, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.5, ease: 'power4.inOut', clearProps: 'clipPath', scrollTrigger: st(el, 'top 88%') });
      var img = $('img', el);
      if (img) gsap.from(img, { scale: 1.3, duration: 1.9, ease: 'power3.out', scrollTrigger: st(el, 'top 88%') });
    });

    $$('[data-parallax]').forEach(function (img) {
      var s = (parseFloat(img.getAttribute('data-parallax')) || 0.12) * 60;
      gsap.fromTo(img, { yPercent: -s }, { yPercent: s, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // consola: se endereza al entrar en pantalla
    var consoleEl = $('#console');
    if (consoleEl) {
      gsap.fromTo(consoleEl, { rotateX: 16, rotateY: -12, y: 70, scale: 0.94 }, {
        rotateX: 0, rotateY: 0, y: 0, scale: 1, ease: 'none',
        scrollTrigger: { trigger: '#consoleWrap', start: 'top 95%', end: 'top 28%', scrub: 0.8 }
      });
    }

    // proceso: línea que se llena + nodos
    var steps = $('#steps'), fill = $('#stepsFill');
    if (steps && fill) {
      gsap.to(fill, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: steps, start: 'top 62%', end: 'bottom 70%', scrub: 0.6 } });
      $$('.step', steps).forEach(function (step) {
        ScrollTrigger.create({ trigger: step, start: 'top 64%', onEnter: function () { step.classList.add('is-on'); }, onLeaveBack: function () { step.classList.remove('is-on'); } });
      });
    }

    // hero: el contenido se desvanece levemente al salir
    // hero: el contenido se desvanece levemente al salir (solo escritorio, donde el hero cabe en pantalla)
    var heroIn = $('.hero__in');
    if (heroIn) gsap.matchMedia().add('(min-width: 1024px)', function () {
      gsap.to(heroIn, { yPercent: -6, autoAlpha: 0.15, ease: 'none', scrollTrigger: { trigger: '#inicio', start: 'top top', end: 'bottom top', scrub: true } });
    });

    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    setTimeout(function () { ScrollTrigger.refresh(); }, 600);
  }

  /* ═════════════════════════════════════════
     SERVICIOS — explorador con pestañas
     ═════════════════════════════════════════ */
  function initServices() {
    var root = $('#svc');
    if (!root) return;
    var tabs = $$('.svc__tab', root), panels = $$('.svc__panel', root), nav = $('.svc__nav', root);
    var idx = 0, autoOn = false, userStopped = false;
    panels.forEach(function (p) { p.removeAttribute('hidden'); });
    root.style.setProperty('--dur', '8s');

    function activate(i, byUser) {
      idx = (i + tabs.length) % tabs.length;
      tabs.forEach(function (t, k) {
        var on = k === idx;
        t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p, k) { p.classList.toggle('is-active', k === idx); });
      var t = tabs[idx];
      if (nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: t.offsetLeft - (nav.clientWidth - t.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
      if (byUser) { userStopped = true; setAuto(false); }
    }
    function setAuto(on) {
      autoOn = on && !userStopped && !reduce;
      root.setAttribute('data-auto', autoOn ? 'on' : 'off');
    }

    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { activate(k, true); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = idx + 1;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = idx - 1;
        else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); activate(n, true); tabs[idx].focus(); }
      });
    });
    // avance automático guiado por el fin de la animación de la barra
    root.addEventListener('animationend', function (e) {
      if (e.animationName === 'tabProg' && autoOn) activate(idx + 1, false);
    });
    root.addEventListener('pointerenter', function () { root.setAttribute('data-paused', 'true'); });
    root.addEventListener('pointerleave', function () { root.setAttribute('data-paused', 'false'); });
    root.addEventListener('focusin', function () { root.setAttribute('data-paused', 'true'); });
    root.addEventListener('focusout', function () { root.setAttribute('data-paused', 'false'); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { setAuto(en[0].isIntersecting); }, { threshold: 0.35 }).observe(root);
    }

    // "Cotizar este servicio" / botones con data-quote → preselecciona el formulario
    $$('[data-quote]').forEach(function (b) {
      b.addEventListener('click', function () {
        var sel = $('#f-servicio'); if (!sel) return;
        var v = b.getAttribute('data-quote');
        for (var i = 0; i < sel.options.length; i++) if (sel.options[i].text === v) { sel.selectedIndex = i; break; }
      });
    });
  }

  /* ═════════════════════════════════════════
     CONSOLA DE MONITOREO (reloj + bitácora)
     ═════════════════════════════════════════ */
  function initConsole() {
    var clock = $('#consoleClock'), list = $('#feedList'), wrap = $('#consoleWrap');
    if (!clock || !list) return;
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var now = function () { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); };
    var tickClock = function () { clock.textContent = now(); };
    tickClock(); setInterval(tickClock, 1000);

    var msgs = [
      ['CAM 01 · Movimiento detectado', true],
      ['Acceso biométrico autorizado', false],
      ['Rondín K9 · Sector B completo', false],
      ['Unidad 04 · En ruta segura', false],
      ['Perímetro armado · Sin novedad', false],
      ['Cambio de turno registrado', false],
      ['Sensor de puerta · Cerrado', false],
      ['CAM 04 · Vehículo identificado', true],
      ['Videoportero · Visita atendida', false],
      ['GPS · Unidad 02 en zona', false]
    ];
    var n = 0;
    function push() {
      var m = msgs[n++ % msgs.length];
      var li = document.createElement('li');
      if (m[1]) li.className = 'warn';
      li.innerHTML = '<b>' + now() + '</b><span></span>';
      li.lastChild.textContent = m[0];
      list.insertBefore(li, list.firstChild);
      while (list.children.length > 5) list.removeChild(list.lastChild);
    }
    for (var k = 0; k < 4; k++) push();
    if (reduce) return;
    var timer = null;
    function run() { if (!timer) timer = setInterval(push, 2300); }
    function stop() { clearInterval(timer); timer = null; }
    if ('IntersectionObserver' in window && wrap) new IntersectionObserver(function (en) { en[0].isIntersecting ? run() : stop(); }).observe(wrap);
    else run();

    // inclinación suave con el mouse
    var c = $('#console');
    if (finePointer && hasGsap && c) {
      wrap.addEventListener('pointermove', function (e) {
        var r = wrap.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(c, { rotateY: x * 7, rotateX: -y * 7, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
      });
      wrap.addEventListener('pointerleave', function () { gsap.to(c, { rotateY: 0, rotateX: 0, duration: 1, ease: 'power3.out', overwrite: 'auto' }); });
    }
  }

  /* ═════════════════════════════════════════
     BENTO: foco de luz que sigue al cursor
     ═════════════════════════════════════════ */
  function initSpot() {
    if (!finePointer) return;
    $$('.spot').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ═════════════════════════════════════════
     FAQ — acordeón exclusivo y animado
     ═════════════════════════════════════════ */
  function initFaq() {
    var items = $$('.acc__item');
    var dur = reduce ? 0 : 480, ease = 'cubic-bezier(.22,1,.36,1)';
    function openItem(d) {
      var a = $('.acc__a', d);
      d.open = true;
      var h = a.offsetHeight;
      if (a.animate && dur) a.animate({ height: ['0px', h + 'px'] }, { duration: dur, easing: ease });
    }
    function closeItem(d) {
      var a = $('.acc__a', d), h = a.offsetHeight;
      if (a.animate && dur) {
        var an = a.animate({ height: [h + 'px', '0px'] }, { duration: dur, easing: ease });
        an.onfinish = function () { d.open = false; };
      } else d.open = false;
    }
    items.forEach(function (d) {
      $('summary', d).addEventListener('click', function (e) {
        e.preventDefault();
        if (d.open) closeItem(d);
        else { items.forEach(function (o) { if (o !== d && o.open) closeItem(o); }); openItem(d); }
      });
    });
  }

  /* ═════════════════════════════════════════
     LIGHTBOX DE PERMISOS
     ═════════════════════════════════════════ */
  function initLightbox() {
    var box = $('#lightbox');
    if (!box || typeof box.showModal !== 'function') {
      $$('[data-lightbox]').forEach(function (b) { b.addEventListener('click', function () { window.open(b.getAttribute('data-lightbox'), '_blank', 'noopener'); }); });
      return;
    }
    var img = $('#lightboxImg'), cap = $('#lightboxCap');
    $$('[data-lightbox]').forEach(function (b) {
      b.addEventListener('click', function () {
        img.src = b.getAttribute('data-lightbox');
        var alt = $('img', b); img.alt = alt ? alt.alt : '';
        cap.textContent = b.getAttribute('data-caption') || '';
        box.showModal(); if (lenis) lenis.stop();
      });
    });
    var close = function () { if (box.open) box.close(); };
    $('#lightboxClose').addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box || e.target.tagName === 'FIGURE') close(); });
    box.addEventListener('close', function () { if (lenis && !body.classList.contains('is-locked')) lenis.start(); });
  }

  /* ═════════════════════════════════════════
     FORMULARIO → WHATSAPP
     ═════════════════════════════════════════ */
  function initForm() {
    var form = $('#quoteForm'), status = $('#formStatus');
    if (!form) return;
    var rules = {
      nombre:   function (v) { return v.trim().length >= 3 ? '' : 'Escribe tu nombre completo.'; },
      telefono: function (v) { return v.replace(/\D/g, '').length >= 8 ? '' : 'Ingresa un teléfono válido (mínimo 8 dígitos).'; },
      email:    function (v) { return !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Revisa el formato del correo.'; },
      servicio: function (v) { return v ? '' : 'Selecciona el servicio que te interesa.'; },
      mensaje:  function (v) { return v.trim().length >= 10 ? '' : 'Cuéntanos un poco más (mínimo 10 caracteres).'; }
    };
    function check(field) {
      var rule = rules[field.name]; if (!rule) return true;
      var msg = rule(field.value), g = field.closest('.f-group'), err = $('.f-err', g);
      g.classList.toggle('has-error', !!msg);
      field.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg;
      return !msg;
    }
    var fields = $$('input, select, textarea', form);
    fields.forEach(function (f) {
      f.addEventListener('blur', function () { if (f.value || f.required) check(f); });
      f.addEventListener('input', function () { if (f.closest('.f-group').classList.contains('has-error')) check(f); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true, first = null;
      fields.forEach(function (f) { if (!check(f)) { ok = false; if (!first) first = f; } });
      if (!ok) { status.textContent = 'Revisa los campos marcados.'; status.classList.remove('is-ok'); first.focus(); return; }
      var d = {}; fields.forEach(function (f) { d[f.name] = f.value.trim(); });
      var lines = [
        'Hola INSEPRIN, quiero solicitar una cotización.',
        '',
        '*Nombre:* ' + d.nombre,
        d.empresa ? '*Empresa:* ' + d.empresa : null,
        '*Teléfono:* ' + d.telefono,
        d.email ? '*Correo:* ' + d.email : null,
        '*Servicio de interés:* ' + d.servicio,
        '',
        '*¿Qué necesito proteger?*',
        d.mensaje
      ].filter(function (l) { return l !== null; });
      var url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));
      status.textContent = 'Abriendo WhatsApp con tu solicitud…';
      status.classList.add('is-ok');
      var w = window.open(url, '_blank', 'noopener');
      if (!w) window.location.href = url;
    });
  }

  /* ═════════════════════════════════════════
     WHATSAPP FLOTANTE · AÑO
     ═════════════════════════════════════════ */
  function initWhatsApp() {
    var wa = $('#waFloat'); if (!wa) return;
    setTimeout(function () { wa.classList.add('show-tip'); setTimeout(function () { wa.classList.remove('show-tip'); }, 6500); }, 4500);
    wa.addEventListener('mouseenter', function () { wa.classList.add('show-tip'); });
    wa.addEventListener('mouseleave', function () { wa.classList.remove('show-tip'); });
  }

  /* ═════════════════════════════════════════
     ARRANQUE
     ═════════════════════════════════════════ */
  function init() {
    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

    initScrollEngine();
    prepHero();
    initHeader();
    initAnchors();
    initCursor();
    initCanvas();
    initServices();
    initConsole();
    initSpot();
    initFaq();
    initLightbox();
    initForm();
    initWhatsApp();

    runLoader(function () {
      heroIntro();
      initHeroPointer();
      initMagnetic();
      initReveals();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

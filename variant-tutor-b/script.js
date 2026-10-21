/* ============================================================
   Репетитор · тип D — «Bright EdTech»
   Подача: меню, появление, рендер блоков.
   Запись, предметы и слоты — в shared/booking.js.
   ============================================================ */
(function () {
  'use strict';

  var NS = window.NailsStore;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. TOPBAR + STICKY ---------- */
  var topbar = document.getElementById('topbar');
  var sticky = document.getElementById('sticky');
  var booking = document.getElementById('booking');
  var footer = document.querySelector('.footer');

  function onScroll() {
    var y = window.scrollY;
    if (topbar) topbar.classList.toggle('is-scrolled', y > 12);
    if (sticky) {
      var show = y > window.innerHeight * 0.7;
      if (booking && booking.getBoundingClientRect().top < window.innerHeight * 0.8) show = false;
      if (footer && footer.getBoundingClientRect().top < window.innerHeight) show = false;
      sticky.classList.toggle('is-visible', show);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- 2. МЕНЮ ---------- */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');

  function closeMenu() {
    if (!menu) return;
    menu.classList.remove('is-open');
    burger.classList.remove('is-active');
    burger.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  }

  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      burger.classList.toggle('is-active', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.classList.toggle('no-scroll', open);
    });
    menu.querySelectorAll('a').forEach(function (l) { l.addEventListener('click', closeMenu); });
    menu.querySelectorAll('[data-menu-close]').forEach(function (b) { b.addEventListener('click', closeMenu); });
    menu.addEventListener('click', function (e) { if (e.target === menu) closeMenu(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { closeMenu(); burger.focus(); }
    });
  }

  /* ---------- 3. ПЛАВНАЯ ПРОКРУТКА ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var id = this.getAttribute('href');
      if (!id || id === '#') return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.pageYOffset - 96;
      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  /* ---------- 4. ПОЯВЛЕНИЕ ---------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && revealEls.length) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); ro.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { ro.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- 5. РЕНДЕР БЛОКОВ ---------- */
  if (NS) {
    var store = NS.load();

    var subjectsGrid = document.getElementById('subjects-grid');
    if (subjectsGrid) {
      subjectsGrid.innerHTML = store.services.map(function (s) {
        var levels = (s.levels || []).map(function (l) { return '<span class="subject__lv">' + l + '</span>'; }).join('');
        return '<article class="subject">' +
          '<h3 class="subject__name">' + s.name + '</h3>' +
          '<p class="subject__desc">' + (s.desc || '') + '</p>' +
          '<div class="subject__levels">' + levels + '</div>' +
          '<div class="subject__foot"><span class="subject__price">' + NS.money(s.price) + '</span>' +
          '<span class="subject__time">' + (s.dur || 60) + ' мин</span></div>' +
        '</article>';
      }).join('');
    }

    var packsGrid = document.getElementById('packages-grid');
    if (packsGrid) {
      var packs = (store.packages || []).filter(function (p) { return p.lessons > 1; });
      packsGrid.innerHTML = packs.map(function (p) {
        return '<div class="pack"><span class="pack__lessons">' + p.lessons + '</span>' +
          '<span class="pack__label">занятий</span>' +
          '<span class="pack__off">−' + p.discount + '%</span></div>';
      }).join('');
    }
  }

  /* ---------- 6. ПОВТОР ---------- */
  var repeat = document.getElementById('repeat');
  var weeksField = document.getElementById('weeks-field');
  if (repeat && weeksField) {
    repeat.addEventListener('change', function () { weeksField.hidden = !repeat.checked; });
  }

  /* ---------- 7. ЧАСОВОЙ ПОЯС ---------- */
  var tz = document.getElementById('timezone');
  if (tz) {
    try { tz.value = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
  }

  /* ---------- 8. ЗАПИСЬ ---------- */
  if (window.NailsBooking) window.NailsBooking.init();
})();

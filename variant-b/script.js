/* ============================================================
   Ульяна — nail atelier · editorial-luxe
   Скрипт отвечает только за подачу: меню, лента работ, лайтбокс.
   Запись, услуги и слоты — в shared/booking.js (общий модуль).
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. TOPBAR + STICKY ---------- */
  var topbar  = document.getElementById('topbar');
  var sticky  = document.getElementById('sticky');
  var booking = document.getElementById('booking');
  var footer  = document.querySelector('.footer');

  function onScroll() {
    var y = window.scrollY;
    if (topbar) topbar.classList.toggle('is-scrolled', y > 12);

    if (sticky) {
      var show = y > window.innerHeight * 0.75;
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
    burger.setAttribute('aria-label', 'Открыть меню');
    menu.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  }

  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      burger.classList.toggle('is-active', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.classList.toggle('no-scroll', open);
    });

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    menu.addEventListener('click', function (e) {
      if (e.target === menu) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        closeMenu();
        burger.focus();
      }
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
      var offset = (topbar ? topbar.offsetHeight : 0) + 12;
      var top = target.getBoundingClientRect().top + window.pageYOffset - offset;

      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  /* ---------- 4. ПОЯВЛЕНИЕ ПРИ СКРОЛЛЕ ---------- */
  var revealEls = document.querySelectorAll('[data-reveal]');

  if ('IntersectionObserver' in window && revealEls.length) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- 5. ВИДЕО: играем только видимые ---------- */
  var reels = document.querySelectorAll('.reel__video');

  reels.forEach(function (video) {
    video.addEventListener('playing', function () { video.classList.add('is-ready'); });
    video.addEventListener('error', function () { video.classList.remove('is-ready'); });
  });

  if ('IntersectionObserver' in window && reels.length) {
    var videoObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (entry.isIntersecting) {
          var p = video.play();
          if (p && typeof p.catch === 'function') p.catch(function () {});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.35 });

    reels.forEach(function (video) { videoObserver.observe(video); });
  }

  /* ---------- 6. ЛЕНТА РАБОТ + LIGHTBOX ---------- */
  var WORKS = [
    { src: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=600&q=80', caption: 'Нежный нюд и миндаль' },
    { src: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80', caption: 'Классический френч' },
    { src: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=600&q=80', caption: 'Молочный с шиммером' },
    { src: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=600&q=80', caption: 'Тёплый шоколад' },
    { src: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80', caption: 'Пудровый матовый' },
    { src: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=600&q=80', caption: 'Градиент бэби-бумер' },
    { src: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80', caption: 'Розовый кварц' },
    { src: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=600&q=80', caption: 'Минимализм · лунки' }
  ];

  var strip = document.getElementById('works-strip');

  if (strip) {
    WORKS.forEach(function (work, i) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'strip__item';
      item.setAttribute('aria-label', 'Работа ' + (i + 1) + ': ' + work.caption);
      item.innerHTML =
        '<img src="' + work.src + '" alt="' + work.caption + '" loading="lazy" draggable="false">' +
        '<span class="strip__num">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="strip__caption">' + work.caption + '</span>';
      item.addEventListener('click', function () { openLightbox(i); });
      strip.appendChild(item);
    });
  }

  /* ---------- Lightbox ---------- */
  var lightbox    = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightbox-img');
  var lightboxCap = document.getElementById('lightbox-caption');
  var lightboxClose = document.getElementById('lightbox-close');
  var lightboxPrev  = document.getElementById('lightbox-prev');
  var lightboxNext  = document.getElementById('lightbox-next');
  var index = 0;

  function updateLightbox() {
    var work = WORKS[index];
    lightboxImg.src = work.src;
    lightboxImg.alt = work.caption;
    lightboxCap.textContent = work.caption;
  }

  function openLightbox(i) {
    if (!lightbox) return;
    index = i;
    updateLightbox();
    lightbox.hidden = false;
    void lightbox.offsetWidth;
    lightbox.classList.add('is-open');
    document.body.classList.add('no-scroll');
    lightboxClose.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    window.setTimeout(function () { lightbox.hidden = true; }, 320);
  }

  if (lightbox) {
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', function () {
      index = (index - 1 + WORKS.length) % WORKS.length;
      updateLightbox();
    });
    lightboxNext.addEventListener('click', function () {
      index = (index + 1) % WORKS.length;
      updateLightbox();
    });
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') lightboxPrev.click();
      if (e.key === 'ArrowRight') lightboxNext.click();
    });
  }
  /* ---------- 7. ОНЛАЙН-ЗАПИСЬ, УСЛУГИ, СВОБОДНЫЕ ОКНА ----------
     Вся логика — в общем модуле shared/booking.js */
  if (window.NailsBooking) window.NailsBooking.init();
})();

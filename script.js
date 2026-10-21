/* ============================================================
   NAILS by Ульяна — scripts
   Vanilla JS · Mobile First
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------
     1. HEADER — тень при скролле + sticky CTA
     ---------------------------------------------------------- */
  var header = document.getElementById('site-header');
  var stickyCta = document.getElementById('sticky-cta');
  var bookingSection = document.getElementById('booking');
  var footer = document.querySelector('.footer');

  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 12);

    if (stickyCta) {
      var show = y > window.innerHeight * 0.7;
      // Прячем, когда видна форма записи или подвал
      if (bookingSection && bookingSection.getBoundingClientRect().top < window.innerHeight * 0.75) {
        show = false;
      }
      if (footer && footer.getBoundingClientRect().top < window.innerHeight) {
        show = false;
      }
      stickyCta.classList.toggle('is-visible', show);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ----------------------------------------------------------
     2. МОБИЛЬНОЕ МЕНЮ
     ---------------------------------------------------------- */
  var burger = document.getElementById('burger');
  var mobileMenu = document.getElementById('mobile-menu');
  var mobileLinks = mobileMenu ? mobileMenu.querySelectorAll('a') : [];

  function openMenu() {
    mobileMenu.classList.add('is-open');
    burger.classList.add('is-active');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Закрыть меню');
    mobileMenu.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }

  function closeMenu() {
    mobileMenu.classList.remove('is-open');
    burger.classList.remove('is-active');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  }

  if (burger && mobileMenu) {
    burger.addEventListener('click', function () {
      mobileMenu.classList.contains('is-open') ? closeMenu() : openMenu();
    });

    mobileLinks.forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    mobileMenu.addEventListener('click', function (e) {
      if (e.target === mobileMenu) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
        closeMenu();
        burger.focus();
      }
    });
  }

  /* ----------------------------------------------------------
     3. ПЛАВНАЯ ПРОКРУТКА
     ---------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var id = this.getAttribute('href');
      if (!id || id === '#') return;

      var target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      var offset = header.offsetHeight + 12;
      var top = target.getBoundingClientRect().top + window.pageYOffset - offset;

      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  /* ----------------------------------------------------------
     4. ПОЯВЛЕНИЕ ПРИ СКРОЛЛЕ
     ---------------------------------------------------------- */
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

  /* ----------------------------------------------------------
     5. ВИДЕО-КАРУСЕЛЬ: ленивое воспроизведение видимых роликов
        Если mp4 ещё нет — остаётся постер (ошибка игнорируется).
     ---------------------------------------------------------- */
  var reels = document.querySelectorAll('.reel__video');

  reels.forEach(function (video) {
    video.addEventListener('playing', function () {
      video.classList.add('is-ready');
    });
    video.addEventListener('error', function () {
      video.classList.remove('is-ready');
    });
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
  } else {
    // Фолбэк для старых браузеров
    reels.forEach(function (video) {
      var p = video.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    });
  }

  /* ----------------------------------------------------------
     6. ОНЛАЙН-ЗАПИСЬ, УСЛУГИ И СВОБОДНЫЕ ОКНА
        Вся логика вынесена в общий модуль shared/booking.js,
        чтобы её использовал любой тип сайта.
     ---------------------------------------------------------- */
  if (window.NailsBooking) window.NailsBooking.init();

  /* ----------------------------------------------------------
     7. 3D-КАРУСЕЛЬ РАБОТ + LIGHTBOX
     ---------------------------------------------------------- */
  var WORKS = [
    { src: 'assets/img/work-placeholder.svg', caption: 'Нежный нюд' },
    { src: 'assets/img/work-placeholder.svg', caption: 'Классический френч' },
    { src: 'assets/img/work-placeholder.svg', caption: 'Молочный с блёстками' },
    { src: 'assets/img/work-placeholder.svg', caption: 'Тёплый шоколад' },
    { src: 'assets/img/work-placeholder.svg', caption: 'Пудровый матовый' },
    { src: 'assets/img/work-placeholder.svg', caption: 'Дизайн с плёнкой' },
    { src: 'assets/img/work-placeholder.svg', caption: 'Розовый кварц' },
    { src: 'assets/img/work-placeholder.svg', caption: 'Минимализм · лунки' }
  ];

  var carousel   = document.getElementById('carousel');
  var stage      = document.getElementById('carousel-stage');
  var ring       = document.getElementById('carousel-ring');
  var dotsWrap   = document.getElementById('carousel-dots');
  var btnPrev    = document.getElementById('carousel-prev');
  var btnNext    = document.getElementById('carousel-next');
  var tabs       = ['#f6e3d6', '#f1ddd0', '#ecdfe3', '#e9d6c6', '#f3e6dc', '#e3d3c9', '#f0dede', '#eadfd4'];

  var N = WORKS.length;
  var step = 360 / N;
  var current = 0;
  var radius = 320;
  var items = [];
  var dots = [];
  var autoplayTimer = null;
  var dragging = false;
  var startX = 0;
  var startCurrent = 0;
  var moved = 0;

  function wrapOffset(value) {
    var o = ((value % N) + N) % N;
    if (o > N / 2) o -= N;
    return o;
  }

  function buildCarousel() {
    if (!carousel || !ring) return;

    WORKS.forEach(function (work, i) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'carousel__item';
      item.setAttribute('aria-label', 'Работа ' + (i + 1) + ': ' + work.caption);
      item.innerHTML =
        '<img src="' + work.src + '" alt="' + work.caption + '" loading="lazy" draggable="false">' +
        '<span class="carousel__num">' + String(i + 1).padStart(2, '0') + '</span>';
      item.style.background = tabs[i % tabs.length];

      item.addEventListener('click', function () {
        if (moved > 6) return;
        var off = wrapOffset(i - current);
        if (Math.abs(off) < 0.5) {
          openLightbox(i);
        } else {
          current += off;
          render();
        }
      });

      ring.appendChild(item);
      items.push(item);

      if (dotsWrap) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'carousel__dot';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', 'Работа ' + (i + 1));
        dot.addEventListener('click', function () { current = i; render(); });
        dotsWrap.appendChild(dot);
        dots.push(dot);
      }
    });
  }

  function measure() {
    if (!items.length) return;
    var w = items[0].offsetWidth || 240;
    radius = Math.round((w / 2) / Math.tan(Math.PI / N));
    render();
  }

  function render() {
    items.forEach(function (el, i) {
      var off = wrapOffset(i - current);
      var abs = Math.abs(off);
      var active = ((Math.round(current) % N) + N) % N;

      el.style.transform =
        'translate(-50%, -50%) rotateY(' + (off * step) + 'deg) translateZ(' + radius + 'px)';
      el.style.opacity = abs > N / 2 - 0.5 ? 0 : Math.max(0.2, 1 - abs * 0.3);
      el.style.filter = 'blur(' + Math.min(5, abs * 1.5) + 'px)';
      el.style.zIndex = String(100 - Math.round(abs * 10));
      el.classList.toggle('is-active', Math.abs(off) < 0.5);
      el.tabIndex = Math.abs(off) < 0.5 ? 0 : -1;
      el.setAttribute('aria-hidden', Math.abs(off) < 0.5 ? 'false' : 'true');

      if (dots[i]) {
        dots[i].classList.toggle('is-active', i === active);
        dots[i].setAttribute('aria-selected', i === active ? 'true' : 'false');
      }
    });
  }

  function startAutoplay() {
    if (reduceMotion || !carousel) return;
    stopAutoplay();
    autoplayTimer = setInterval(function () {
      current = Math.round(current) + 1;
      render();
    }, 4200);
  }

  function stopAutoplay() {
    if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
  }

  buildCarousel();

  if (carousel && items.length) {
    measure();
    window.addEventListener('resize', measure);
    startAutoplay();

    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);

    if (btnPrev) btnPrev.addEventListener('click', function () { current = Math.round(current) - 1; render(); });
    if (btnNext) btnNext.addEventListener('click', function () { current = Math.round(current) + 1; render(); });

    carousel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { current = Math.round(current) - 1; render(); }
      if (e.key === 'ArrowRight') { current = Math.round(current) + 1; render(); }
    });

    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      moved = 0;
      startX = e.clientX;
      startCurrent = current;
      carousel.classList.add('is-dragging');
      stage.setPointerCapture(e.pointerId);
      stopAutoplay();
    });

    stage.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      current = startCurrent - dx / 110;
      render();
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      carousel.classList.remove('is-dragging');
      current = Math.round(current);
      render();
      if (!reduceMotion) startAutoplay();
    }

    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('pointerleave', endDrag);
  }

  /* ---------- Lightbox ---------- */
  var lightbox     = document.getElementById('lightbox');
  var lightboxImg  = document.getElementById('lightbox-img');
  var lightboxCap  = document.getElementById('lightbox-caption');
  var lightboxClose = document.getElementById('lightbox-close');
  var lightboxPrev = document.getElementById('lightbox-prev');
  var lightboxNext = document.getElementById('lightbox-next');
  var lightboxIndex = 0;

  function updateLightbox() {
    var work = WORKS[lightboxIndex];
    lightboxImg.src = work.src;
    lightboxImg.alt = work.caption;
    lightboxCap.textContent = work.caption;
  }

  function openLightbox(index) {
    if (!lightbox) return;
    lightboxIndex = index;
    updateLightbox();
    lightbox.hidden = false;
    requestAnimationFrame(function () { lightbox.classList.add('is-open'); });
    document.body.classList.add('no-scroll');
    stopAutoplay();
    lightboxClose.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    window.setTimeout(function () { lightbox.hidden = true; }, 320);
    startAutoplay();
  }

  if (lightbox) {
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', function () {
      lightboxIndex = (lightboxIndex - 1 + N) % N;
      updateLightbox();
    });
    lightboxNext.addEventListener('click', function () {
      lightboxIndex = (lightboxIndex + 1) % N;
      updateLightbox();
    });
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft')  lightboxPrev.click();
      if (e.key === 'ArrowRight') lightboxNext.click();
    });
  }

  /* Запись, услуги, цены и свободные окна обслуживает shared/booking.js */

})();

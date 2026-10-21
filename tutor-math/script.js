/* ============================================================
   Tutor Math — Interactive Logic & Dynamic Program Cards
   ============================================================ */
(function () {
  'use strict';

  var NS = window.NailsStore;

  /* ---------- 1. Инициализация бронирования ---------- */
  if (window.NailsBooking) {
    window.NailsBooking.init();
  }

  /* ---------- 2. Рендер программ из store ---------- */
  function renderMathPrograms() {
    var grid = document.getElementById('subjects-grid');
    if (!grid || !NS) return;

    var store = NS.load('tutor-math');
    var services = store.services || [];

    var icons = ['📐', '🎯', '✨', '🏆', '💡'];

    grid.innerHTML = services.map(function (s, idx) {
      var levels = (s.levels || []).map(function (l) {
        return '<span class="level-tag">' + l + '</span>';
      }).join('');

      return '<div class="subject-card">' +
        '<div class="subject-card__head">' +
          '<div class="subject-card__icon">' + (icons[idx % icons.length]) + '</div>' +
          '<h3 class="subject-card__title">' + s.name + '</h3>' +
          '<p class="subject-card__desc">' + (s.desc || '') + '</p>' +
          '<div class="subject-card__levels">' + levels + '</div>' +
        '</div>' +
        '<div class="subject-card__foot">' +
          '<div>' +
            '<span class="subject-card__price">' + NS.money(s.price) + '</span>' +
            '<div class="subject-card__dur">' + (s.dur || 60) + ' мин / занятие</div>' +
          '</div>' +
          '<a href="#booking" class="btn btn--primary btn--sm" data-pick-service="' + s.id + '">Записаться</a>' +
        '</div>' +
      '</div>';
    }).join('');

    // Клик по кнопке «Записаться» в карточке выбирает эту услугу в форме
    grid.querySelectorAll('[data-pick-service]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sId = this.getAttribute('data-pick-service');
        var select = document.getElementById('service');
        if (select) {
          select.value = sId;
          select.dispatchEvent(new Event('change'));
        }
      });
    });
  }

  renderMathPrograms();

  /* ---------- 3. Интерактивный калькулятор баллов ---------- */
  var range = document.getElementById('current-score');
  var scoreVal = document.getElementById('current-score-val');
  var targetSelect = document.getElementById('target-target');
  var resultBox = document.getElementById('calc-result');

  function updateCalc() {
    if (!range || !scoreVal || !resultBox) return;
    var current = parseInt(range.value, 10);
    scoreVal.textContent = current + ' баллов';

    var targetTier = targetSelect ? targetSelect.value : '80';
    var predictedMin = Math.min(96, current + 24);
    var predictedMax = Math.min(100, current + 38);

    var planText = '';
    if (current < 45) {
      planText = 'При старте до 45 баллов ключевая задача — наработать безошибочную 1 часть (64 балла) за 3 месяца и подключить уравнения №13 и неравенства №15 (+16 баллов). Рекомендуется 2 занятия в неделю.';
    } else if (current < 65) {
      planText = 'Хорошая база! Основной упор сделаем на задачи с параметром №17 (дает 4 первичных балла) и геометрию №16. Это гарантированный выход на 82–88 баллов.';
    } else {
      planText = 'Сильный старт! Работаем на 90+ и олимпиады («Физтех», «Ломоносов»). Разбираем авторские варианты сложных стереометрических задач и теорию чисел №18.';
    }

    resultBox.innerHTML = '<strong>🎯 Прогноз подготовки: ' + predictedMin + '–' + predictedMax + ' баллов</strong>' +
      '<p>' + planText + '</p>';
  }

  if (range) range.addEventListener('input', updateCalc);
  if (targetSelect) targetSelect.addEventListener('change', updateCalc);
})();

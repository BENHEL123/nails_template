/* ============================================================
   Tutor Physics — Interactive Programs Renderer
   ============================================================ */
(function () {
  'use strict';

  var NS = window.NailsStore;

  if (window.NailsBooking) {
    window.NailsBooking.init();
  }

  function renderPhysicsPrograms() {
    var grid = document.getElementById('subjects-grid');
    if (!grid || !NS) return;

    var store = NS.load('tutor-physics');
    var services = store.services || [];

    var icons = ['⚡', '🔬', '🧲', '🔭', '🚀'];

    grid.innerHTML = services.map(function (s, idx) {
      var levels = (s.levels || []).map(function (l) {
        return '<span class="level-tag">' + l + '</span>';
      }).join('');

      return '<div class="subject-card">' +
        '<div>' +
          '<div class="subject-card__icon">' + (icons[idx % icons.length]) + '</div>' +
          '<h3 class="subject-card__title">' + s.name + '</h3>' +
          '<p class="subject-card__desc">' + (s.desc || '') + '</p>' +
          '<div class="subject-card__levels">' + levels + '</div>' +
        '</div>' +
        '<div class="subject-card__foot">' +
          '<div>' +
            '<span class="subject-card__price">' + NS.money(s.price) + '</span>' +
            '<div class="subject-card__dur">' + (s.dur || 60) + ' мин / урок</div>' +
          '</div>' +
          '<a href="#booking" class="btn btn--cyan btn--sm" data-pick-service="' + s.id + '">Записаться</a>' +
        '</div>' +
      '</div>';
    }).join('');

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

  renderPhysicsPrograms();
})();

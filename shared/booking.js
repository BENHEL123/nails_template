/* ============================================================
   NAILS & TUTORS — Умный движок онлайн-записи
   (Общий для сайтов мастеров и репетиторов)

   Фишки для максимального удобства (UX):
   1. «Умная память клиента» — при повторном визите имя и телефон
      заполняются автоматически. Клиент не пишет свой номер "по кд",
      а просто тыкает в свободное окно и подтверждает запись за 3 секунды!
   2. Поддержка персональных ссылок от мастера (?client=Имя&phone=...)
   3. Виджет «Мои записи» — клиент видит статус своей записи,
      может отменить её или перенести в 1 клик.
   4. Двойная проверка слотов, защита от коллизий и honeypot от спама.
   ============================================================ */
(function (global) {
  'use strict';

  var NS = global.NailsStore;
  var PROFILE_KEY = 'nails_client_profile';
  var MY_BOOKINGS_KEY = 'nails_my_bookings';

  function byId(id) { return document.getElementById(id); }

  /* ---------- Локальное хранилище данных клиента ---------- */
  function getClientProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || null; } catch (e) { return null; }
  }
  function saveClientProfile(profile) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch (e) {}
  }
  function getMyBookings() {
    try { return JSON.parse(localStorage.getItem(MY_BOOKINGS_KEY)) || []; } catch (e) { return []; }
  }
  function saveMyBookings(list) {
    try { localStorage.setItem(MY_BOOKINGS_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function init() {
    if (!NS) return;

    var store = NS.load();
    var selected = { day: null, time: null };

    var form          = byId('booking-form');
    var slotsDays     = byId('slots-days');
    var slotsGrid     = byId('slots-grid');
    var datetimeInput = byId('datetime');
    var serviceSelect = byId('service');
    var priceList     = byId('price-list');
    var successMsg    = byId('form-success');
    var nameInput     = byId('name');
    var phoneInput    = byId('phone');

    /* ---------- Маска телефона ---------- */
    if (phoneInput) {
      phoneInput.addEventListener('input', function () {
        var d = this.value.replace(/\D/g, '');
        if (d.charAt(0) === '8') d = '7' + d.slice(1);
        if (d.length && d.charAt(0) !== '7') d = '7' + d;
        d = d.slice(0, 11);

        var out = '';
        if (d.length > 0)  out += '+7';
        if (d.length > 1)  out += ' (' + d.slice(1, 4);
        if (d.length >= 5) out += ') ' + d.slice(4, 7);
        if (d.length >= 8) out += '-' + d.slice(7, 9);
        if (d.length >= 10) out += '-' + d.slice(9, 11);
        this.value = out;
      });

      phoneInput.addEventListener('focus', function () {
        if (!this.value) this.value = '+7 (';
      });

      phoneInput.addEventListener('blur', function () {
        if (this.value === '+7 (' || this.value === '+7') this.value = '';
      });
    }

    /* ---------- Автозаполнение из URL параметров или памяти клиента ---------- */
    function checkUrlParamsAndMemory() {
      var params = new URLSearchParams(global.location.search);
      var urlName = params.get('name') || params.get('client');
      var urlPhone = params.get('phone');
      var urlService = params.get('service');

      var profile = getClientProfile();

      var finalName = urlName || (profile ? profile.name : '');
      var finalPhone = urlPhone || (profile ? profile.phone : '');

      if (nameInput && finalName && !nameInput.value) {
        nameInput.value = finalName;
      }
      if (phoneInput && finalPhone && !phoneInput.value) {
        phoneInput.value = finalPhone;
        // триггерим маску если нужно
        phoneInput.dispatchEvent(new Event('input'));
      }

      if (serviceSelect && urlService) {
        serviceSelect.value = urlService;
      }

      // Показываем плашку «С возвращением!»
      if (form && finalName && profile) {
        var existingBar = byId('client-memory-badge');
        if (!existingBar) {
          var bar = document.createElement('div');
          bar.id = 'client-memory-badge';
          bar.className = 'memory-badge';
          bar.innerHTML = '<span>👋 С возвращением, <strong>' + escapeHtml(finalName) + '</strong>! Ваши данные уже заполнены.</span> ' +
            '<button type="button" class="memory-badge__btn" id="memory-reset-btn">Сменить</button>';
          form.insertBefore(bar, form.firstChild);

          var resetBtn = byId('memory-reset-btn');
          if (resetBtn) {
            resetBtn.addEventListener('click', function () {
              if (nameInput) nameInput.value = '';
              if (phoneInput) phoneInput.value = '';
              bar.remove();
              localStorage.removeItem(PROFILE_KEY);
            });
          }
        }
      }
    }

    function escapeHtml(str) {
      return String(str).replace(/[&<>"']/g, function (m) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
      });
    }

    /* ---------- Услуги и прайс ---------- */
    function renderServices() {
      if (!serviceSelect) return;
      var cur = serviceSelect.value;
      var html = '<option value="" disabled ' + (!cur ? 'selected' : '') + '>— Выберите направление / услугу —</option>';
      store.services.forEach(function (s) {
        var isSel = (s.id === cur);
        html += '<option value="' + s.id + '"' + (isSel ? ' selected' : '') + '>' + s.name + ' — ' + NS.money(s.price) + ' (' + (s.dur || 60) + ' мин)</option>';
      });
      serviceSelect.innerHTML = html;
    }

    function renderPrices() {
      if (!priceList) return;
      priceList.innerHTML = store.services.map(function (s) {
        var levels = (s.levels || []).map(function (l) { return '<span class="price-pill">' + l + '</span>'; }).join('');
        return '<li class="price-row">' +
          '<div class="price-row__info">' +
            '<h3 class="price-row__name">' + s.name + '</h3>' +
            (s.desc ? '<p class="price-row__desc">' + s.desc + '</p>' : '') +
            (levels ? '<div class="price-row__pills">' + levels + '</div>' : '') +
          '</div>' +
          '<div class="price-row__right">' +
            '<span class="price-row__value">' + NS.money(s.price) + '</span>' +
            '<span class="price-row__dur">' + (s.dur || 60) + ' мин</span>' +
          '</div>' +
        '</li>';
      }).join('');
    }

    /* ---------- Свободные окна ---------- */
    function renderDays() {
      if (!slotsDays) return;
      var html = '';
      for (var i = 0; i < 7; i++) {
        var free = NS.freeSlots(store, i).length;
        var d = NS.dateByOffset(i);
        html += '<button type="button" class="slot-day' +
          (i === selected.day ? ' is-active' : '') +
          (free === 0 ? ' is-empty' : '') +
          '" data-slot-day="' + i + '">' +
          '<span class="slot-day__wd">' + (i === 0 ? 'сегодня' : NS.WD_SHORT[d.getDay()]) + '</span>' +
          '<span class="slot-day__num">' + d.getDate() + '</span>' +
          '<span class="slot-day__free">' + (free ? free + ' окон' : 'занято') + '</span>' +
        '</button>';
      }
      slotsDays.innerHTML = html;
    }

    function renderSlots() {
      if (!slotsGrid) return;
      if (selected.day === null) {
        slotsGrid.innerHTML = '<p class="slots-grid__empty">Выберите день в календаре выше</p>';
        return;
      }

      var slots = NS.freeSlots(store, selected.day);
      if (!slots.length) {
        slotsGrid.innerHTML = '<p class="slots-grid__empty">На этот день все окна заняты. Выберите другой день ⤴</p>';
        return;
      }

      var html = '';
      slots.forEach(function (t) {
        html += '<button type="button" class="slot-btn' +
          (t === selected.time ? ' is-active' : '') +
          '" data-slot-time="' + t + '">' + t + '</button>';
      });
      slotsGrid.innerHTML = html;
    }

    function autoPickFirstDay() {
      if (selected.day !== null) return;
      for (var i = 0; i < 7; i++) {
        if (NS.freeSlots(store, i).length > 0) {
          selected.day = i;
          break;
        }
      }
      if (selected.day === null) selected.day = 0;
    }

    function refresh() {
      store = NS.load();
      renderServices();
      renderPrices();
      renderDays();
      renderSlots();
      renderMyBookingsWidget();
    }

    autoPickFirstDay();
    refresh();
    checkUrlParamsAndMemory();

    /* ---------- Клик по дням и слотам ---------- */
    if (slotsDays) {
      slotsDays.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-slot-day]');
        if (!btn) return;
        var day = parseInt(btn.getAttribute('data-slot-day'), 10);
        if (NS.freeSlots(store, day).length === 0) return;

        selected.day = day;
        selected.time = null;
        if (datetimeInput) datetimeInput.value = '';
        renderDays();
        renderSlots();
      });
    }

    if (slotsGrid) {
      slotsGrid.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-slot-time]');
        if (!btn) return;
        var time = btn.getAttribute('data-slot-time');
        selected.time = time;

        if (datetimeInput) {
          datetimeInput.value = NS.dateTimeValue(selected.day, time);
          datetimeInput.dispatchEvent(new Event('change'));
        }

        renderSlots();
      });
    }

    /* ---------- Виджет «Мои записи» на сайте ---------- */
    function renderMyBookingsWidget() {
      var myIds = getMyBookings();
      if (!myIds.length) {
        var old = byId('my-bookings-pill');
        if (old) old.remove();
        return;
      }

      // Находим актуальные записи в store
      var activeBookings = store.bookings.filter(function (b) {
        return myIds.indexOf(b.id) !== -1 && b.status !== 'cancelled';
      });

      if (!activeBookings.length) {
        var old2 = byId('my-bookings-pill');
        if (old2) old2.remove();
        return;
      }

      var pill = byId('my-bookings-pill');
      if (!pill) {
        pill = document.createElement('aside');
        pill.id = 'my-bookings-pill';
        pill.className = 'my-bookings-pill';
        document.body.appendChild(pill);
      }

      var latest = activeBookings[0];
      var statusText = latest.status === 'ok' ? 'Подтверждено мастером ✅' : 'Ожидает подтверждения ⏳';

      pill.innerHTML =
        '<div class="my-bookings-pill__inner">' +
          '<div class="my-bookings-pill__info">' +
            '<strong>Моя запись:</strong> ' + latest.service + ' · ' + NS.formatDay(latest.day) + ' в ' + latest.time +
            '<span class="my-bookings-pill__status">' + statusText + '</span>' +
          '</div>' +
          '<div class="my-bookings-pill__actions">' +
            '<button type="button" class="btn-pill-cancel" data-cancel-id="' + latest.id + '">Отменить</button>' +
          '</div>' +
        '</div>';

      var cancelBtn = pill.querySelector('[data-cancel-id]');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
          if (confirm('Вы уверены, что хотите отменить эту запись? Окно станет доступно другим клиентам.')) {
            NS.cancelBooking(store, latest.id);
            var updated = myIds.filter(function (x) { return x !== latest.id; });
            saveMyBookings(updated);
            refresh();
            global.alert('Запись отменена.');
          }
        });
      }
    }

    /* ---------- Валидация и отправка ---------- */
    if (!form) return;

    var submitBtn = form.querySelector('.form__submit');
    var fields = {
      name:     { el: byId('name'),     msg: 'Пожалуйста, укажите имя' },
      phone:    { el: byId('phone'),    msg: 'Введите корректный номер телефона' },
      service:  { el: byId('service'),  msg: 'Выберите направление / услугу' },
      datetime: { el: byId('datetime'), msg: 'Выберите свободное время в календаре выше' },
      privacy:  { el: byId('privacy'),  msg: 'Нужно согласие на обработку данных' }
    };

    function errorNode(field) {
      return document.querySelector('[data-error-for="' + field.el.id + '"]');
    }

    function setError(field, message) {
      if (!field.el) return;
      field.el.classList.add('is-invalid');
      field.el.setAttribute('aria-invalid', 'true');
      var node = errorNode(field);
      if (node) node.textContent = message;
    }

    function clearError(field) {
      if (!field.el) return;
      field.el.classList.remove('is-invalid');
      field.el.removeAttribute('aria-invalid');
      var node = errorNode(field);
      if (node) node.textContent = '';
    }

    function validateField(key) {
      var field = fields[key];
      if (!field || !field.el) return true;
      var el = field.el;
      var ok = true;

      switch (key) {
        case 'name':     ok = el.value.trim().length >= 2; break;
        case 'phone':    ok = el.value.replace(/\D/g, '').length === 11; break;
        case 'service':  ok = el.value !== ''; break;
        case 'datetime': ok = el.value !== '' && new Date(el.value).getTime() > Date.now(); break;
        case 'privacy':  ok = el.checked; break;
      }

      ok ? clearError(field) : setError(field, field.msg);
      return ok;
    }

    Object.keys(fields).forEach(function (key) {
      var field = fields[key];
      if (!field.el) return;
      var evt = (field.el.type === 'checkbox' || field.el.tagName === 'SELECT') ? 'change' : 'blur';
      field.el.addEventListener(evt, function () { validateField(key); });
      field.el.addEventListener('input', function () {
        if (field.el.classList.contains('is-invalid')) validateField(key);
      });
    });

    function collectData() {
      var svc = fields.service.el;
      var repeatEl = byId('repeat');
      var trialEl = byId('trial');
      var weeksEl = byId('weeks');

      return {
        name: fields.name.el ? fields.name.el.value.trim() : '',
        phone: fields.phone.el ? fields.phone.el.value.trim() : '',
        service: svc ? svc.value : '',
        serviceId: svc ? svc.value : '',
        serviceText: svc && svc.options[svc.selectedIndex] ? svc.options[svc.selectedIndex].text : '',
        datetime: fields.datetime.el ? fields.datetime.el.value : '',
        day: selected.day,
        time: selected.time,
        comment: (byId('comment') || {}).value || '',
        privacy: fields.privacy.el ? fields.privacy.el.checked : true,
        format: (byId('format') || {}).value || null,
        repeat: (repeatEl && repeatEl.checked) ? 'weekly' : 'none',
        weeks: (weeksEl && weeksEl.value) ? (+weeksEl.value || 4) : 4,
        trial: !!(trialEl && trialEl.checked),
        timezone: (byId('timezone') || {}).value || null,
        page: global.location.pathname,
        sentAt: new Date().toISOString()
      };
    }

    function setLoading(loading) {
      if (!submitBtn) return;
      submitBtn.classList.toggle('is-loading', loading);
      submitBtn.disabled = loading;
      submitBtn.textContent = loading ? 'Бронируем…' : 'Подтвердить запись';
    }

    function showSuccess(payload) {
      if (!successMsg) return;
      successMsg.hidden = false;
      var note = byId('success-note');
      if (note && payload) {
        note.textContent = payload.name + ', мы забронировали для вас время: ' +
          NS.formatDay(payload.day) + ' в ' + payload.time + ' (' + payload.serviceText + ').';
      }
      successMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var trap = byId('_gotcha');
      if (trap && trap.value) return;

      var valid = true;
      Object.keys(fields).forEach(function (key) {
        if (!validateField(key)) valid = false;
      });

      if (!valid) {
        var firstBad = form.querySelector('.is-invalid');
        if (firstBad) firstBad.focus();
        return;
      }

      var payload = collectData();
      setLoading(true);

      // Сохраняем имя и номер в локальную память клиента
      saveClientProfile({
        name: payload.name,
        phone: payload.phone,
        savedAt: Date.now()
      });

      store = NS.load();
      var added = NS.addBookingFromClient(store, payload);

      if (added && added.error === 'taken') {
        setError(fields.datetime, 'Это окно только что заняли. Выберите другое в списке ⤴');
        setLoading(false);
        selected.time = null;
        if (datetimeInput) datetimeInput.value = '';
        refresh();
        return;
      }

      // Сохраняем ID записи в "Мои записи"
      if (added && added.id) {
        var myIds = getMyBookings();
        myIds.unshift(added.id);
        saveMyBookings(myIds);
      }

      global.setTimeout(function () {
        setLoading(false);
        selected.time = null;
        if (datetimeInput) datetimeInput.value = '';
        refresh();
        showSuccess(payload);
      }, 500);
    });

    // Реактивное обновление при изменениях в админке в соседней вкладке
    global.addEventListener('storage', function (e) {
      if (e.key === NS.keyFor()) refresh();
    });
  }

  global.NailsBooking = { init: init };
})(window);

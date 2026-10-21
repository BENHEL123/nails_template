/* ============================================================
   Панель мастера — рабочая логика
   Слоты считаются из графика · данные сохраняются локально
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Общий модуль данных (общий с сайтом) ---------- */
  var NS = window.NailsStore;

  var money      = NS.money;
  var pad        = NS.pad;
  var timeToMin  = NS.timeToMin;
  var minToTime  = NS.minToTime;
  var clone      = NS.clone;
  var MONTHS     = NS.MONTHS;
  var WD_SHORT   = NS.WD_SHORT;
  var WD_FULL    = NS.WD_FULL;
  var dateByOffset  = NS.dateByOffset;
  var workdayIndex  = NS.workdayIndex;

  var els = {
    week:        document.getElementById('week-strip'),
    pendingBlock:document.getElementById('pending-block'),
    pendingList: document.getElementById('pending-list'),
    pendingCount:document.getElementById('pending-count'),
    schedule:    document.getElementById('schedule-list'),
    dayTitle:    document.getElementById('day-title'),
    daySummary:  document.getElementById('day-summary'),
    todayLabel:  document.getElementById('today-label'),
    clients:     document.getElementById('clients-list'),
    clientSearch:document.getElementById('client-search'),
    moneyToday:  document.getElementById('money-today'),
    moneyWeek:   document.getElementById('money-week'),
    moneyMonth:  document.getElementById('money-month'),
    moneyList:   document.getElementById('money-list'),
    sheet:       document.getElementById('sheet'),
    sheetContent:document.getElementById('sheet-content'),
    toast:       document.getElementById('toast'),
    bell:        document.getElementById('bell'),
    bellBadge:   document.getElementById('bell-badge'),
    notif:       document.getElementById('notif'),
    notifList:   document.getElementById('notif-list'),
    editor:      document.getElementById('schedule-editor'),
    schedBody:   document.getElementById('sched-body')
  };

  /* ---------- Состояние (общее с сайтом) ---------- */
  var state = NS.load();

  function save() { NS.save(state); }

  /* ---------- График и слоты (логика в shared/store.js) ---------- */
  function dayConfig(offset)   { return NS.dayConfig(state, offset); }
  function windowsFor(offset)  { return NS.windowsFor(state, offset); }
  function slotsFor(offset)    { return NS.slotsFor(state, offset); }
  function bookedTimes(offset) { return NS.bookedTimes(state, offset); }
  function freeSlots(offset)   { return NS.freeSlots(state, offset); }

  /* ---------- Уведомления ---------- */
  function unread() { return state.notifications.filter(function (n) { return !n.read; }).length; }

  function relTime(ts) {
    var m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return 'только что';
    if (m < 60) return m + ' мин назад';
    var h = Math.round(m / 60);
    if (h < 24) return h + ' ч назад';
    return Math.round(h / 24) + ' дн назад';
  }

  function notifIcon(type) {
    if (type === 'new') return '💅';
    if (type === 'cancel') return '🚫';
    if (type === 'cash') return '💰';
    return '🔔';
  }

  function renderNotif() {
    var n = unread();
    els.bellBadge.hidden = n === 0;
    els.bellBadge.textContent = n > 9 ? '9+' : n;

    els.notifList.innerHTML = state.notifications.map(function (x) {
      return '<button class="notif__item' + (x.read ? '' : ' is-unread') + '" type="button" data-notif="' + x.id + '">' +
        '<span class="notif__icon">' + notifIcon(x.type) + '</span>' +
        '<span class="notif__body">' +
          '<strong>' + x.title + '</strong>' +
          '<span>' + x.text + '</span>' +
          '<small>' + relTime(x.at) + '</small>' +
        '</span>' +
        (x.read ? '' : '<span class="notif__dot"></span>') +
      '</button>';
    }).join('') || '<p class="notif__empty">Пока пусто</p>';
  }

  function pushNotif(type, title, text, bookingId) {
    state.notifications.unshift({ id: Date.now(), type: type, title: title, text: text, at: Date.now(), read: false, bookingId: bookingId || null });
    save();
    renderNotif();
  }

  function openNotif(open) {
    els.notif.classList.toggle('is-open', open);
    els.bell.setAttribute('aria-expanded', open ? 'true' : 'false');
    els.notif.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  /* ---------- Форматирование даты ---------- */
  function formatDay(offset) {
    var d = dateByOffset(offset);
    var label = d.getDate() + ' ' + MONTHS[d.getMonth()];
    return offset === 0 ? 'Сегодня, ' + label : WD_SHORT[d.getDay()] + ', ' + label;
  }

  function shortDate(offset) {
    var d = dateByOffset(offset);
    return d.getDate() + ' ' + MONTHS[d.getMonth()];
  }

  function toast(text) {
    els.toast.textContent = text;
    els.toast.classList.add('is-show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { els.toast.classList.remove('is-show'); }, 2600);
  }

  /* ---------- Рендер: неделя ---------- */
  function renderWeek() {
    var html = '';
    for (var i = 0; i < 7; i++) {
      var d = dateByOffset(i);
      var has = state.bookings.some(function (b) { return b.day === i; });
      var off = !dayConfig(i).active;
      html += '<button class="week__day' +
        (i === state.day ? ' is-active' : '') +
        (i === 0 ? ' is-today' : '') +
        (has ? ' has-bookings' : '') +
        (off ? ' is-off' : '') +
        '" type="button" data-day="' + i + '">' +
        '<span class="week__day-wd">' + WD_SHORT[d.getDay()] + '</span>' +
        '<span class="week__day-num">' + d.getDate() + '</span>' +
        '<span class="week__dot"></span>' +
      '</button>';
    }
    els.week.innerHTML = html;
  }

  /* ---------- Рендер: карточка записи ---------- */
  function statusChip(s) {
    if (s === 'ok')   return '<span class="booking__status booking__status--ok">✓ Подтверждена</span>';
    if (s === 'done') return '<span class="booking__status booking__status--done">Выполнена</span>';
    return '<span class="booking__status booking__status--wait">Ждёт ответа</span>';
  }

  function bookingCard(b) {
    var cls = b.status === 'ok' ? 'booking--ok' : b.status === 'done' ? 'booking--done' : 'booking--new';
    var actions = '';
    if (b.status === 'new') {
      actions = '<div class="booking__actions">' +
        '<button class="btn-act btn-act--ok" type="button" data-confirm="' + b.id + '">Подтвердить</button>' +
        '<button class="btn-act btn-act--soft" type="button" data-move="' + b.id + '">Другое время</button>' +
      '</div>';
    } else if (b.status === 'ok') {
      actions = '<div class="booking__actions">' +
        '<button class="btn-act btn-act--line btn-act--icon" type="button" data-call="' + b.id + '">Позвонить</button>' +
        '<button class="btn-act btn-act--line btn-act--icon" type="button" data-write="' + b.id + '">Написать</button>' +
        '<button class="btn-act btn-act--ok" type="button" data-done="' + b.id + '">Выполнено</button>' +
      '</div>';
    }
    return '<article class="booking ' + cls + '" data-open="' + b.id + '">' +
      '<div class="booking__time">' + b.time + '<span class="booking__dur">' + b.dur + ' мин</span></div>' +
      '<div class="booking__body">' +
        '<p class="booking__name">' + b.name + '</p>' +
        '<p class="booking__service">' + b.service + ' · ' + money(b.price) + '</p>' +
        statusChip(b.status) +
      '</div>' + actions + '</article>';
  }

  function renderPending() {
    var list = state.bookings.filter(function (b) { return b.status === 'new' && b.day === state.day; });
    els.pendingBlock.classList.toggle('is-empty', list.length === 0);
    els.pendingCount.textContent = list.length;
    els.pendingList.innerHTML = list.map(bookingCard).join('');
  }

  function renderSchedule() {
    var booked = state.bookings.filter(function (b) { return b.day === state.day && b.status !== 'new'; });
    var items = booked.map(function (b) { return { t: b.time, b: b }; });

    freeSlots(state.day).forEach(function (t) { items.push({ t: t, f: true }); });
    items.sort(function (a, b) { return a.t.localeCompare(b.t); });

    els.schedule.innerHTML = items.map(function (it) {
      if (it.f) {
        return '<button class="freeslot" type="button" data-slot="' + it.t + '">' +
          '<span class="freeslot__plus">+</span>' + it.t + ' свободно</button>';
      }
      return bookingCard(it.b);
    }).join('') || '<p class="sheet__sub">На этот день записей нет</p>';

    var cfg = dayConfig(state.day);
    var income = booked.filter(function (b) { return b.status === 'ok' || b.status === 'done'; })
                       .reduce(function (a, b) { return a + b.price; }, 0);
    var waiting = state.bookings.filter(function (b) { return b.status === 'new' && b.day === state.day; }).length;

    els.dayTitle.textContent = formatDay(state.day) + (cfg.active ? '' : ' · выходной');
    var closeBtn = document.getElementById('close-day');
    if (closeBtn) closeBtn.textContent = cfg.active ? 'Закрыть день' : 'Открыть день';
    els.daySummary.innerHTML =
      '<span>записей: <strong>' + booked.length + '</strong></span>' +
      '<span>ждут: <strong>' + waiting + '</strong></span>' +
      '<span>доход: <strong>' + money(income) + '</strong></span>';
  }

  /* ---------- Рендер: клиенты ---------- */
  function renderClients(filter) {
    filter = (filter || '').toLowerCase();
    var list = state.clients.filter(function (c) {
      return !filter || c.name.toLowerCase().indexOf(filter) !== -1 || c.phone.indexOf(filter) !== -1;
    });
    els.clients.innerHTML = list.map(function (c) {
      return '<button class="client" type="button" data-client="' + c.id + '">' +
        '<span class="client__ava">' + c.name.charAt(0) + '</span>' +
        '<span class="client__body">' +
          '<span class="client__name">' + c.name + '</span>' +
          '<span class="client__meta">Была: ' + c.last + ' · ' + c.visits + ' визитов</span>' +
        '</span>' +
        '<span class="client__sum">' + money(c.total) + '</span>' +
      '</button>';
    }).join('') || '<p class="sheet__sub">Никого не нашли</p>';
  }

  /* ---------- Рендер: касса ---------- */
  function renderMoney() {
    var done = state.bookings.filter(function (b) { return b.status === 'done' && b.day === state.day; });
    var today = done.reduce(function (a, b) { return a + b.price; }, 0);
    els.moneyToday.textContent = money(today);
    els.moneyWeek.textContent = money(14900 + today);
    els.moneyMonth.textContent = money(62400 + today);

    var rows = done.map(function (b) { return { name: b.name, service: b.service, date: 'сегодня', sum: b.price }; })
                   .concat(state.history);
    els.moneyList.innerHTML = rows.map(function (r) {
      return '<div class="money-item">' +
        '<span><strong>' + r.name + '</strong><br><span class="money-item__date">' + r.service + ' · ' + r.date + '</span></span>' +
        '<span class="money-item__sum">' + money(r.sum) + '</span></div>';
    }).join('');
  }

  /* ---------- Главный рендер ---------- */
  function render() {
    renderWeek();
    renderPending();
    renderSchedule();
    renderClients(els.clientSearch.value);
    renderMoney();
    renderNotif();
    els.todayLabel.textContent = formatDay(state.day);
  }

  /* ============================================================
     РЕДАКТОР ГРАФИКА
     ============================================================ */
  var draft = null;
  var draftDay = 0;

  function openEditor() {
    draft = clone(state);
    draftDay = workdayIndex(state.day);
    els.editor.hidden = false;
    void els.editor.offsetWidth;
    els.editor.classList.add('is-open');
    els.editor.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    renderEditor();
  }

  function closeEditor(commit) {
    if (commit && draft) {
      state.step = draft.step;
      state.mode = draft.mode;
      state.days = draft.days;
      save();
      render();
      toast('График сохранён');
    }
    els.editor.classList.remove('is-open');
    els.editor.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    setTimeout(function () { els.editor.hidden = true; }, 300);
  }

  function dayChip(i) {
    var d = draft.days[i];
    return '<button class="ed-day' + (i === draftDay ? ' is-active' : '') + (d.active ? '' : ' is-off') + '" type="button" data-eday="' + i + '">' +
      WD_SHORT[(i + 1) % 7] + '</button>';
  }

  function stepChips() {
    return [15, 30, 45, 60].map(function (s) {
      return '<button class="ed-chip' + (draft.step === s ? ' is-active' : '') + '" type="button" data-estep="' + s + '">' + s + ' мин</button>';
    }).join('');
  }

  function renderEditor() {
    var d = draft.days[draftDay];
    var daysHtml = '';
    for (var i = 0; i < 7; i++) daysHtml += dayChip(i);

    var auto = '<div class="ed-card' + (draft.mode === 'auto' ? '' : ' is-hidden') + '">' +
        '<div class="ed-row"><label>Работаю с</label><input type="time" data-ed="from" value="' + d.from + '"></div>' +
        '<div class="ed-row"><label>до</label><input type="time" data-ed="to" value="' + d.to + '"></div>' +
        '<div class="ed-row"><label>Обед с</label><input type="time" data-ed="bFrom" value="' + d.bFrom + '"></div>' +
        '<div class="ed-row"><label>до</label><input type="time" data-ed="bTo" value="' + d.bTo + '"></div>' +
      '</div>';

    var windows = (d.windows || []).map(function (w, idx) {
      return '<div class="ed-window">' +
        '<input type="time" data-ewin="' + idx + '" data-wfield="from" value="' + w.from + '">' +
        '<span class="ed-window__dash">—</span>' +
        '<input type="time" data-ewin="' + idx + '" data-wfield="to" value="' + w.to + '">' +
        '<button class="ed-window__del" type="button" data-ewdel="' + idx + '" aria-label="Удалить окно">×</button>' +
      '</div>';
    }).join('');

    var manual = '<div class="ed-card' + (draft.mode === 'manual' ? '' : ' is-hidden') + '">' +
        (windows || '<p class="ed-empty">Нет окон — добавьте своё</p>') +
        '<button class="ed-add" type="button" data-ewadd>+ Добавить окно</button>' +
      '</div>';

    els.schedBody.innerHTML =
      '<div class="ed-days">' + daysHtml + '</div>' +

      '<div class="ed-toggle">' +
        '<span>Рабочий день</span>' +
        '<span class="switch' + (d.active ? ' is-on' : '') + '" data-edactive></span>' +
      '</div>' +

      '<div class="seg">' +
        '<button class="seg__btn' + (draft.mode === 'auto' ? ' is-active' : '') + '" type="button" data-emode="auto">Автоматически</button>' +
        '<button class="seg__btn' + (draft.mode === 'manual' ? ' is-active' : '') + '" type="button" data-emode="manual">Вручную</button>' +
      '</div>' +

      auto + manual +

      '<div class="ed-block"><p class="ed-block__title">Шаг записи</p><div class="ed-chips">' + stepChips() + '</div></div>' +

      '<button class="ed-apply" type="button" data-eapply>Применить этот день ко всем рабочим</button>' +

      '<div class="ed-block"><p class="ed-block__title">Как увидят клиентки</p>' +
        '<div class="ed-preview" id="ed-preview">' + previewHtml() + '</div></div>';
  }

  function previewHtml() {
    var slots = (function () {
      var d = draft.days[draftDay];
      if (!d.active) return [];
      var step = draft.step, out = [];
      var wins = draft.mode === 'manual' ? (d.windows || []) : (function () {
        var arr = [];
        if (d.bFrom && timeToMin(d.bFrom) > timeToMin(d.from)) arr.push({ from: d.from, to: d.bFrom });
        var sf = timeToMin(d.bTo) > timeToMin(d.from) ? d.bTo : d.from;
        if (timeToMin(d.to) > timeToMin(sf)) arr.push({ from: sf, to: d.to });
        return arr.length ? arr : [{ from: d.from, to: d.to }];
      })();
      wins.forEach(function (w) {
        for (var m = timeToMin(w.from); m + step <= timeToMin(w.to); m += step) out.push(minToTime(m));
      });
      return out.filter(function (t, i, a) { return a.indexOf(t) === i; });
    })();

    if (!slots.length) return '<p class="ed-empty">Выходной — записей не будет</p>';
    return '<div class="ed-slots">' + slots.map(function (t) { return '<span class="ed-slot">' + t + '</span>'; }).join('') + '</div>' +
      '<p class="ed-hint">' + slots.length + ' окон · шаг ' + draft.step + ' мин</p>';
  }

  function refreshPreview() {
    var p = document.getElementById('ed-preview');
    if (p) p.innerHTML = previewHtml();
  }

  /* ============================================================
     ОБРАБОТКА ВИЗИТОВ И КЛИЕНТОВ
     ============================================================ */
  function normalizePhone(p) { return String(p || '').replace(/\D/g, ''); }

  function findClient(name, phone) {
    var ph = normalizePhone(phone);
    if (ph.length > 6) {
      var byPhone = state.clients.find(function (c) { return normalizePhone(c.phone) === ph; });
      if (byPhone) return byPhone;
    }
    return state.clients.find(function (c) {
      return c.name.toLowerCase() === String(name || '').toLowerCase();
    }) || null;
  }

  function ensureClient(name, phone) {
    var c = findClient(name, phone);
    if (!c) {
      c = { id: Date.now(), name: name, phone: phone || '—', last: 'сегодня', visits: 0, total: 0, note: '' };
      state.clients.unshift(c);
    }
    return c;
  }

  function clientVisits(name) {
    var nm = String(name).toLowerCase();
    var past = state.bookings
      .filter(function (b) { return b.name.toLowerCase() === nm; })
      .map(function (b) { return { service: b.service, sum: b.price, when: b.day === 0 ? 'сегодня' : shortDate(b.day), status: b.status }; });
    var old = state.history
      .filter(function (h) { return h.name.toLowerCase() === nm; })
      .map(function (h) { return { service: h.service, sum: h.sum, when: h.date, status: 'done' }; });
    return past.concat(old);
  }

  function completeBooking(id) {
    var b = findBooking(id);
    if (!b || b.status === 'done') return;

    b.status = 'done';

    var c = ensureClient(b.name, b.phone);
    c.visits += 1;
    c.total += b.price;

    var when = b.day === 0 ? 'сегодня' : shortDate(b.day);
    c.last = when;

    state.history.unshift({ name: b.name, service: b.service, date: when, sum: b.price });
    pushNotif('cash', 'Визит закрыт', b.name + ' · ' + money(b.price) + ' в кассе', b.id);

    save();
    render();
    toast('Записано в кассу: ' + money(b.price));
  }

  function cancelBooking(id) {
    var b = findBooking(id);
    if (!b) return;
    state.bookings = state.bookings.filter(function (x) { return x.id !== id; });
    pushNotif('cancel', 'Визит отменён', b.name + ' · ' + b.service + ' · ' + b.time);
    save();
    render();
    toast('Визит отменён, время снова свободно');
  }

  function moveBooking(id, time) {
    var b = findBooking(id);
    if (!b) return false;

    var conflict = state.bookings.some(function (x) {
      return x.day === b.day && x.time === time && x.id !== id;
    });
    if (conflict) { toast('Это время уже занято'); return false; }

    b.time = time;
    if (b.status === 'new') b.status = 'ok';

    save();
    render();
    toast(b.name + ' перенесена на ' + time);
    return true;
  }

  /* ============================================================
     ШТОРКИ
     ============================================================ */
  function openSheet(html) {
    els.sheetContent.innerHTML = html;
    els.sheet.hidden = false;
    void els.sheet.offsetWidth;
    els.sheet.classList.add('is-open');
    els.sheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }

  function closeSheet() {
    els.sheet.classList.remove('is-open');
    els.sheet.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    setTimeout(function () { els.sheet.hidden = true; }, 300);
  }

  function serviceOptions(selected) {
    return state.services.map(function (s) {
      return '<option value="' + s.id + '"' + (s.name === selected ? ' selected' : '') + '>' +
        s.name + ' — ' + money(s.price) + '</option>';
    }).join('');
  }

  function slotButtons(times, picked) {
    if (!times.length) return '<p class="ed-empty">Свободных окон нет</p>';
    return '<div class="slot-grid">' + times.map(function (t) {
      return '<button class="slot-btn' + (t === picked ? ' is-picked' : '') + '" type="button" data-pick="' + t + '">' + t + '</button>';
    }).join('') + '</div>';
  }

  function sheetBook(prefillTime, prefillName) {
    openSheet(
      '<h3 class="sheet__title">Записать клиента</h3>' +
      '<p class="sheet__sub">' + formatDay(state.day) + ' · свободные окна</p>' +
      '<div class="sheet-field"><label for="b-name">Имя</label><input id="b-name" type="text" value="' + (prefillName || '') + '" placeholder="Например, Ксения"></div>' +
      '<div class="sheet-field"><label for="b-phone">Телефон</label><input id="b-phone" type="tel" placeholder="+7 (___) ___-__-__"></div>' +
      '<div class="sheet-field"><label for="b-service">Услуга</label><select id="b-service">' + serviceOptions() + '</select></div>' +
      '<div class="sheet-field"><label>Время</label>' + slotButtons(freeSlots(state.day), prefillTime) + '</div>' +
      '<button class="btn-act btn-act--ok" type="button" style="width:100%;padding:15px;margin-top:6px" data-save-booking>Записать</button>'
    );
  }

  function sheetMove(id) {
    var b = findBooking(id);
    if (!b) return;
    moveId = id;
    var times = freeSlots(b.day).filter(function (t) { return t !== b.time; });
    openSheet(
      '<h3 class="sheet__title">Перенести: ' + b.name + '</h3>' +
      '<p class="sheet__sub">' + formatDay(b.day) + ' · сейчас ' + b.time + '</p>' +
      slotButtons(times, b.time) +
      '<p class="ed-hint">Нажмите на свободное время — запись переедет, клиентка получит сообщение.</p>' +
      '<button class="btn-act btn-act--soft" type="button" style="width:100%;padding:15px;margin-top:10px" data-close>Оставить как есть</button>'
    );
  }

  function sheetBooking(id) {
    var b = findBooking(id);
    if (!b) return;

    var statusText = b.status === 'ok' ? 'Подтверждена' : b.status === 'done' ? 'Выполнена' : 'Ждёт ответа';
    var main = '';

    if (b.status === 'new') {
      main = '<button class="btn-act btn-act--ok" type="button" data-confirm="' + b.id + '">Подтвердить</button>';
    } else if (b.status === 'ok') {
      main = '<button class="btn-act btn-act--ok" type="button" data-done="' + b.id + '">Выполнено</button>';
    } else {
      main = '<button class="btn-act btn-act--ok" type="button" data-repeat="' + b.name + '">Записать снова</button>';
    }

    var client = findClient(b.name, b.phone);

    openSheet(
      '<h3 class="sheet__title">' + b.name + '</h3>' +
      '<p class="sheet__sub">' + b.service + ' · ' + b.dur + ' мин · ' + money(b.price) + '</p>' +
      '<div class="three-stats">' +
        '<div><span>Когда</span><strong>' + formatDay(b.day).replace('Сегодня, ', '') + '</strong></div>' +
        '<div><span>Время</span><strong>' + b.time + '</strong></div>' +
        '<div><span>Статус</span><strong>' + statusText + '</strong></div>' +
      '</div>' +
      (client ? '<button class="btn-act btn-act--soft" type="button" style="width:100%;padding:13px;margin-top:14px" data-client="' + client.id + '">Открыть карточку клиентки</button>' : '') +
      '<div class="booking__actions" style="margin-top:10px">' + main +
        '<button class="btn-act btn-act--soft" type="button" data-move="' + b.id + '">Перенести</button>' +
      '</div>' +
      '<div class="booking__actions">' +
        '<button class="btn-act btn-act--line" type="button" data-call="' + b.id + '">Позвонить</button>' +
        '<button class="btn-act btn-act--line" type="button" data-write="' + b.id + '">Написать</button>' +
        '<button class="btn-act btn-act--line" type="button" data-cancel="' + b.id + '">Отменить</button>' +
      '</div>'
    );
  }

  function sheetClient(id) {
    var c = state.clients.find(function (x) { return x.id === id; });
    if (!c) return;

    var visits = clientVisits(c.name).slice(0, 5);
    var history = visits.length
      ? '<div class="hist">' + visits.map(function (v) {
          return '<div class="hist__row">' +
            '<span class="hist__svc">' + v.service + '</span>' +
            '<span class="hist__when">' + v.when + '</span>' +
            '<span class="hist__sum">' + money(v.sum) + '</span>' +
          '</div>';
        }).join('') + '</div>'
      : '<p class="ed-hint">Визитов пока не было</p>';

    openSheet(
      '<h3 class="sheet__title">' + c.name + '</h3>' +
      '<p class="sheet__sub">' + c.phone + '</p>' +
      '<div class="three-stats">' +
        '<div><span>Визитов</span><strong>' + c.visits + '</strong></div>' +
        '<div><span>Оставила</span><strong>' + money(c.total) + '</strong></div>' +
        '<div><span>Последний</span><strong>' + c.last + '</strong></div>' +
      '</div>' +
      '<p class="ed-block__title" style="margin:18px 0 8px">История визитов</p>' + history +
      '<div class="sheet-field" style="margin-top:16px"><label for="c-note">Заметка</label>' +
        '<textarea id="c-note" rows="3" placeholder="Что важно помнить">' + c.note + '</textarea></div>' +
      '<button class="btn-act btn-act--soft" type="button" style="width:100%;padding:14px;margin-bottom:10px" data-note-save="' + c.id + '">Сохранить заметку</button>' +
      '<div class="booking__actions" style="margin-top:0">' +
        '<button class="btn-act btn-act--line" type="button" data-call-client="' + c.id + '">Позвонить</button>' +
        '<button class="btn-act btn-act--line" type="button" data-toast="Открываю чат с ' + c.name + '">Написать</button>' +
        '<button class="btn-act btn-act--ok" type="button" data-book-client="' + c.name + '">Записать</button>' +
      '</div>'
    );
  }

  function sheetAddClient() {
    openSheet(
      '<h3 class="sheet__title">Новая клиентка</h3>' +
      '<p class="sheet__sub">Появится в базе и в поиске</p>' +
      '<div class="sheet-field"><label for="n-name">Имя</label><input id="n-name" type="text" placeholder="Например, Кристина"></div>' +
      '<div class="sheet-field"><label for="n-phone">Телефон</label><input id="n-phone" type="tel" placeholder="+7 (___) ___-__-__"></div>' +
      '<div class="sheet-field"><label for="n-note">Заметка</label><textarea id="n-note" rows="2" placeholder="Что важно помнить"></textarea></div>' +
      '<button class="btn-act btn-act--ok" type="button" style="width:100%;padding:15px" data-save-client>Добавить</button>'
    );
  }

  function sheetServices() {
    var rows = state.services.map(function (s, i) {
      return '<div class="setting">' +
        '<span class="setting__text"><strong>' + s.name + '</strong></span>' +
        '<span class="price-edit"><input type="number" min="0" step="50" value="' + s.price + '" data-price="' + i + '"> ₽</span>' +
      '</div>';
    }).join('');
    openSheet(
      '<h3 class="sheet__title">Услуги и цены</h3>' +
      '<p class="sheet__sub">Меняете здесь — на сайте обновляется сразу</p>' +
      '<div class="settings-card">' + rows + '</div>' +
      '<button class="btn-act btn-act--ok" type="button" style="width:100%;padding:15px" data-close>Готово</button>'
    );
  }

  function toggleRow(attrs, label, sub, on) {
    return '<div class="setting" style="border-bottom:1px solid var(--line)">' +
      '<span class="setting__text"><strong>' + label + '</strong><small>' + sub + '</small></span>' +
      '<span class="switch' + (on ? ' is-on' : '') + '" ' + attrs + '></span>' +
    '</div>';
  }

  function sheetNotify() {
    openSheet(
      '<h3 class="sheet__title">Уведомления</h3>' +
      '<p class="sheet__sub">Как сообщать о новых записях</p>' +
      '<div class="settings-card">' +
        toggleRow('data-notify="push"', 'Push на телефон', 'Приходит сразу, бесплатно', state.notify.push) +
        toggleRow('data-notify="telegram"', 'Telegram', 'По желанию, если пользуетесь', state.notify.telegram) +
        toggleRow('data-notify="email"', 'Почта', 'Копия заявки на e-mail', state.notify.email) +
      '</div>' +
      '<p class="ed-hint">Push работает на Android и iPhone (если добавить панель на экран «Домой»).</p>' +
      '<button class="btn-act btn-act--ok" type="button" style="width:100%;padding:15px;margin-top:12px" data-close>Готово</button>'
    );
  }

  function sheetPortfolio() {
    var cells = '';
    for (var i = 1; i <= 8; i++) {
      var on = state.portfolio.indexOf(i) !== -1;
      cells += '<button class="portfolio-cell' + (on ? ' is-on' : '') + '" type="button" data-portfolio="' + i + '">' +
        '<span>Работа ' + i + '</span><em>' + (on ? 'На сайте' : 'Скрыта') + '</em></button>';
    }
    openSheet(
      '<h3 class="sheet__title">Портфолио</h3>' +
      '<p class="sheet__sub">Отметьте работы, которые показывать на сайте</p>' +
      '<div class="portfolio-grid">' + cells + '</div>' +
      '<button class="btn-act btn-act--ok" type="button" style="width:100%;padding:15px;margin-top:14px" data-close>Готово</button>'
    );
  }

  /* ============================================================
     ДЕЙСТВИЯ
     ============================================================ */
  var pickedSlot = null;
  var moveId = null;

  function setTab(name) {
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('is-active', t.getAttribute('data-tab') === name);
    });
    document.querySelectorAll('.screen').forEach(function (s) {
      s.classList.toggle('is-active', s.id === 'screen-' + name);
    });
    document.querySelector('.app__main').scrollTop = 0;
  }

  function findBooking(id) {
    return state.bookings.find(function (x) { return x.id === id; });
  }

  document.addEventListener('click', function (e) {
    var el;

    /* --- навигация --- */
    if ((el = e.target.closest('[data-tab]'))) { setTab(el.getAttribute('data-tab')); return; }
    if ((el = e.target.closest('[data-day]'))) { state.day = +el.getAttribute('data-day'); render(); return; }

    /* --- уведомления --- */
    if ((el = e.target.closest('#bell'))) {
      openNotif(!els.notif.classList.contains('is-open'));
      return;
    }
    if (e.target.closest('[data-notif-close]')) { openNotif(false); return; }
    if (e.target.closest('[data-notif-read]')) {
      state.notifications.forEach(function (n) { n.read = true; });
      save(); renderNotif(); openNotif(false); toast('Все уведомления прочитаны');
      return;
    }
    if ((el = e.target.closest('[data-notif]'))) {
      var nid = +el.getAttribute('data-notif');
      var note = state.notifications.find(function (n) { return n.id === nid; });
      if (note) { note.read = true; save(); renderNotif(); }
      openNotif(false);
      return;
    }

    /* --- записи --- */
    if ((el = e.target.closest('[data-confirm]'))) {
      var b = findBooking(+el.getAttribute('data-confirm'));
      if (b) {
        b.status = 'ok';
        state.notifications.forEach(function (n) { if (n.type === 'new' && n.text.indexOf(b.name) !== -1) n.read = true; });
        save(); render();
        toast(b.name + ' получила подтверждение');
      }
      return;
    }
    if ((el = e.target.closest('[data-done]'))) { completeBooking(+el.getAttribute('data-done')); return; }
    if ((el = e.target.closest('[data-move]'))) { sheetMove(+el.getAttribute('data-move')); return; }
    if ((el = e.target.closest('[data-cancel]'))) { cancelBooking(+el.getAttribute('data-cancel')); closeSheet(); return; }
    if ((el = e.target.closest('[data-repeat]'))) { sheetBook(null, el.getAttribute('data-repeat')); return; }
    if ((el = e.target.closest('[data-open]')) && !e.target.closest('.booking__actions')) {
      sheetBooking(+el.getAttribute('data-open'));
      return;
    }
    if ((el = e.target.closest('[data-call]'))) {
      var bc = findBooking(+el.getAttribute('data-call'));
      if (bc) window.location.href = 'tel:' + bc.phone.replace(/[^\d+]/g, '');
      return;
    }
    if ((el = e.target.closest('[data-write]'))) {
      var bw = findBooking(+el.getAttribute('data-write'));
      toast('Открываю чат с ' + (bw ? bw.name : 'клиенткой'));
      return;
    }
    if ((el = e.target.closest('[data-slot]'))) { sheetBook(el.getAttribute('data-slot')); return; }

    /* --- закрыть / открыть день --- */
    if (e.target.closest('#close-day')) {
      var cfg = dayConfig(state.day);
      cfg.active = !cfg.active;
      save(); render();
      toast(cfg.active ? 'День открыт для записи' : 'День закрыт — клиентки не запишутся');
      return;
    }

    /* --- клиенты --- */
    if ((el = e.target.closest('[data-client]'))) { sheetClient(+el.getAttribute('data-client')); return; }
    if ((el = e.target.closest('[data-call-client]'))) {
      var cc = state.clients.find(function (x) { return x.id === +el.getAttribute('data-call-client'); });
      if (cc) window.location.href = 'tel:' + cc.phone.replace(/[^\d+]/g, '');
      return;
    }
    if ((el = e.target.closest('[data-note-save]'))) {
      var cid = +el.getAttribute('data-note-save');
      var client = state.clients.find(function (x) { return x.id === cid; });
      var ta = document.getElementById('c-note');
      if (client && ta) { client.note = ta.value; save(); }
      closeSheet(); toast('Заметка сохранена');
      return;
    }
    if ((el = e.target.closest('[data-book-client]'))) { sheetBook(null, el.getAttribute('data-book-client')); return; }
    if (e.target.closest('[data-save-client]')) {
      var nm = (document.getElementById('n-name').value || '').trim();
      var ph = (document.getElementById('n-phone').value || '').trim();
      if (!nm) { toast('Введите имя'); return; }
      state.clients.unshift({ id: Date.now(), name: nm, phone: ph || '—', last: 'ещё не была', visits: 0, total: 0,
        note: (document.getElementById('n-note').value || '').trim() });
      save(); closeSheet(); render(); toast(nm + ' добавлена в базу');
      return;
    }

    /* --- запись --- */
    if ((el = e.target.closest('[data-pick]'))) {
      var pickedTime = el.getAttribute('data-pick');

      // В режиме переноса тап сразу переносит запись
      if (moveId) {
        var mid = moveId;
        moveId = null;
        closeSheet();
        moveBooking(mid, pickedTime);
        return;
      }

      pickedSlot = pickedTime;
      var siblings = el.parentElement.querySelectorAll('.slot-btn');
      siblings.forEach(function (s) { s.classList.remove('is-picked'); });
      el.classList.add('is-picked');
      return;
    }
    if (e.target.closest('[data-save-booking]')) {
      var name = (document.getElementById('b-name').value || '').trim();
      var phone = (document.getElementById('b-phone').value || '').trim();
      if (!name) { toast('Введите имя клиентки'); return; }
      if (!pickedSlot) { toast('Выберите время'); return; }
      var sel = document.getElementById('b-service');
      var svc = state.services.find(function (s) { return s.id === sel.value; }) || state.services[0];
      state.bookings.push({
        id: Date.now(), day: state.day, time: pickedSlot, dur: 90,
        name: name, phone: phone || '—', service: svc.name, price: svc.price, status: 'ok'
      });
      pickedSlot = null;
      save(); closeSheet(); render();
      toast(name + ' записана — время занято');
      return;
    }

    /* --- настройки --- */
    if ((el = e.target.closest('[data-sheet]'))) {
      var kind = el.getAttribute('data-sheet');
      if (kind === 'services') sheetServices();
      if (kind === 'hours') openEditor();
      if (kind === 'notify') sheetNotify();
      if (kind === 'portfolio') sheetPortfolio();
      return;
    }
    if ((el = e.target.closest('[data-portfolio]'))) {
      var p = +el.getAttribute('data-portfolio');
      var idx = state.portfolio.indexOf(p);
      idx === -1 ? state.portfolio.push(p) : state.portfolio.splice(idx, 1);
      save();
      el.classList.toggle('is-on');
      el.querySelector('em').textContent = idx === -1 ? 'На сайте' : 'Скрыта';
      return;
    }
    if ((el = e.target.closest('[data-notify]'))) {
      var key = el.getAttribute('data-notify');
      state.notify[key] = !state.notify[key];
      el.classList.toggle('is-on', state.notify[key]);
      save(); toast('Сохранено');
      return;
    }
    if ((el = e.target.closest('[data-toast]'))) { toast(el.getAttribute('data-toast')); return; }
    if (e.target.closest('[data-close]') || e.target.closest('[data-close-sheet]')) { closeSheet(); return; }

    /* --- FAB: запись или новая клиентка --- */
    if (e.target.closest('#fab-add')) {
      pickedSlot = null;
      document.getElementById('screen-clients').classList.contains('is-active') ? sheetAddClient() : sheetBook();
      return;
    }
  });

  /* ---------- События редактора графика ---------- */
  els.schedBody.addEventListener('change', function (e) {
    var el = e.target;
    var d = draft.days[draftDay];

    if (el.hasAttribute('data-ed')) {
      d[el.getAttribute('data-ed')] = el.value;
      refreshPreview();
      return;
    }
    if (el.hasAttribute('data-ewin')) {
      var i = +el.getAttribute('data-ewin');
      d.windows[i][el.getAttribute('data-wfield')] = el.value;
      refreshPreview();
      return;
    }
  });

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.hasAttribute && el.hasAttribute('data-price')) {
      var idx = +el.getAttribute('data-price');
      state.services[idx].price = Math.max(0, +el.value || 0);
      save();
      toast('Цена обновлена — на сайте уже новая');
    }
  });

  document.addEventListener('click', function (e) {
    var el;

    if (e.target.closest('[data-editor-close]')) { closeEditor(false); return; }
    if (e.target.closest('[data-editor-save]')) { closeEditor(true); return; }

    if ((el = e.target.closest('[data-eday]'))) { draftDay = +el.getAttribute('data-eday'); renderEditor(); return; }
    if ((el = e.target.closest('[data-edactive]'))) { draft.days[draftDay].active = !draft.days[draftDay].active; renderEditor(); return; }
    if ((el = e.target.closest('[data-emode]'))) { draft.mode = el.getAttribute('data-emode'); renderEditor(); return; }
    if ((el = e.target.closest('[data-estep]'))) { draft.step = +el.getAttribute('data-estep'); renderEditor(); return; }
    if ((el = e.target.closest('[data-ewdel]'))) {
      var i = +el.getAttribute('data-ewdel');
      draft.days[draftDay].windows.splice(i, 1);
      renderEditor();
      return;
    }
    if (e.target.closest('[data-ewadd]')) {
      var day = draft.days[draftDay];
      var last = day.windows[day.windows.length - 1] || { to: '12:00' };
      day.windows.push({ from: last.to || '10:00', to: minToTime(timeToMin(last.to || '12:00') + 120) });
      renderEditor();
      return;
    }
    if (e.target.closest('[data-eapply]')) {
      var src = draft.days[draftDay];
      for (var i2 = 0; i2 < 7; i2++) {
        draft.days[i2].from = src.from;
        draft.days[i2].to = src.to;
        draft.days[i2].bFrom = src.bFrom;
        draft.days[i2].bTo = src.bTo;
        draft.days[i2].windows = clone(src.windows);
      }
      renderEditor();
      toast('Применено ко всем дням');
      return;
    }
  });

  els.clientSearch.addEventListener('input', function () { renderClients(this.value); });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (els.editor.classList.contains('is-open')) { closeEditor(false); return; }
    if (els.sheet.classList.contains('is-open')) { closeSheet(); return; }
    if (els.notif.classList.contains('is-open')) openNotif(false);
  });

  /* ---------- Старт ---------- */
  render();
})();


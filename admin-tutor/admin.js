/* ============================================================
   Панель репетитора — рабочая логика
   Данные — общий модуль NailsStore (роль tutor).
   ============================================================ */
(function () {
  'use strict';

  var NS = window.NailsStore;
  var money = NS.money;
  var pad = NS.pad;
  var timeToMin = NS.timeToMin;
  var minToTime = NS.minToTime;
  var clone = NS.clone;
  var MONTHS = NS.MONTHS;
  var WD_SHORT = NS.WD_SHORT;
  var WD_FULL = NS.WD_FULL;
  var dateByOffset = NS.dateByOffset;
  var workdayIndex = NS.workdayIndex;

  var urlParams = new URLSearchParams(window.location.search);
  var activeRole = urlParams.get('role') || localStorage.getItem('nails_tutor_active_role') || 'tutor-math';
  var state = NS.load(activeRole);
  function save() { NS.save(state, activeRole); }

  function updateSubjectUI() {
    var p = state.profile || {};
    var avatarEl = document.getElementById('app-avatar');
    var greetEl = document.getElementById('app-greet');
    if (greetEl && p.name) greetEl.textContent = p.name;
    if (avatarEl && p.name) {
      var parts = p.name.split(' ');
      avatarEl.textContent = (parts[0] ? parts[0][0] : '') + (parts[1] ? parts[1][0] : '');
    }

    document.querySelectorAll('.subj-pill').forEach(function (pill) {
      pill.classList.toggle('is-active', pill.getAttribute('data-role') === activeRole);
    });
  }

  function switchSubject(role) {
    activeRole = role;
    localStorage.setItem('nails_tutor_active_role', role);
    state = NS.load(activeRole);
    updateSubjectUI();
    renderAll();
    toast('Переключено: ' + (state.profile ? (state.profile.subject || state.profile.name) : ''));
  }

  var subjectBar = document.getElementById('subject-bar');
  if (subjectBar) {
    subjectBar.addEventListener('click', function (e) {
      var pill = e.target.closest('.subj-pill');
      if (pill) {
        var role = pill.getAttribute('data-role');
        if (role && role !== activeRole) switchSubject(role);
      }
    });
  }

  var els = {
    week: document.getElementById('week-strip'),
    pendingBlock: document.getElementById('pending-block'),
    pendingList: document.getElementById('pending-list'),
    pendingCount: document.getElementById('pending-count'),
    schedule: document.getElementById('schedule-list'),
    dayTitle: document.getElementById('day-title'),
    daySummary: document.getElementById('day-summary'),
    todayLabel: document.getElementById('today-label'),
    students: document.getElementById('students-list'),
    studentSearch: document.getElementById('student-search'),
    moneyToday: document.getElementById('money-today'),
    moneyWeek: document.getElementById('money-week'),
    moneyMonth: document.getElementById('money-month'),
    debtList: document.getElementById('debt-list'),
    moneyList: document.getElementById('money-list'),
    sheet: document.getElementById('sheet'),
    sheetContent: document.getElementById('sheet-content'),
    toast: document.getElementById('toast'),
    bell: document.getElementById('bell'),
    bellBadge: document.getElementById('bell-badge'),
    notif: document.getElementById('notif'),
    notifList: document.getElementById('notif-list'),
    editor: document.getElementById('schedule-editor'),
    schedBody: document.getElementById('sched-body')
  };

  /* ---------- Обёртки общего модуля ---------- */
  function dayConfig(offset)   { return NS.dayConfig(state, offset); }
  function freeSlots(offset)   { return NS.freeSlots(state, offset); }
  function formatDay(offset)   { return NS.formatDay(offset); }
  function shortDate(offset)   { return NS.shortDate(offset); }

  function serviceById(id) {
    return state.services.find(function (s) { return s.id === id; }) ||
           state.services.find(function (s) { return s.name === id; }) || null;
  }
  function formatName(id) {
    var f = (state.formats || []).find(function (x) { return x.id === id; });
    return f ? f.name : (id || '');
  }

  /* ---------- Утилиты ---------- */
  function toast(text) {
    els.toast.textContent = text;
    els.toast.classList.add('is-show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { els.toast.classList.remove('is-show'); }, 2600);
  }
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
  function findLesson(id) { return state.bookings.find(function (x) { return x.id === id; }); }
  function findStudent(id) { return state.clients.find(function (x) { return x.id === id; }); }

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
    if (type === 'new') return '📩';
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
        '<span class="notif__body"><strong>' + x.title + '</strong><span>' + x.text + '</span><small>' + relTime(x.at) + '</small></span>' +
        (x.read ? '' : '<span class="notif__dot"></span>') +
      '</button>';
    }).join('') || '<p class="notif__empty">Пока пусто</p>';
  }
  function pushNotif(type, title, text) {
    state.notifications.unshift({ id: Date.now(), type: type, title: title, text: text, at: Date.now(), read: false });
    save(); renderNotif();
  }
  function openNotif(open) {
    els.notif.classList.toggle('is-open', open);
    els.bell.setAttribute('aria-expanded', open ? 'true' : 'false');
    els.notif.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  /* ---------- Ученики: расчёты ---------- */
  function studentLessons(student) {
    var nm = student.name.toLowerCase();
    return state.bookings.filter(function (b) { return String(b.name).toLowerCase() === nm; });
  }
  function studentDone(student) {
    return studentLessons(student).filter(function (b) { return b.status === 'done'; });
  }
  function studentUnpaid(student) {
    return studentDone(student).filter(function (b) { return !b.paid; });
  }
  function studentDebt(student) {
    return studentUnpaid(student).reduce(function (a, b) { return a + (b.price || 0); }, 0);
  }

  /* ---------- Карточка занятия ---------- */
  function statusChip(l) {
    if (l.status === 'done') return '<span class="booking__status booking__status--done">Проведено</span>';
    if (l.status === 'ok')   return '<span class="booking__status booking__status--ok">Подтверждено</span>';
    return '<span class="booking__status booking__status--wait">Новая заявка</span>';
  }
  function lessonBadges(l) {
    var out = '';
    if (l.format) out += '<span class="mini-badge">' + formatName(l.format) + '</span>';
    if (l.repeat === 'weekly') out += '<span class="mini-badge mini-badge--rep">↻ каждую неделю</span>';
    if (l.trial) out += '<span class="mini-badge mini-badge--trial">пробное</span>';
    return out ? '<div class="mini-badges">' + out + '</div>' : '';
  }
  function lessonCard(l) {
    var cls = l.status === 'ok' ? 'booking--ok' : l.status === 'done' ? 'booking--done' : 'booking--new';
    var actions = '';
    if (l.status === 'new') {
      actions = '<div class="booking__actions">' +
        '<button class="btn-act btn-act--ok" type="button" data-confirm="' + l.id + '">Подтвердить</button>' +
        '<button class="btn-act btn-act--soft" type="button" data-move="' + l.id + '">Другое время</button>' +
      '</div>';
    } else if (l.status === 'ok') {
      actions = '<div class="booking__actions">' +
        '<button class="btn-act btn-act--line btn-act--icon" type="button" data-move="' + l.id + '">Перенести</button>' +
        '<button class="btn-act btn-act--ok" type="button" data-done="' + l.id + '">Проведено</button>' +
      '</div>';
    } else {
      actions = '<div class="booking__actions">' +
        (l.paid
          ? '<button class="btn-act btn-act--line btn-act--icon" type="button" disabled>Оплачено ✓</button>'
          : '<button class="btn-act btn-act--ok" type="button" data-pay="' + l.id + '">Отметить оплату</button>') +
        '<button class="btn-act btn-act--line btn-act--icon" type="button" data-hw="' + l.id + '">Д/З</button>' +
      '</div>';
    }
    return '<article class="booking ' + cls + '" data-open="' + l.id + '">' +
      '<div class="booking__time">' + l.time + '<span class="booking__dur">' + (l.dur || 60) + ' мин</span></div>' +
      '<div class="booking__body">' +
        '<p class="booking__name">' + l.name + '</p>' +
        '<p class="booking__service">' + l.service + ' · ' + money(l.price) + '</p>' +
        lessonBadges(l) + statusChip(l) +
      '</div>' + actions + '</article>';
  }

  /* ---------- Рендер: неделя ---------- */
  function renderWeek() {
    var html = '';
    for (var i = 0; i < 7; i++) {
      var d = dateByOffset(i);
      var has = state.bookings.some(function (b) { return b.day === i; });
      var off = !dayConfig(i).active;
      html += '<button class="week__day' +
        (i === state.day ? ' is-active' : '') + (i === 0 ? ' is-today' : '') +
        (has ? ' has-bookings' : '') + (off ? ' is-off' : '') +
        '" type="button" data-day="' + i + '">' +
        '<span class="week__day-wd">' + WD_SHORT[d.getDay()] + '</span>' +
        '<span class="week__day-num">' + d.getDate() + '</span>' +
        '<span class="week__dot"></span></button>';
    }
    els.week.innerHTML = html;
  }

  /* ---------- Рендер: заявки и расписание ---------- */
  function renderPending() {
    var list = state.bookings.filter(function (b) { return b.status === 'new' && b.day === state.day; });
    els.pendingBlock.classList.toggle('is-empty', list.length === 0);
    els.pendingCount.textContent = list.length;
    els.pendingList.innerHTML = list.map(lessonCard).join('');
  }

  function renderSchedule() {
    var lessons = state.bookings.filter(function (b) { return b.day === state.day && b.status !== 'new'; });
    var items = lessons.map(function (b) { return { t: b.time, b: b }; });
    freeSlots(state.day).forEach(function (t) { items.push({ t: t, f: true }); });
    items.sort(function (a, b) { return a.t.localeCompare(b.t); });

    els.schedule.innerHTML = items.map(function (it) {
      if (it.f) {
        return '<button class="freeslot" type="button" data-slot="' + it.t + '">' +
          '<span class="freeslot__plus">+</span>' + it.t + ' свободно</button>';
      }
      return lessonCard(it.b);
    }).join('') || '<p class="sheet__sub">На этот день занятий нет</p>';

    var cfg = dayConfig(state.day);
    var income = lessons.filter(function (b) { return b.status === 'ok' || b.status === 'done'; })
                        .reduce(function (a, b) { return a + (b.price || 0); }, 0);
    var waiting = state.bookings.filter(function (b) { return b.status === 'new' && b.day === state.day; }).length;

    els.dayTitle.textContent = formatDay(state.day) + (cfg.active ? '' : ' · выходной');
    var closeBtn = document.getElementById('close-day');
    if (closeBtn) closeBtn.textContent = cfg.active ? 'Выходной' : 'Рабочий день';
    els.daySummary.innerHTML =
      '<span>занятий: <strong>' + lessons.length + '</strong></span>' +
      '<span>ждут: <strong>' + waiting + '</strong></span>' +
      '<span>доход: <strong>' + money(income) + '</strong></span>';
  }

  /* ---------- Рендер: ученики ---------- */
  function renderStudents(filter) {
    filter = (filter || '').toLowerCase();
    var list = state.clients.filter(function (c) {
      return !filter || c.name.toLowerCase().indexOf(filter) !== -1 || (c.phone || '').indexOf(filter) !== -1;
    });
    els.students.innerHTML = list.map(function (c) {
      var subj = serviceById(c.subjectId);
      var debt = studentDebt(c);
      return '<button class="client" type="button" data-student="' + c.id + '">' +
        '<span class="client__ava">' + c.name.charAt(0) + '</span>' +
        '<span class="client__body">' +
          '<span class="client__name">' + c.name + '</span>' +
          '<span class="client__meta">' + (subj ? subj.name : '—') + (c.level ? ' · ' + c.level : '') + '</span>' +
        '</span>' +
        (debt
          ? '<span class="client__sum client__sum--debt">' + money(debt) + '</span>'
          : '<span class="client__sum">без долга</span>') +
      '</button>';
    }).join('') || '<p class="sheet__sub">Никого не нашли</p>';
  }

  /* ---------- Рендер: оплаты ---------- */
  function renderMoney() {
    var paidToday = state.bookings.filter(function (b) {
      return b.day === 0 && b.status === 'done' && b.paid;
    }).reduce(function (a, b) { return a + (b.price || 0); }, 0);

    els.moneyToday.textContent = money(paidToday);
    els.moneyWeek.textContent = money(9800 + paidToday);
    els.moneyMonth.textContent = money(42300 + paidToday);

    var debtors = state.clients.filter(function (c) { return studentDebt(c) > 0; });
    els.debtList.innerHTML = debtors.map(function (c) {
      return '<div class="money-item">' +
        '<span><strong>' + c.name + '</strong><br><span class="money-item__date">занятий долг: ' + studentUnpaid(c).length + '</span></span>' +
        '<button class="btn-act btn-act--ok btn-act--icon" type="button" data-pay-student="' + c.id + '">' + money(studentDebt(c)) + '</button>' +
      '</div>';
    }).join('') || '<p class="sheet__sub" style="padding:8px 0">Все оплаты закрыты 👍</p>';

    var history = state.bookings.filter(function (b) { return b.status === 'done' && b.paid; })
      .slice(0, 4)
      .map(function (b) { return { name: b.name, service: b.service, date: b.day === 0 ? 'сегодня' : shortDate(b.day), sum: b.price }; })
      .concat(state.history || []);

    els.moneyList.innerHTML = history.map(function (r) {
      return '<div class="money-item">' +
        '<span><strong>' + r.name + '</strong><br><span class="money-item__date">' + r.service + ' · ' + r.date + '</span></span>' +
        '<span class="money-item__sum">' + money(r.sum) + '</span></div>';
    }).join('');
  }

  function renderAll() {
    updateSubjectUI();
    renderWeek();
    renderPending();
    renderSchedule();
    renderStudents(els.studentSearch.value);
    renderMoney();
    renderNotif();
    els.todayLabel.textContent = formatDay(state.day);
  }

  /* ============================================================
     ДЕЙСТВИЯ С ЗАНЯТИЯМИ
     ============================================================ */
  function completeLesson(id) {
    var l = findLesson(id);
    if (!l || l.status === 'done') return;

    l.status = 'done';
    l.attended = true;

    var c = state.clients.find(function (x) { return x.name.toLowerCase() === l.name.toLowerCase(); });
    if (c) { c.visits = (c.visits || 0) + 1; c.total = (c.total || 0) + (l.price || 0); c.last = 'сегодня'; }

    save(); renderAll();
    toast('Занятие отмечено проведённым');
  }

  function payLesson(id) {
    var l = findLesson(id);
    if (!l || l.paid) return;
    l.paid = true;

    var when = l.day === 0 ? 'сегодня' : shortDate(l.day);
    state.history.unshift({ name: l.name, service: l.service + ' · занятие', date: when, sum: l.price });
    pushNotif('cash', 'Оплата получена', l.name + ' · ' + money(l.price));

    save(); renderAll();
    toast('Оплата отмечена: ' + money(l.price));
  }

  function payStudent(id) {
    var c = findStudent(id);
    if (!c) return;
    var unpaid = studentUnpaid(c);
    if (!unpaid.length) { toast('Долгов нет'); return; }

    var sum = 0;
    unpaid.forEach(function (l) {
      l.paid = true;
      sum += (l.price || 0);
      state.history.unshift({ name: l.name, service: l.service + ' · занятие', date: l.day === 0 ? 'сегодня' : shortDate(l.day), sum: l.price });
    });
    pushNotif('cash', 'Оплата получена', c.name + ' · ' + money(sum));
    save(); renderAll();
    toast(c.name + ': оплачено ' + money(sum));
  }

  function moveLesson(id, time) {
    var l = findLesson(id);
    if (!l) return false;
    var conflict = state.bookings.some(function (x) { return x.day === l.day && x.time === time && x.id !== id; });
    if (conflict) { toast('Это время занято'); return false; }
    l.time = time;
    if (l.status === 'new') l.status = 'ok';
    save(); renderAll();
    toast(l.name + ' перенесён(а) на ' + time);
    return true;
  }

  function cancelLesson(id) {
    var l = findLesson(id);
    if (!l) return;
    state.bookings = state.bookings.filter(function (x) { return x.id !== id; });
    pushNotif('cancel', 'Заявка отклонена', l.name + ' · ' + l.service + ' · ' + l.time);
    save(); renderAll();
    toast('Отклонено, время освободилось');
  }

  /* ============================================================
     ШТОРКИ
     ============================================================ */
  function subjectOptions(selected) {
    return state.services.map(function (s) {
      return '<option value="' + s.id + '"' + (s.name === selected ? ' selected' : '') + '>' + s.name + ' — ' + money(s.price) + '</option>';
    }).join('');
  }
  function formatOptions() {
    return (state.formats || []).map(function (f) {
      return '<option value="' + f.id + '">' + f.name + '</option>';
    }).join('');
  }
  function slotButtons(times, picked) {
    if (!times.length) return '<p class="ed-empty">Свободных окон нет</p>';
    return '<div class="slot-grid">' + times.map(function (t) {
      return '<button class="slot-btn' + (t === picked ? ' is-picked' : '') + '" type="button" data-pick="' + t + '">' + t + '</button>';
    }).join('') + '</div>';
  }

  function sheetBooking(prefillTime, prefillName) {
    openSheet(
      '<h3 class="sheet__title">Записать ученика</h3>' +
      '<p class="sheet__sub">' + formatDay(state.day) + ' · свободные окна</p>' +
      '<div class="sheet-field"><label for="b-name">Имя</label><input id="b-name" type="text" value="' + (prefillName || '') + '" placeholder="Имя ученика"></div>' +
      '<div class="sheet-field"><label for="b-phone">Телефон родителя</label><input id="b-phone" type="tel" placeholder="+7 (___) ___-__-__"></div>' +
      '<div class="sheet-field"><label for="b-subject">Предмет</label><select id="b-subject">' + subjectOptions() + '</select></div>' +
      '<div class="sheet-field"><label for="b-format">Формат</label><select id="b-format">' + formatOptions() + '</select></div>' +
      '<div class="sheet-field"><label>Время</label>' + slotButtons(freeSlots(state.day), prefillTime) + '</div>' +
      '<label class="f-check" style="margin:6px 0"><input class="f-checkbox" type="checkbox" id="b-repeat" value="weekly"><span>каждую неделю</span></label>' +
      '<button class="btn-act btn-act--ok" type="button" style="width:100%;padding:15px" data-save-booking>Записать</button>'
    );
  }

  function sheetMove(id) {
    var l = findLesson(id);
    if (!l) return;
    moveId = id;
    var times = freeSlots(l.day).filter(function (t) { return t !== l.time; });
    openSheet(
      '<h3 class="sheet__title">Перенести: ' + l.name + '</h3>' +
      '<p class="sheet__sub">' + formatDay(l.day) + ' · сейчас ' + l.time + '</p>' +
      slotButtons(times, l.time) +
      '<p class="ed-hint">Нажмите свободное время — занятие переедет, ученик получит сообщение.</p>' +
      '<button class="btn-act btn-act--soft" type="button" style="width:100%;padding:15px;margin-top:10px" data-close>Оставить как есть</button>'
    );
  }

  function sheetHomework(id) {
    var l = findLesson(id);
    if (!l) return;
    openSheet(
      '<h3 class="sheet__title">Домашнее задание</h3>' +
      '<p class="sheet__sub">' + l.name + ' · ' + l.service + '</p>' +
      '<div class="sheet-field"><textarea id="hw-text" rows="4" placeholder="Что задано к следующему занятию">' + (l.homework || '') + '</textarea></div>' +
      '<button class="btn-act btn-act--ok" type="button" style="width:100%;padding:15px" data-hw-save="' + l.id + '">Сохранить</button>'
    );
  }

  function sheetLesson(id) {
    var l = findLesson(id);
    if (!l) return;
    var when = l.day === 0 ? 'сегодня' : formatDay(l.day).replace('Сегодня, ', '');
    var main = '';
    if (l.status === 'new') {
      main = '<button class="btn-act btn-act--ok" type="button" data-confirm="' + l.id + '">Подтвердить</button>';
    } else if (l.status === 'ok') {
      main = '<button class="btn-act btn-act--ok" type="button" data-done="' + l.id + '">Проведено</button>';
    } else {
      main = l.paid
        ? '<button class="btn-act btn-act--soft" type="button" data-repeat="' + l.name + '">Записать снова</button>'
        : '<button class="btn-act btn-act--ok" type="button" data-pay="' + l.id + '">Отметить оплату</button>';
    }
    var c = state.clients.find(function (x) { return x.name.toLowerCase() === l.name.toLowerCase(); });

    openSheet(
      '<h3 class="sheet__title">' + l.name + '</h3>' +
      '<p class="sheet__sub">' + l.service + ' · ' + (l.dur || 60) + ' мин · ' + money(l.price) + '</p>' +
      '<div class="three-stats">' +
        '<div><span>Когда</span><strong>' + when + '</strong></div>' +
        '<div><span>Время</span><strong>' + l.time + '</strong></div>' +
        '<div><span>Формат</span><strong>' + (formatName(l.format) || '—') + '</strong></div>' +
      '</div>' +
      (l.homework ? '<p class="ed-block__title" style="margin:16px 0 6px">Домашнее задание</p><div class="hw-note">' + l.homework + '</div>' : '') +
      (c ? '<button class="btn-act btn-act--soft" type="button" style="width:100%;padding:13px;margin-top:14px" data-student="' + c.id + '">Карточка ученика</button>' : '') +
      '<div class="booking__actions" style="margin-top:10px">' + main +
        '<button class="btn-act btn-act--soft" type="button" data-move="' + l.id + '">Перенести</button></div>' +
      '<div class="booking__actions">' +
        '<button class="btn-act btn-act--line" type="button" data-call="' + l.id + '">Позвонить</button>' +
        '<button class="btn-act btn-act--line" type="button" data-hw="' + l.id + '">Д/З</button>' +
        '<button class="btn-act btn-act--line" type="button" data-cancel="' + l.id + '">Отменить</button></div>'
    );
  }

  function sheetStudent(id) {
    var c = findStudent(id);
    if (!c) return;
    var subj = serviceById(c.subjectId);
    var done = studentDone(c);
    var debt = studentDebt(c);

    var history = done.slice(0, 5).map(function (l) {
      return '<div class="hist__row"><span class="hist__svc">' + l.service + '</span>' +
        '<span class="hist__when">' + (l.day === 0 ? 'сегодня' : shortDate(l.day)) + '</span>' +
        '<span class="hist__sum' + (l.paid ? '' : ' hist__sum--debt') + '">' + (l.paid ? money(l.price) : 'долг') + '</span></div>';
    }).join('') || '<p class="ed-hint">Занятий пока не было</p>';

    openSheet(
      '<h3 class="sheet__title">' + c.name + '</h3>' +
      '<p class="sheet__sub">' + (subj ? subj.name : '—') + (c.level ? ' · ' + c.level : '') + (c.parent ? ' · ' + c.parent : '') + '</p>' +
      '<div class="three-stats">' +
        '<div><span>Занятий</span><strong>' + done.length + '</strong></div>' +
        '<div><span>Оплачено</span><strong>' + money((c.total || 0) - debt) + '</strong></div>' +
        '<div><span>Долг</span><strong>' + (debt ? money(debt) : '0 ₽') + '</strong></div>' +
      '</div>' +
      (c.goal ? '<div class="goal-note">Цель: ' + c.goal + '</div>' : '') +
      '<p class="ed-block__title" style="margin:16px 0 8px">История занятий</p>' + history +
      '<div class="sheet-field" style="margin-top:16px"><label for="c-note">Заметка</label>' +
        '<textarea id="c-note" rows="3" placeholder="Что важно помнить">' + (c.note || '') + '</textarea></div>' +
      '<button class="btn-act btn-act--soft" type="button" style="width:100%;padding:14px;margin-bottom:10px" data-note-save="' + c.id + '">Сохранить заметку</button>' +
      '<div class="booking__actions" style="margin-top:0">' +
        (debt ? '<button class="btn-act btn-act--ok" type="button" data-pay-student="' + c.id + '">Оплатить</button>' : '') +
        '<button class="btn-act btn-act--line" type="button" data-call-student="' + c.id + '">Позвонить</button>' +
        '<button class="btn-act btn-act--line" type="button" data-book-student="' + c.name + '">Записать</button></div>'
    );
  }

  function sheetAddStudent() {
    openSheet(
      '<h3 class="sheet__title">Новый ученик</h3>' +
      '<p class="sheet__sub">Появится в базе и в поиске</p>' +
      '<div class="sheet-field"><label for="n-name">Имя</label><input id="n-name" type="text" placeholder="Имя ученика"></div>' +
      '<div class="sheet-field"><label for="n-phone">Телефон</label><input id="n-phone" type="tel" placeholder="+7 (___) ___-__-__"></div>' +
      '<div class="sheet-field"><label for="n-subject">Предмет</label><select id="n-subject">' + subjectOptions() + '</select></div>' +
      '<div class="sheet-field"><label for="n-level">Класс / уровень</label><input id="n-level" type="text" placeholder="9 класс, B2..."></div>' +
      '<div class="sheet-field"><label for="n-goal">Цель</label><input id="n-goal" type="text" placeholder="ОГЭ на 5, ЕГЭ 80+"></div>' +
      '<button class="btn-act btn-act--ok" type="button" style="width:100%;padding:15px" data-save-student>Добавить</button>'
    );
  }

  function sheetSubjects() {
    var rows = state.services.map(function (s, i) {
      return '<div class="setting"><span class="setting__text"><strong>' + s.name + '</strong><small>' + (s.desc || '') + '</small></span>' +
        '<span class="price-edit"><input type="number" min="0" step="50" value="' + s.price + '" data-price="' + i + '"> ₽</span></div>';
    }).join('');
    openSheet(
      '<h3 class="sheet__title">Предметы и цены</h3>' +
      '<p class="sheet__sub">Меняете здесь — на сайте обновляется сразу</p>' +
      '<div class="settings-card">' + rows + '</div>' +
      '<button class="btn-act btn-act--ok" type="button" style="width:100%;padding:15px" data-close>Готово</button>'
    );
  }

  function sheetPackages() {
    var rows = (state.packages || []).map(function (p) {
      return '<div class="setting"><span class="setting__text"><strong>' + p.lessons + ' занятий</strong><small>' +
        (p.discount ? 'скидка ' + p.discount + '%' : 'без скидки') + '</small></span>' +
        '<span class="client__sum">' + (p.discount ? '−' + p.discount + '%' : '—') + '</span></div>';
    }).join('');
    openSheet(
      '<h3 class="sheet__title">Пакеты занятий</h3>' +
      '<p class="sheet__sub">Скидка считается от стоимости предмета</p>' +
      '<div class="settings-card">' + rows + '</div>' +
      '<p class="ed-hint">Пакет оплачивается перед первым занятием. Если ученик уходит раньше — остаток занятий возвращаем.</p>' +
      '<button class="btn-act btn-act--ok" type="button" style="width:100%;padding:15px" data-close>Готово</button>'
    );
  }

  function toggleRow(attrs, label, sub, on) {
    return '<div class="setting" style="border-bottom:1px solid var(--line)">' +
      '<span class="setting__text"><strong>' + label + '</strong><small>' + sub + '</small></span>' +
      '<span class="switch' + (on ? ' is-on' : '') + '" ' + attrs + '></span></div>';
  }

  function sheetNotify() {
    openSheet(
      '<h3 class="sheet__title">Уведомления</h3>' +
      '<p class="sheet__sub">Как сообщать о новых заявках</p>' +
      '<div class="settings-card">' +
        toggleRow('data-notify="push"', 'Push на телефон', 'Приходит сразу, бесплатно', state.notify.push) +
        toggleRow('data-notify="telegram"', 'Telegram', 'По желанию, если пользуетесь', state.notify.telegram) +
        toggleRow('data-notify="email"', 'Почта', 'Копия заявки на e-mail', state.notify.email) +
      '</div>' +
      '<p class="ed-hint">Клиенту напоминание придёт за день до занятия, если включите канал.</p>' +
      '<button class="btn-act btn-act--ok" type="button" style="width:100%;padding:15px;margin-top:12px" data-close>Готово</button>'
    );
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
      state.days = draft.days;
      save(); renderAll();
      toast('График сохранён');
    }
    els.editor.classList.remove('is-open');
    els.editor.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    setTimeout(function () { els.editor.hidden = true; }, 300);
  }

  function draftSlots() {
    var d = draft.days[draftDay];
    if (!d.active) return [];
    var step = draft.step, wins = [], out = [];
    if (d.bFrom && timeToMin(d.bFrom) > timeToMin(d.from)) wins.push({ from: d.from, to: d.bFrom });
    var sf = timeToMin(d.bTo) > timeToMin(d.from) ? d.bTo : d.from;
    if (timeToMin(d.to) > timeToMin(sf)) wins.push({ from: sf, to: d.to });
    if (!wins.length) wins.push({ from: d.from, to: d.to });
    wins.forEach(function (w) {
      for (var m = timeToMin(w.from); m + step <= timeToMin(w.to); m += step) out.push(minToTime(m));
    });
    return out;
  }

  function renderEditor() {
    var d = draft.days[draftDay];
    var chips = '';
    for (var i = 0; i < 7; i++) {
      var dd = draft.days[i];
      chips += '<button class="ed-day' + (i === draftDay ? ' is-active' : '') + (dd.active ? '' : ' is-off') +
        '" type="button" data-eday="' + i + '">' + WD_SHORT[(i + 1) % 7] + '</button>';
    }
    var slots = draftSlots();

    els.schedBody.innerHTML =
      '<p class="ed-block__title">' + WD_FULL[draftDay] + '</p>' +
      '<div class="ed-days">' + chips + '</div>' +
      '<div class="ed-toggle"><span>Рабочий день</span><span class="switch' + (d.active ? ' is-on' : '') + '" data-edactive></span></div>' +
      '<div class="ed-card">' +
        '<div class="ed-row"><label>Занятия с</label><input type="time" data-ed="from" value="' + d.from + '"></div>' +
        '<div class="ed-row"><label>до</label><input type="time" data-ed="to" value="' + d.to + '"></div>' +
        '<div class="ed-row"><label>Перерыв с</label><input type="time" data-ed="bFrom" value="' + d.bFrom + '"></div>' +
        '<div class="ed-row"><label>до</label><input type="time" data-ed="bTo" value="' + d.bTo + '"></div>' +
      '</div>' +
      '<div class="ed-block"><p class="ed-block__title">Длительность занятия</p><div class="ed-chips">' +
        [45, 60, 90].map(function (s) {
          return '<button class="ed-chip' + (draft.step === s ? ' is-active' : '') + '" type="button" data-estep="' + s + '">' + s + ' мин</button>';
        }).join('') + '</div></div>' +
      '<button class="ed-apply" type="button" data-eapply>Применить ко всем рабочим дням</button>' +
      '<div class="ed-block"><p class="ed-block__title">Как увидят ученики</p><div class="ed-preview">' +
        (slots.length
          ? '<div class="ed-slots">' + slots.map(function (t) { return '<span class="ed-slot">' + t + '</span>'; }).join('') + '</div>' +
            '<p class="ed-hint">' + slots.length + ' окон · шаг ' + draft.step + ' мин</p>'
          : '<p class="ed-empty">Выходной — заявок не будет</p>') +
      '</div></div>';
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

  document.addEventListener('click', function (e) {
    var el, l, n;

    /* --- навигация и уведомления --- */
    if ((el = e.target.closest('[data-tab]'))) { setTab(el.getAttribute('data-tab')); return; }
    if ((el = e.target.closest('[data-day]'))) { state.day = +el.getAttribute('data-day'); renderAll(); return; }
    if (e.target.closest('#bell')) { openNotif(!els.notif.classList.contains('is-open')); return; }
    if (e.target.closest('[data-notif-close]')) { openNotif(false); return; }
    if (e.target.closest('[data-notif-read]')) {
      state.notifications.forEach(function (x) { x.read = true; });
      save(); renderNotif(); openNotif(false); toast('Все уведомления прочитаны');
      return;
    }
    if ((el = e.target.closest('[data-notif]'))) {
      n = state.notifications.find(function (x) { return x.id === +el.getAttribute('data-notif'); });
      if (n) { n.read = true; save(); renderNotif(); }
      openNotif(false);
      return;
    }

    /* --- занятия --- */
    if ((el = e.target.closest('[data-confirm]'))) {
      l = findLesson(+el.getAttribute('data-confirm'));
      if (l) { l.status = 'ok'; save(); renderAll(); toast(l.name + ': занятие подтверждено'); }
      return;
    }
    if ((el = e.target.closest('[data-done]'))) { completeLesson(+el.getAttribute('data-done')); return; }
    if ((el = e.target.closest('[data-pay]'))) { payLesson(+el.getAttribute('data-pay')); closeSheet(); return; }
    if ((el = e.target.closest('[data-pay-student]'))) { payStudent(+el.getAttribute('data-pay-student')); closeSheet(); return; }
    if ((el = e.target.closest('[data-move]'))) { sheetMove(+el.getAttribute('data-move')); return; }
    if ((el = e.target.closest('[data-cancel]'))) { cancelLesson(+el.getAttribute('data-cancel')); closeSheet(); return; }
    if ((el = e.target.closest('[data-hw]'))) { sheetHomework(+el.getAttribute('data-hw')); return; }
    if ((el = e.target.closest('[data-hw-save]'))) {
      l = findLesson(+el.getAttribute('data-hw-save'));
      var hw = document.getElementById('hw-text');
      if (l && hw) { l.homework = hw.value; save(); }
      closeSheet(); toast('Домашнее задание сохранено');
      return;
    }
    if ((el = e.target.closest('[data-repeat]'))) { sheetBooking(null, el.getAttribute('data-repeat')); return; }
    if ((el = e.target.closest('[data-call]'))) {
      l = findLesson(+el.getAttribute('data-call'));
      if (l) window.location.href = 'tel:' + String(l.phone).replace(/[^\d+]/g, '');
      return;
    }
    if ((el = e.target.closest('[data-call-student]'))) {
      var cs = findStudent(+el.getAttribute('data-call-student'));
      if (cs) window.location.href = 'tel:' + String(cs.phone || '').replace(/[^\d+]/g, '');
      return;
    }
    if ((el = e.target.closest('[data-sheet]'))) {
      var kind = el.getAttribute('data-sheet');
      if (kind === 'subjects') sheetSubjects();
      if (kind === 'hours') openEditor();
      if (kind === 'packages') sheetPackages();
      if (kind === 'notify') sheetNotify();
      return;
    }
    if ((el = e.target.closest('[data-notify]'))) {
      var key = el.getAttribute('data-notify');
      state.notify[key] = !state.notify[key];
      el.classList.toggle('is-on', state.notify[key]);
      save(); toast('Сохранено');
      return;
    }
    if (e.target.closest('#close-day')) {
      var cfg = dayConfig(state.day);
      cfg.active = !cfg.active;
      save(); renderAll();
      toast(cfg.active ? 'Рабочий день открыт' : 'Отмечено как выходной');
      return;
    }

    /* --- запись --- */
    if ((el = e.target.closest('[data-slot]'))) { sheetBooking(el.getAttribute('data-slot')); return; }
    if ((el = e.target.closest('[data-pick]'))) {
      var t = el.getAttribute('data-pick');
      if (moveId) { var mid = moveId; moveId = null; closeSheet(); moveLesson(mid, t); return; }
      pickedSlot = t;
      el.parentElement.querySelectorAll('.slot-btn').forEach(function (s) { s.classList.remove('is-picked'); });
      el.classList.add('is-picked');
      return;
    }
    if (e.target.closest('[data-save-booking]')) {
      var nm = (document.getElementById('b-name').value || '').trim();
      if (!nm) { toast('Введите имя'); return; }
      if (!pickedSlot) { toast('Выберите время'); return; }

      var svc = serviceById(document.getElementById('b-subject').value) || state.services[0];
      var fmt = document.getElementById('b-format').value;
      var rep = document.getElementById('b-repeat').checked;
      var weeks = rep ? 4 : 1;
      var day = state.day, time = pickedSlot;

      for (var w = 0; w < weeks; w++) {
        var clash = state.bookings.some(function (x) { return x.day === day + w * 7 && x.time === time; });
        if (clash) { toast('На это время уже есть занятие'); return; }
      }

      var seriesId = weeks > 1 ? Date.now() : null;
      for (var w2 = 0; w2 < weeks; w2++) {
        state.bookings.push({
          id: Date.now() + w2, day: day + w2 * 7, time: time, dur: svc.dur || 60,
          name: nm,
          phone: (document.getElementById('b-phone').value || '').trim() || '—',
          service: svc.name, price: svc.price, status: 'ok',
          subjectId: svc.id, format: fmt, repeat: rep ? 'weekly' : 'none',
          seriesId: seriesId, homework: '', attended: false, paid: false
        });
      }
      pickedSlot = null;
      save(); closeSheet(); renderAll();
      toast(nm + ' записан(а)' + (rep ? ' на ' + weeks + ' недели вперёд' : ''));
      return;
    }

    /* --- ученики --- */
    if ((el = e.target.closest('[data-student]'))) { sheetStudent(+el.getAttribute('data-student')); return; }
    if ((el = e.target.closest('[data-book-student]'))) { sheetBooking(null, el.getAttribute('data-book-student')); return; }
    if ((el = e.target.closest('[data-note-save]'))) {
      var st = findStudent(+el.getAttribute('data-note-save'));
      var ta = document.getElementById('c-note');
      if (st && ta) { st.note = ta.value; save(); }
      closeSheet(); toast('Заметка сохранена');
      return;
    }
    if (e.target.closest('[data-save-student]')) {
      var name = (document.getElementById('n-name').value || '').trim();
      if (!name) { toast('Введите имя'); return; }
      state.clients.unshift({
        id: Date.now(), name: name,
        phone: (document.getElementById('n-phone').value || '').trim() || '—',
        subjectId: document.getElementById('n-subject').value,
        level: (document.getElementById('n-level').value || '').trim(),
        goal: (document.getElementById('n-goal').value || '').trim(),
        parent: '', last: 'ещё не занимался', visits: 0, total: 0, note: ''
      });
      save(); closeSheet(); renderAll(); toast(name + ' добавлен(а) в базу');
      return;
    }

    /* --- прочее --- */
    if ((el = e.target.closest('[data-toast]'))) { toast(el.getAttribute('data-toast')); return; }
    if (e.target.closest('[data-close]') || e.target.closest('[data-close-sheet]')) { closeSheet(); return; }
    if (e.target.closest('#fab-add')) {
      pickedSlot = null;
      if (document.getElementById('screen-students').classList.contains('is-active')) sheetAddStudent();
      else sheetBooking();
      return;
    }
    if ((el = e.target.closest('[data-open]')) && !e.target.closest('.booking__actions')) {
      sheetLesson(+el.getAttribute('data-open'));
      return;
    }
  });

  /* ---------- Редактор: ввод времени ---------- */
  els.schedBody.addEventListener('change', function (e) {
    var el = e.target;
    if (el.hasAttribute('data-ed')) {
      draft.days[draftDay][el.getAttribute('data-ed')] = el.value;
      renderEditor();
    }
  });

  document.addEventListener('click', function (e) {
    var el;
    if (e.target.closest('[data-editor-close]')) { closeEditor(false); return; }
    if (e.target.closest('[data-editor-save]')) { closeEditor(true); return; }
    if ((el = e.target.closest('[data-eday]'))) { draftDay = +el.getAttribute('data-eday'); renderEditor(); return; }
    if (e.target.closest('[data-edactive]')) { draft.days[draftDay].active = !draft.days[draftDay].active; renderEditor(); return; }
    if ((el = e.target.closest('[data-estep]'))) { draft.step = +el.getAttribute('data-estep'); renderEditor(); return; }
    if (e.target.closest('[data-eapply]')) {
      var src = draft.days[draftDay];
      for (var i = 0; i < 7; i++) {
        draft.days[i].from = src.from;
        draft.days[i].to = src.to;
        draft.days[i].bFrom = src.bFrom;
        draft.days[i].bTo = src.bTo;
      }
      renderEditor();
      toast('Применено ко всем дням');
      return;
    }
  });

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.hasAttribute && el.hasAttribute('data-price')) {
      state.services[+el.getAttribute('data-price')].price = Math.max(0, +el.value || 0);
      save();
      toast('Цена обновлена — на сайте уже новая');
    }
  });

  els.studentSearch.addEventListener('input', function () { renderStudents(this.value); });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (els.editor.classList.contains('is-open')) { closeEditor(false); return; }
    if (els.sheet.classList.contains('is-open')) { closeSheet(); return; }
    if (els.notif.classList.contains('is-open')) openNotif(false);
  });

  /* ---------- Старт ---------- */
  renderAll();
})();

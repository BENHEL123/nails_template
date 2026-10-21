/* ============================================================
   NAILS & TUTORS — общее хранилище и логика расписания
   Один источник данных для сайтов и административных панелей.

   Поддерживает профили:
   - nails: Мастер маникюра (Ульяна)
   - tutor-math: Репетитор по математике (Михаил Алексеевич)
   - tutor-physics: Репетитор по физике (Дмитрий Николаевич)
   - tutor-russian: Репетитор по русскому языку (Анна Владимировна)
   - tutor-english: Репетитор по английскому языку (Дарья Романовна)
   ============================================================ */
(function (global) {
  'use strict';

  var KEYS = {
    'nails':         'nails-data-v1',
    'tutor':         'tutor-math-v1',
    'tutor-math':    'tutor-math-v1',
    'tutor-physics': 'tutor-physics-v1',
    'tutor-russian': 'tutor-russian-v1',
    'tutor-english': 'tutor-english-v1'
  };
  var LEGACY_KEY = 'nails-admin-v1';

  function currentRole() {
    return global.NAILS_ROLE || 'nails';
  }

  function keyFor(role) {
    role = role || currentRole();
    return KEYS[role] || KEYS.nails;
  }

  var MONTHS = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  var WD_SHORT = ['вс','пн','вт','ср','чт','пт','сб'];
  var WD_FULL = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];

  /* ---------- Утилиты ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function money(n) { return Number(n).toLocaleString('ru-RU') + ' ₽'; }
  function timeToMin(t) { var p = String(t).split(':'); return (+p[0]) * 60 + (+p[1]); }
  function minToTime(m) { m = ((m % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }

  /* ---------- График по умолчанию: бьюти ---------- */
  function defaultBeautyDays() {
    var auto = function (from, to, bFrom, bTo) {
      return { active: true, from: from, to: to, bFrom: bFrom, bTo: bTo,
               windows: [{ from: from, to: bFrom }, { from: bTo, to: to }] };
    };
    return [
      auto('10:00', '21:00', '14:00', '15:00'),
      auto('10:00', '21:00', '14:00', '15:00'),
      auto('10:00', '21:00', '14:00', '15:00'),
      auto('10:00', '21:00', '14:00', '15:00'),
      auto('10:00', '21:00', '14:00', '15:00'),
      auto('11:00', '18:00', '14:00', '15:00'),
      auto('11:00', '16:00', '13:00', '14:00')
    ];
  }

  /* ---------- График по умолчанию: репетиторы ---------- */
  function defaultTutorDays() {
    var day = function (active, from, to, bFrom, bTo) {
      return { active: active, from: from, to: to, bFrom: bFrom, bTo: bTo,
               windows: [{ from: from, to: bFrom }, { from: bTo, to: to }] };
    };
    return [
      day(true,  '15:00', '21:00', '18:00', '18:30'),
      day(true,  '15:00', '21:00', '18:00', '18:30'),
      day(true,  '15:00', '21:00', '18:00', '18:30'),
      day(true,  '15:00', '21:00', '18:00', '18:30'),
      day(true,  '15:00', '21:00', '18:00', '18:30'),
      day(true,  '10:00', '18:00', '13:00', '14:00'),
      day(false, '10:00', '18:00', '13:00', '14:00')
    ];
  }

  /* ---------- 1. Состояние: Маникюр ---------- */
  function nailsState() {
    return {
      day: 0,
      step: 30,
      mode: 'auto',
      master: { name: 'Ульяна', phone: '+7 (999) 000-00-00', city: 'Москва, Хамовники' },
      days: defaultBeautyDays(),
      notify: { push: true, telegram: false, email: false },
      services: [
        { id: 'manicure',     name: 'Аппаратный маникюр', price: 1500, dur: 60,  desc: 'Стерильная обработка кутикулы, придание формы, питание маслом' },
        { id: 'manicure-gel', name: 'Маникюр + гель-лак', price: 2200, dur: 90,  desc: 'Выравнивание базой, укрепление, стойкое цветное покрытие' },
        { id: 'extension',    name: 'Наращивание ногтей', price: 3500, dur: 150, desc: 'Моделирование на верхние/нижние формы, любая длина и архитектура' },
        { id: 'correction',   name: 'Коррекция наращивания', price: 2600, dur: 120, desc: 'Поднятие архитектуры, смена формы, свежее покрытие' },
        { id: 'design-french',name: 'Френч / Градиент',    price: 600,  dur: 30,  desc: 'Идеальная линия улыбки, тонкая прорисовка от руки' },
        { id: 'pedicure',     name: 'Smart-педикюр',       price: 2800, dur: 90,  desc: 'Аппаратная обработка стоп смарт-диском + покрытие пальчиков' }
      ],
      bookings: [
        { id: 1, day: 0, time: '10:00', dur: 90,  name: 'Анна К.',    phone: '+7 (916) 555-11-22', service: 'Маникюр + гель-лак', price: 2200, status: 'done' },
        { id: 2, day: 0, time: '12:30', dur: 150, name: 'Марина В.', phone: '+7 (903) 222-33-44', service: 'Наращивание ногтей', price: 3500, status: 'ok' },
        { id: 3, day: 0, time: '16:30', dur: 90,  name: 'Ксения С.',  phone: '+7 (925) 777-88-99', service: 'Маникюр + гель-лак', price: 2200, status: 'new' },
        { id: 4, day: 1, time: '11:00', dur: 90,  name: 'Елена П.',   phone: '+7 (909) 444-55-66', service: 'Smart-педикюр',     price: 2800, status: 'ok' }
      ],
      clients: [
        { id: 1, name: 'Ксения С.', phone: '+7 (925) 777-88-99', last: 'сегодня', visits: 1, total: 2200,  note: 'Любит нюд и молочный градиент.' },
        { id: 2, name: 'Анна К.',    phone: '+7 (916) 555-11-22', last: '12 сен',  visits: 6, total: 13200, note: 'Тонкая кутикула, работаем без воды и давления.' },
        { id: 3, name: 'Марина В.', phone: '+7 (903) 222-33-44', last: '3 окт',   visits: 9, total: 31500, note: 'Аллергия на липкий слой, протираем сразу.' }
      ],
      history: [
        { name: 'Марина В.', service: 'Наращивание ногтей', date: '3 окт', sum: 3500 },
        { name: 'Анна К.',   service: 'Маникюр + гель-лак', date: '2 окт', sum: 2200 }
      ],
      notifications: [
        { id: 11, type: 'new', title: 'Новая запись с сайта', text: 'Ксения С. · Маникюр + гель-лак · сегодня 16:30', at: Date.now() - 5 * 60000, read: false }
      ]
    };
  }

  /* ---------- 2. Состояние: Репетитор по МАТЕМАТИКЕ ---------- */
  function mathState() {
    return {
      day: 0,
      step: 60,
      mode: 'auto',
      profile: {
        role: 'tutor-math',
        subject: 'Математика',
        name: 'Михаил Алексеевич Воронов',
        degree: 'МГУ им. Ломоносова (Мехмат), Эксперт ЕГЭ',
        city: 'Москва и онлайн по РФ',
        timezone: 'Europe/Moscow',
        experience: '12 лет'
      },
      formats: [
        { id: 'online',  name: 'Онлайн (Zoom + доска Miro)' },
        { id: 'offline', name: 'У преподавателя (м. Университет)' },
        { id: 'student', name: 'Выезд к ученику' }
      ],
      packages: [
        { id: 'p1',  lessons: 1,  discount: 0  },
        { id: 'p4',  lessons: 4,  discount: 5  },
        { id: 'p8',  lessons: 8,  discount: 10 },
        { id: 'p12', lessons: 12, discount: 15 }
      ],
      days: defaultTutorDays(),
      notify: { push: true, telegram: false, email: false },
      services: [
        { id: 'math-ege-prof', name: 'ЕГЭ Профиль: 80+ под ключ',  price: 2500, dur: 90, desc: 'Параметры №17, планиметрия и стереометрия №13/16, теория чисел №18', levels: ['10–11 класс', 'ЕГЭ Профиль'] },
        { id: 'math-oge-max',  name: 'ОГЭ Математика на максимум',price: 1800, dur: 60, desc: 'Разбор сложной 2 части (задачи №20–25), геометрия без пробелов', levels: ['8–9 класс', 'ОГЭ на «5»'] },
        { id: 'math-geom-boost',name: 'Геометрия без страха',     price: 1800, dur: 60, desc: 'Наглядные чертежи, логика доказательств, аксиомы и теоремы', levels: ['7–11 класс'] },
        { id: 'math-olympiad', name: 'Олимпиадная математика',    price: 3000, dur: 90, desc: 'Подготовка к перечневым олимпиадам: Физтех, Ломоносов, Всесиб', levels: ['8–11 класс', 'Олимпиады'] },
        { id: 'math-school-fix',name: 'Ликвидация школьных пробелов', price: 1600, dur: 60, desc: 'Дроби, уравнения, функции. Убираем стресс у доски', levels: ['5–8 класс'] }
      ],
      bookings: [
        { id: 101, day: 0, time: '15:00', dur: 90, name: 'Арсений Т.', phone: '+7 (916) 123-45-67', service: 'ЕГЭ Профиль: 80+ под ключ', price: 2500, status: 'done', format: 'online', repeat: 'weekly', attended: true, paid: true, homework: 'Вариант 14 (№13, 15)' },
        { id: 102, day: 0, time: '17:00', dur: 60, name: 'Варвара С.', phone: '+7 (925) 345-67-89', service: 'ОГЭ Математика на максимум', price: 1800, status: 'ok', format: 'online', repeat: 'weekly', attended: false, paid: true, homework: '№23–24 на чертежах' },
        { id: 103, day: 0, time: '19:00', dur: 60, name: 'Тимофей Г.', phone: '+7 (903) 987-65-43', service: 'Геометрия без страха', price: 1800, status: 'new', format: 'online', repeat: 'none', trial: true, attended: false, paid: false }
      ],
      clients: [
        { id: 1, name: 'Арсений Т.', phone: '+7 (916) 123-45-67', parent: 'Ольга (мама)', level: '11 класс', goal: 'ВШЭ ПМИ (ЕГЭ 85+)', visits: 14, total: 35000, note: 'Отличная алгебра, нужно закрепить планиметрию.' },
        { id: 2, name: 'Варвара С.', phone: '+7 (925) 345-67-89', parent: 'Игорь (папа)', level: '9 класс', goal: 'ОГЭ 5', visits: 8, total: 14400, note: 'Боялась геометрии, сейчас уверенно решает блок 2 части.' }
      ],
      history: [
        { name: 'Арсений Т.', service: 'ЕГЭ Профиль: 80+ под ключ', date: '3 окт', sum: 2500 }
      ],
      notifications: [
        { id: 201, type: 'new', title: 'Запись на пробное', text: 'Тимофей Г. · Геометрия без страха · сегодня 19:00', at: Date.now() - 10 * 60000, read: false }
      ]
    };
  }

  /* ---------- 3. Состояние: Репетитор по ФИЗИКЕ ---------- */
  function physicsState() {
    return {
      day: 0,
      step: 60,
      mode: 'auto',
      profile: {
        role: 'tutor-physics',
        subject: 'Физика',
        name: 'Дмитрий Николаевич Соколов',
        degree: 'МФТИ (ФОПФ), Эксперт ОГЭ и ЕГЭ',
        city: 'Москва и онлайн по всему миру',
        timezone: 'Europe/Moscow',
        experience: '11 лет'
      },
      formats: [
        { id: 'online',  name: 'Онлайн (интерактивные симуляторы PhET)' },
        { id: 'offline', name: 'Кабинет (м. Сокол, опыты и лаборатория)' },
        { id: 'student', name: 'Выезд к ученику' }
      ],
      packages: [
        { id: 'p1',  lessons: 1,  discount: 0  },
        { id: 'p4',  lessons: 4,  discount: 5  },
        { id: 'p8',  lessons: 8,  discount: 10 },
        { id: 'p12', lessons: 12, discount: 15 }
      ],
      days: defaultTutorDays(),
      notify: { push: true, telegram: false, email: false },
      services: [
        { id: 'phys-ege-80',   name: 'ЕГЭ Физика: курс на 80+', price: 2600, dur: 90, desc: 'Механика, термодинамика, электродинамика, оптика и кванты', levels: ['10–11 класс', 'ЕГЭ Физика'] },
        { id: 'phys-oge-boost',name: 'ОГЭ Физика с нуля до «5»',price: 1800, dur: 60, desc: 'Физический смысл законов, расчетные задачи и лабораторный комплект', levels: ['8–9 класс', 'ОГЭ Физика'] },
        { id: 'phys-task-21',  name: 'Качественные задачи №21', price: 1900, dur: 60, desc: 'Учимся объяснять явления словами и получать максимальные первичные баллы', levels: ['11 класс', 'Сложная часть'] },
        { id: 'phys-olympiad', name: 'Олимпиады «Росатом» / «Физтех»', price: 3200, dur: 90, desc: 'Нестандартные методы: метод размерностей, виртуальные перемещения', levels: ['9–11 класс'] },
        { id: 'phys-school-78',name: 'Физика 7–8 класс: старт без слёз', price: 1600, dur: 60, desc: 'Базовые формулы, единицы СИ, перевод величин и понятные примеры из жизни', levels: ['7–8 класс'] }
      ],
      bookings: [
        { id: 301, day: 0, time: '16:00', dur: 90, name: 'Кирилл М.', phone: '+7 (903) 111-22-33', service: 'ЕГЭ Физика: курс на 80+', price: 2600, status: 'ok', format: 'online', repeat: 'weekly', attended: false, paid: true, homework: 'Задачи 28–30 (законы сохранения)' },
        { id: 302, day: 0, time: '18:30', dur: 60, name: 'Глеб Д.',   phone: '+7 (915) 222-33-44', service: 'ОГЭ Физика с нуля до «5»', price: 1800, status: 'new', format: 'online', repeat: 'none', trial: true, attended: false, paid: false }
      ],
      clients: [
        { id: 1, name: 'Кирилл М.', phone: '+7 (903) 111-22-33', parent: 'Татьяна', level: '11 класс', goal: 'Бауманка (ИТ)', visits: 10, total: 26000, note: 'Отличная механика, подтягиваем электростатику.' }
      ],
      history: [
        { name: 'Кирилл М.', service: 'ЕГЭ Физика: курс на 80+', date: '2 окт', sum: 2600 }
      ],
      notifications: [
        { id: 401, type: 'new', title: 'Заявка на пробное занятие', text: 'Глеб Д. · ОГЭ Физика · сегодня 18:30', at: Date.now() - 15 * 60000, read: false }
      ]
    };
  }

  /* ---------- 4. Состояние: Репетитор по РУССКОМУ ЯЗЫКУ ---------- */
  function russianState() {
    return {
      day: 0,
      step: 60,
      mode: 'auto',
      profile: {
        role: 'tutor-russian',
        subject: 'Русский язык и литература',
        name: 'Анна Владимировна Морозова',
        degree: 'СПбГУ (Филологический ф-т), Эксперт проверки ЕГЭ',
        city: 'Санкт-Петербург и онлайн',
        timezone: 'Europe/Moscow',
        experience: '14 лет'
      },
      formats: [
        { id: 'online',  name: 'Онлайн (Google Документы + онлайн-проверка сочинений)' },
        { id: 'offline', name: 'Кабинет (м. Петроградская)' }
      ],
      packages: [
        { id: 'p1',  lessons: 1,  discount: 0  },
        { id: 'p4',  lessons: 4,  discount: 5  },
        { id: 'p8',  lessons: 8,  discount: 10 },
        { id: 'p12', lessons: 12, discount: 15 }
      ],
      days: defaultTutorDays(),
      notify: { push: true, telegram: false, email: false },
      services: [
        { id: 'rus-essay-max', name: 'Идеальное сочинение ЕГЭ (К1–К12)', price: 2400, dur: 90, desc: 'Анализ связи примеров-иллюстраций, позиция автора, аргументация без клише', levels: ['10–11 класс', 'Сочинение ЕГЭ'] },
        { id: 'rus-test-pro',  name: 'Тестовая часть ЕГЭ на 100 баллов', price: 1800, dur: 60, desc: 'Орфография (№9–15), пунктуация (№16–21), нормы речи (№4–8)', levels: ['10–11 класс', 'Тест ЕГЭ'] },
        { id: 'rus-december',  name: 'Итоговое декабрьское сочинение',  price: 2000, dur: 90, desc: 'Гарантированный зачёт: 5 из 5 критериев, банк универсальных аргументов', levels: ['11 класс', 'Допуск к ЕГЭ'] },
        { id: 'rus-oge-pack',  name: 'ОГЭ: Сжатое изложение + Сочинение 9.3', price: 1600, dur: 60, desc: 'Приемы сжатия текста, работа с микротемами, структура рассуждения', levels: ['8–9 класс', 'ОГЭ на «5»'] },
        { id: 'rus-literacy',  name: 'Курс тотальной грамотности',      price: 1500, dur: 60, desc: 'Понятная логика русского языка вместо механической зубрежки исключений', levels: ['6–8 класс'] }
      ],
      bookings: [
        { id: 501, day: 0, time: '16:00', dur: 90, name: 'София Л.',  phone: '+7 (926) 333-44-55', service: 'Идеальное сочинение ЕГЭ (К1–К12)', price: 2400, status: 'ok', format: 'online', repeat: 'weekly', attended: false, paid: true, homework: 'Написать сочинение по тексту Чехова' },
        { id: 502, day: 0, time: '18:00', dur: 60, name: 'Максим В.', phone: '+7 (916) 444-55-66', service: 'Тестовая часть ЕГЭ на 100 баллов', price: 1800, status: 'new', format: 'online', repeat: 'none', trial: true, attended: false, paid: false }
      ],
      clients: [
        { id: 1, name: 'София Л.', phone: '+7 (926) 333-44-55', parent: 'Мария', level: '11 класс', goal: 'МГИМО (ЕГЭ 95+)', visits: 11, total: 26400, note: 'Прекрасная речь, шлифуем логику комментария к проблеме.' }
      ],
      history: [
        { name: 'София Л.', service: 'Идеальное сочинение ЕГЭ', date: '3 окт', sum: 2400 }
      ],
      notifications: [
        { id: 601, type: 'new', title: 'Запись на тестирование', text: 'Максим В. · Тест ЕГЭ · сегодня 18:00', at: Date.now() - 25 * 60000, read: false }
      ]
    };
  }

  /* ---------- 5. Состояние: Репетитор по АНГЛИЙСКОМУ ЯЗЫКУ ---------- */
  function englishState() {
    return {
      day: 0,
      step: 60,
      mode: 'auto',
      profile: {
        role: 'tutor-english',
        subject: 'Английский язык',
        name: 'Дарья Романовна Власова',
        degree: 'МГЛУ им. Мориса Тореза, Кембриджский сертификат CELTA, IELTS 8.5',
        city: 'Москва и международный онлайн',
        timezone: 'Europe/Moscow',
        experience: '9 лет'
      },
      formats: [
        { id: 'online',  name: 'Онлайн (Zoom + Notion + живые подкасты)' },
        { id: 'offline', name: 'Кабинет (м. Маяковская, атмосфера лофта)' }
      ],
      packages: [
        { id: 'p1',  lessons: 1,  discount: 0  },
        { id: 'p4',  lessons: 4,  discount: 5  },
        { id: 'p8',  lessons: 8,  discount: 10 },
        { id: 'p12', lessons: 12, discount: 15 }
      ],
      days: defaultTutorDays(),
      notify: { push: true, telegram: false, email: false },
      services: [
        { id: 'eng-speaking',  name: 'Speaking Intensive: Разговорный барьер', price: 2200, dur: 60, desc: 'Живой современный английский, беглая речь, идиомы и акцент без страха ошибки', levels: ['A2 $\to$ B1', 'B1 $\to$ B2', 'Разговорный'] },
        { id: 'eng-ege-exam',  name: 'Подготовка к ЕГЭ по английскому',       price: 2500, dur: 90, desc: 'Эссе с графиками (№38), устная часть с таймером, аудирование и Word Formation', levels: ['10–11 класс', 'ЕГЭ 85+'] },
        { id: 'eng-ielts-prep',name: 'IELTS Academic & General (Target 7.5+)', price: 3200, dur: 90, desc: 'Стратегии Academic Writing Task 1 & 2, симуляция Speaking с подробным разбором ошибок', levels: ['B2–C1', 'IELTS / Вуз за рубежом'] },
        { id: 'eng-oge-teen',  name: 'ОГЭ по английскому на «отлично»',        price: 1800, dur: 60, desc: 'Личное письмо, монолог, чтение вслух и грамматика без зубрежки правил', levels: ['8–9 класс', 'ОГЭ Английский'] },
        { id: 'eng-general',   name: 'General English: Комплексный уровень',   price: 1900, dur: 60, desc: 'Грамматика в контексте, расширение словарного запаса, просмотр сериалов в оригинале', levels: ['A1 $\to$ B2'] }
      ],
      bookings: [
        { id: 701, day: 0, time: '17:00', dur: 60, name: 'Алиса Р.',  phone: '+7 (903) 777-11-22', service: 'Speaking Intensive: Разговорный барьер', price: 2200, status: 'ok', format: 'online', repeat: 'weekly', attended: false, paid: true, homework: 'Записать 2-минутный войс о путешествии' },
        { id: 702, day: 0, time: '19:00', dur: 90, name: 'Даниил К.', phone: '+7 (926) 888-22-33', service: 'Подготовка к ЕГЭ по английскому', price: 2500, status: 'new', format: 'online', repeat: 'none', trial: true, attended: false, paid: false }
      ],
      clients: [
        { id: 1, name: 'Алиса Р.', phone: '+7 (903) 777-11-22', parent: '', level: 'B1', goal: 'Свободно общаться в поездках и на работе', visits: 16, total: 35200, note: 'Перестала стесняться, отличный прогресс в Small Talk.' }
      ],
      history: [
        { name: 'Алиса Р.', service: 'Speaking Intensive', date: '3 окт', sum: 2200 }
      ],
      notifications: [
        { id: 801, type: 'new', title: 'Новая заявка на уровень', text: 'Даниил К. · ЕГЭ Английский · сегодня 19:00', at: Date.now() - 8 * 60000, read: false }
      ]
    };
  }

  function defaultState(role) {
    role = role || currentRole();
    switch (role) {
      case 'tutor-math':    return mathState();
      case 'tutor-physics': return physicsState();
      case 'tutor-russian': return russianState();
      case 'tutor-english': return englishState();
      case 'tutor':         return mathState();
      case 'nails':
      default:
        return nailsState();
    }
  }

  /* ---------- Серия повторяющихся занятий ---------- */
  function isSeriesFree(state, day, time, weeks) {
    for (var w = 0; w < weeks; w++) {
      if (freeSlots(state, day + w * 7).indexOf(time) === -1) return false;
    }
    return true;
  }

  /* ---------- Чтение и запись ---------- */
  function load(role) {
    role = role || currentRole();
    var key = keyFor(role);

    try {
      var raw = localStorage.getItem(key);
      if (!raw && role === 'nails') raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) return defaultState(role);

      var saved = JSON.parse(raw);
      var s = defaultState(role);
      Object.keys(saved).forEach(function (k) { s[k] = saved[k]; });
      if (!s.profile) s.profile = { role: role };
      return s;
    } catch (e) {
      return defaultState(role);
    }
  }

  function save(state, role) {
    role = role || (state.profile && state.profile.role) || currentRole();
    try { localStorage.setItem(keyFor(role), JSON.stringify(state)); } catch (e) {}
  }

  /* ---------- Даты ---------- */
  function dateByOffset(offset) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return d;
  }
  function workdayIndex(offset) { return (dateByOffset(offset).getDay() + 6) % 7; }
  function dayConfig(state, offset) { return state.days[workdayIndex(offset)]; }

  function formatDay(offset) {
    var d = dateByOffset(offset);
    var label = d.getDate() + ' ' + MONTHS[d.getMonth()];
    return offset === 0 ? 'Сегодня, ' + label : WD_SHORT[d.getDay()] + ', ' + label;
  }
  function shortDate(offset) {
    var d = dateByOffset(offset);
    return d.getDate() + ' ' + MONTHS[d.getMonth()];
  }
  function dateTimeValue(offset, time) {
    var d = dateByOffset(offset);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + time;
  }

  /* ---------- График и слоты ---------- */
  function windowsFor(state, offset) {
    var d = dayConfig(state, offset);
    if (!d || !d.active) return [];
    if (state.mode === 'manual') return (d.windows || []).slice();

    var from = d.from, to = d.to, out = [];
    if (d.bFrom && d.bTo && timeToMin(d.bFrom) > timeToMin(from)) out.push({ from: from, to: d.bFrom });
    var secondFrom = (d.bTo && timeToMin(d.bTo) > timeToMin(from)) ? d.bTo : from;
    if (timeToMin(to) > timeToMin(secondFrom)) out.push({ from: secondFrom, to: to });
    return out.length ? out : [{ from: from, to: to }];
  }

  function slotsFor(state, offset) {
    var step = state.step || 60, out = [];
    windowsFor(state, offset).forEach(function (w) {
      var start = timeToMin(w.from), end = timeToMin(w.to);
      for (var m = start; m + step <= end; m += step) out.push(minToTime(m));
    });
    return out.filter(function (t, i, a) { return a.indexOf(t) === i; });
  }

  function bookedTimes(state, offset) {
    return state.bookings
      .filter(function (b) { return b.day === offset && b.status !== 'cancelled'; })
      .map(function (b) { return b.time; });
  }

  function freeSlots(state, offset) {
    var booked = bookedTimes(state, offset);
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();
    return slotsFor(state, offset).filter(function (t) {
      if (booked.indexOf(t) !== -1) return false;
      if (offset === 0 && timeToMin(t) < nowMin + 30) return false;
      return true;
    });
  }

  /* ---------- Услуги ---------- */
  function findService(state, idOrName) {
    return state.services.find(function (s) { return s.id === idOrName; }) ||
           state.services.find(function (s) { return s.name === idOrName; }) || null;
  }

  /* ---------- Новая запись с сайта ---------- */
  function isSlotTaken(state, day, time) {
    return state.bookings.some(function (b) {
      return b.day === day && b.time === time && b.status !== 'cancelled';
    });
  }

  function addBookingFromClient(state, payload) {
    var day = payload.day | 0;
    var time = payload.time;
    var weeks = (payload.repeat === 'weekly') ? (payload.weeks || 4) : 1;

    for (var w = 0; w < weeks; w++) {
      if (isSlotTaken(state, day + w * 7, time)) return { error: 'taken' };
    }

    var svc = findService(state, payload.serviceId || payload.serviceName);
    var sName = svc ? svc.name : (payload.serviceName || 'Запись');
    var price = svc ? svc.price : (payload.price || 0);
    var dur = svc && svc.dur ? svc.dur : 60;

    var seriesId = weeks > 1 ? Date.now() : null;
    var first = null;

    for (var w2 = 0; w2 < weeks; w2++) {
      var lesson = {
        id: Date.now() + w2,
        day: day + w2 * 7,
        time: time,
        dur: dur,
        name: payload.name,
        phone: payload.phone || '—',
        service: sName,
        price: price,
        status: 'new',
        comment: payload.comment || '',
        source: payload.source || 'site',
        subjectId: svc ? svc.id : (payload.serviceId || null),
        format: payload.format || null,
        repeat: (payload.repeat === 'weekly') ? 'weekly' : 'none',
        trial: !!payload.trial,
        timezone: payload.timezone || null,
        seriesId: seriesId,
        homework: '',
        attended: false,
        paid: false
      };

      if (w2 === 0) first = lesson;
      state.bookings.push(lesson);
    }

    state.notifications.unshift({
      id: Date.now() + 100,
      type: 'new',
      title: 'Новая заявка с сайта',
      text: first.name + ' · ' + sName +
            (payload.trial ? ' · пробное' : '') +
            (weeks > 1 ? ' · серия ' + weeks + ' нед.' : '') +
            ' · ' + formatDay(day) + ' ' + time,
      at: Date.now(),
      read: false,
      bookingId: first.id
    });

    save(state);
    return first;
  }

  /* ---------- Отмена и перенос записи (для удобства клиента и мастера) ---------- */
  function cancelBooking(state, bookingId) {
    var found = state.bookings.find(function (b) { return b.id === bookingId; });
    if (!found) return false;
    found.status = 'cancelled';
    state.notifications.unshift({
      id: Date.now(),
      type: 'cancel',
      title: 'Отмена визита',
      text: found.name + ' отменил(а) запись на ' + formatDay(found.day) + ' ' + found.time,
      at: Date.now(),
      read: false
    });
    save(state);
    return true;
  }

  function rescheduleBooking(state, bookingId, newDay, newTime) {
    if (isSlotTaken(state, newDay, newTime)) return { error: 'taken' };
    var found = state.bookings.find(function (b) { return b.id === bookingId; });
    if (!found) return { error: 'not_found' };
    found.day = newDay;
    found.time = newTime;
    found.status = 'new';
    state.notifications.unshift({
      id: Date.now(),
      type: 'new',
      title: 'Перенос записи',
      text: found.name + ' перенёс(ла) запись на ' + formatDay(newDay) + ' ' + newTime,
      at: Date.now(),
      read: false
    });
    save(state);
    return { ok: true, booking: found };
  }

  global.NailsStore = {
    KEYS: KEYS,
    keyFor: keyFor,
    currentRole: currentRole,
    MONTHS: MONTHS,
    WD_SHORT: WD_SHORT,
    WD_FULL: WD_FULL,
    clone: clone, pad: pad, money: money,
    timeToMin: timeToMin, minToTime: minToTime,
    defaultState: defaultState, load: load, save: save,
    dateByOffset: dateByOffset, workdayIndex: workdayIndex,
    dayConfig: dayConfig, windowsFor: windowsFor, slotsFor: slotsFor,
    bookedTimes: bookedTimes, freeSlots: freeSlots,
    formatDay: formatDay, shortDate: shortDate, dateTimeValue: dateTimeValue,
    findService: findService, addBookingFromClient: addBookingFromClient,
    cancelBooking: cancelBooking, rescheduleBooking: rescheduleBooking,
    isSlotTaken: isSlotTaken, isSeriesFree: isSeriesFree
  };
})(window);

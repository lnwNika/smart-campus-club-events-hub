/* =========================================================
   common.js — ฟังก์ชันที่ใช้ร่วมกันทุกหน้า
   Club & Events Hub · SC17332 กลุ่มที่ 3

   แต่ละหน้าโหลด JavaScript 2 ไฟล์ ตามลำดับนี้
     common.js → ไฟล์ของหน้านั้น (เช่น index.html ใช้ home.js)
   common.js มาก่อน ไฟล์ของหน้าจึงเรียกใช้ฟังก์ชันในไฟล์นี้ได้

   แบ่งเป็น 8 ส่วน
     1) ค่าตั้งต้น              5) การ์ดกิจกรรม (ตั๋ว) + ปุ่มแชร์
     2) โหลดข้อมูล (fetch)       6) นับถอยหลัง (F6)
     3) วันและเวลา              7) แจ้งเตือน + เมนู
     4) การลงทะเบียน (localStorage) + ที่นั่ง   8) เริ่มทำงาน

   เคล็ดลับดีบัก: กด F12
     Console     → ดู error / ลองพิมพ์ formatThaiDate('2026-12-05')
     Network     → ดูว่า fetch ไฟล์ data/events.json สำเร็จไหม
     Application → Local Storage → ดู key "ceh-registrations"
   ========================================================= */


/* ---------- 1) ค่าตั้งต้น ---------- */

// ที่อยู่ของข้อมูล (relative path ไม่ขึ้นต้นด้วย / เพื่อให้ทำงานบน GitHub Pages ได้)
const DATA_URL = 'data/events.json';

// ชื่อ key ใน localStorage
// ขึ้นต้นด้วย "ceh-" (Club & Events Hub) เพราะเว็บบน GitHub Pages ของบัญชีเดียวกัน
// ทุก repo ใช้ localStorage ร่วมกัน ถ้าตั้งชื่อสั้น ๆ อาจชนกับโปรเจกต์อื่น
const STORAGE_KEY = 'ceh-registrations';

// ถ้าที่นั่งเหลือไม่เกินค่านี้ ถือว่า "ใกล้เต็ม"
const LOW_SEAT_LIMIT = 5;

// เริ่มการทำงานของหน้า
// แต่ละไฟล์ (home.js, events.js ...) เรียก registerPage() พร้อมฟังก์ชันของหน้านั้น
// ฟังก์ชันจะทำงานก็ต่อเมื่อชื่อหน้าตรงกับ <body data-page="..."> ในไฟล์ HTML
function registerPage(name, start) {
  if (document.body.dataset.page === name) {
    start();
  }
}


/* ---------- 2) โหลดข้อมูล (F1, ข้อ T7) ---------- */

// เก็บข้อมูลที่โหลดแล้วไว้ ไม่ต้อง fetch ซ้ำถ้าเรียก loadData() หลายครั้งในหน้าเดียว
let cachedData = null;

// โหลดข้อมูลชมรมและกิจกรรม คืนค่าเป็น { clubs: [...], events: [...] }
// ถ้าโหลดไม่สำเร็จจะ "โยน error" ให้ไฟล์ของหน้าจับด้วย try/catch แล้วแสดงข้อความเอง
async function loadData() {
  if (cachedData !== null) {
    return cachedData;
  }

  const response = await fetch(DATA_URL);

  // response.ok เป็น false เมื่อ status ไม่ใช่ 200–299 เช่น 404 (พิมพ์ชื่อไฟล์ผิด)
  // fetch ไม่โยน error เองในกรณีนี้ เราจึงต้องเช็กเอง
  if (!response.ok) {
    throw new Error('โหลด ' + DATA_URL + ' ไม่สำเร็จ (HTTP ' + response.status + ')');
  }

  // response.json() จะโยน error เองถ้าไฟล์ JSON เขียนผิดรูปแบบ (เช่น ลืมจุลภาค)
  const data = await response.json();

  // ตรวจโครงสร้างก่อนใช้ ถ้าไม่มี array ที่ต้องการ แปลว่าไฟล์ข้อมูลผิด
  if (!Array.isArray(data.clubs) || !Array.isArray(data.events)) {
    throw new Error('รูปแบบข้อมูลไม่ถูกต้อง: ต้องมี clubs และ events เป็น array');
  }

  cachedData = data;
  return data;
}

// หาชมรมจาก id   find() คืนสมาชิกตัวแรกที่เงื่อนไขเป็นจริง ถ้าไม่เจอคืน undefined
function findClub(clubs, clubId) {
  const club = clubs.find(function (c) {
    return c.id === clubId;
  });
  return club || { id: clubId, name: 'ไม่ระบุชมรม', type: '' };
}

// หากิจกรรมจาก id
function findEvent(events, eventId) {
  return events.find(function (e) {
    return e.id === eventId;
  });
}

// แปลงอักขระพิเศษของ HTML ก่อนใส่ใน innerHTML (กัน XSS)
// ข้อความจากไฟล์ข้อมูลหรือที่ผู้ใช้พิมพ์ ต้องผ่านฟังก์ชันนี้ก่อนประกอบเป็น HTML เสมอ
function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')   // ต้องทำ & ก่อนตัวอื่นเสมอ
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// แสดงข้อความโหลดไม่สำเร็จ + ปุ่มลองอีกครั้ง (ข้อ T7: จัดการกรณีโหลดไม่สำเร็จ)
//   container = element ที่จะใส่ข้อความ
//   retry     = ฟังก์ชันที่จะเรียกเมื่อกด "ลองอีกครั้ง"
function showLoadError(container, retry) {
  container.setAttribute('aria-busy', 'false');

  // ดับเบิลคลิกเปิดไฟล์ตรง ๆ (URL ขึ้นต้นด้วย file:///) เบราว์เซอร์ไม่ยอมให้ fetch ไฟล์ในเครื่อง
  // กด "ลองอีกครั้ง" กี่ครั้งก็ไม่สำเร็จ จึงบอกวิธีเปิดที่ถูกแทน
  if (window.location.protocol === 'file:') {
    container.innerHTML =
      '<p class="grid-message">เปิดไฟล์ตรง ๆ แล้วโหลดข้อมูลไม่ได้ ' +
      'ให้เปิดผ่าน Live Server ใน VS Code (คลิกขวาที่ index.html → Open with Live Server)</p>';
    return;
  }

  container.innerHTML =
    '<p class="grid-message">โหลดข้อมูลกิจกรรมไม่สำเร็จ ตรวจการเชื่อมต่ออินเทอร์เน็ตแล้ว ' +
    '<button type="button" class="link-btn">ลองอีกครั้ง</button></p>';

  container.querySelector('.link-btn').addEventListener('click', function () {
    cachedData = null;          // ล้างข้อมูลเก่าเพื่อให้ fetch ใหม่จริง
    retry();
  });
}


/* ---------- 3) วันและเวลา ---------- */
// ข้อมูลเก็บวันที่แบบ "2026-12-05" และเวลาแบบ "13:00"
// new Date('2026-12-05T13:00') = เวลาท้องถิ่นของเครื่องผู้ใช้ (ไทยคือ UTC+7)

// ข้อมูลจริงบางกิจกรรมไม่ระบุเวลา (start/end เป็น null) หรือจัดหลายวัน (มี endDate)
//   ไม่ระบุเวลาเริ่ม   → ถือว่าเริ่ม 00:00 ของวันนั้น (ใช้เรียงลำดับ)
//   ไม่ระบุเวลาจบ     → ถือว่าจบ 23:59 ของวันสุดท้าย (ใช้ตัดสินว่าผ่านไปแล้วหรือยัง)
//   || = ถ้าค่าซ้ายเป็น null/ว่าง ให้ใช้ค่าขวาแทน
function getStart(event) {
  return new Date(event.date + 'T' + (event.start || '00:00'));
}

function getEnd(event) {
  const lastDay = event.endDate || event.date;
  return new Date(lastDay + 'T' + (event.end || '23:59'));
}

// จบแล้วหรือยัง = เวลาสิ้นสุดผ่านไปแล้ว (กิจกรรมที่กำลังจัดอยู่ยังไม่นับว่าจบ)
function isPast(event) {
  return getEnd(event) < new Date();
}

// เริ่มไปแล้วหรือยัง (ใช้ตอนลงทะเบียน: เริ่มแล้วลงไม่ได้)
function hasStarted(event) {
  return getStart(event) <= new Date();
}

// เรียงกิจกรรมตามเวลาเริ่ม น้อยไปมาก (F2)
// sort() เปลี่ยน array เดิม จึงใช้ slice() ทำสำเนาก่อน ข้อมูลต้นฉบับจะไม่ถูกแก้
// a - b ของ Date ได้ผลต่างเป็นมิลลิวินาที: ติดลบ = a มาก่อน
function sortByStart(events) {
  return events.slice().sort(function (a, b) {
    return getStart(a) - getStart(b);
  });
}

// "2026-12-05" → "ส. 5 ธ.ค. 2569"   (toLocaleDateString ภาษาไทยใช้ปี พ.ศ. ให้เอง)
function formatThaiDate(dateText) {
  const date = new Date(dateText + 'T00:00');
  return date.toLocaleDateString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// วันที่ของกิจกรรม: วันเดียว → "ส. 5 ธ.ค. 2569"   หลายวัน → "จ. 23 ก.พ. 2569 – พ. 25 ก.พ. 2569"
function formatEventDate(event) {
  if (event.endDate && event.endDate !== event.date) {
    return formatThaiDate(event.date) + ' – ' + formatThaiDate(event.endDate);
  }
  return formatThaiDate(event.date);
}

// "13:00", "16:00" → "13:00–16:00 น."   มีแค่เวลาเริ่ม → "เริ่ม 17:00 น."   ไม่มีเลย → "ไม่ระบุเวลา"
function formatTimeRange(event) {
  if (!event.start) {
    return 'ไม่ระบุเวลา';
  }
  if (!event.end) {
    return 'เริ่ม ' + event.start + ' น.';
  }
  return event.start + '–' + event.end + ' น.';
}

// มีจำนวนที่นั่งในข้อมูลไหม (โพสต์ส่วนใหญ่ไม่ได้บอก → capacity เป็น null)
function hasSeatLimit(event) {
  return typeof event.capacity === 'number';
}

// ส่วนประกอบของต้นขั้วตั๋ว: { day: 5, month: 'ธ.ค.', weekday: 'ส.' }
function getStubParts(dateText) {
  const date = new Date(dateText + 'T00:00');
  return {
    day: date.getDate(),
    month: date.toLocaleDateString('th-TH', { month: 'short' }),
    weekday: date.toLocaleDateString('th-TH', { weekday: 'short' }),
    year: String(date.getFullYear() + 543).slice(2)    // ปี พ.ศ. 2 หลักท้าย เช่น 2569 → "69"
  };
}


/* ---------- 4) การลงทะเบียน (localStorage) + ที่นั่ง (F4, F5) ---------- */
// localStorage เก็บได้แค่ "ข้อความ" จึงแปลงด้วย JSON.stringify ก่อนบันทึก และ JSON.parse หลังอ่าน
// ข้อมูลที่เก็บเป็น array ของการลงทะเบียน เช่น
//   [ { eventId: 'e006', fullName: '...', studentId: '6612345678',
//       email: '...', faculty: '...', registeredAt: '2026-11-06T08:30:00.000Z' } ]

// อ่านรายการลงทะเบียน (ได้ array เสมอ ถ้าไม่มีหรือข้อมูลเสียจะได้ [])
function readRegistrations() {
  const text = localStorage.getItem(STORAGE_KEY);
  if (text === null) {
    return [];
  }

  let saved;
  try {
    saved = JSON.parse(text);
  } catch (error) {
    return [];                  // ข้อความไม่ใช่ JSON ที่ถูกต้อง
  }

  if (!Array.isArray(saved)) {
    return [];
  }

  // เก็บเฉพาะรายการที่มี eventId และ studentId เป็นข้อความ (กันข้อมูลรูปแบบอื่นปนมา)
  return saved.filter(function (reg) {
    return reg !== null &&
      typeof reg === 'object' &&
      typeof reg.eventId === 'string' &&
      typeof reg.studentId === 'string';
  });
}

function saveRegistrations(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// จำนวนการลงทะเบียนในเบราว์เซอร์นี้ของกิจกรรมหนึ่ง
function countMyRegistrations(eventId) {
  return readRegistrations().filter(function (reg) {
    return reg.eventId === eventId;
  }).length;
}

// ที่นั่งคงเหลือ = ความจุ − จำนวนที่ลงทะเบียนแล้วตามข้อมูลของชมรม − ที่ลงจากเบราว์เซอร์นี้
// หมายเหตุ: localStorage อยู่ในเครื่องผู้ใช้แต่ละคน ไม่มีเซิร์ฟเวอร์กลาง
// การนับที่นั่งจึงเป็นการ "จำลอง" จากมุมมองของเบราว์เซอร์นี้
// Math.max(0, ...) กันไม่ให้ติดลบ
//   ไม่ระบุจำนวนที่นั่ง → คืน null (ไม่จำกัด ลงทะเบียนได้เสมอ)
function seatsLeft(event) {
  if (!hasSeatLimit(event)) {
    return null;
  }
  return Math.max(0, event.capacity - (event.registered || 0) - countMyRegistrations(event.id));
}

// ข้อความที่นั่งคงเหลือ ใช้ทั้งการ์ดและหน้าลงทะเบียน
function seatText(event) {
  const left = seatsLeft(event);
  if (left === null) {
    return 'ไม่ระบุจำนวนที่นั่ง';
  }
  if (left === 0) {
    return 'ที่นั่งเต็มแล้ว (' + event.capacity + ' ที่นั่ง)';
  }
  let text = 'เหลือ ' + left + ' ที่นั่ง จาก ' + event.capacity;
  if (left <= LOW_SEAT_LIMIT) {
    text += ' ใกล้เต็มแล้ว';
  }
  return text;
}


/* ---------- 5) การ์ดกิจกรรม (ตั๋ว) + ปุ่มแชร์ ---------- */

// สร้าง HTML ของการ์ดกิจกรรม 1 ใบ
//   event   = ข้อมูลกิจกรรม 1 รายการ
//   club    = ชมรมเจ้าของกิจกรรม
//   options = ตัวเลือกเพิ่มเติม (ไม่ส่งมาก็ได้)
//     headingLevel: ระดับหัวข้อชื่อกิจกรรม (ค่าเริ่มต้น 3 = <h3>)
//     extraInfo:    HTML เพิ่มใต้รายละเอียด
//     extraActions: HTML ปุ่มเพิ่มเติม
//     hideRegister: true = ไม่แสดงปุ่มลงทะเบียน
function createTicket(event, club, options) {
  options = options || {};
  const past = isPast(event);
  const left = seatsLeft(event);
  const used = event.capacity - left;
  const stub = getStubParts(event.date);
  const title = escapeHtml(event.title);

  // class เพิ่มเติมของการ์ด: จบแล้ว / ที่นั่งใกล้เต็ม
  let classes = 'ticket';
  if (past) {
    classes += ' is-past';
  } else if (left !== null && left <= LOW_SEAT_LIMIT) {
    classes += ' is-low';
  }

  // ป้ายเหนือชื่อกิจกรรม: ประเภท + ชั่วโมงกิจกรรม + ชั่วโมงกยศ. + สถานะ
  let tags = '<span class="chip">' + escapeHtml(event.type) + '</span>';
  if (event.activityHours > 0) {
    tags += '<span class="chip chip-hours">นับ ' + event.activityHours + ' ชั่วโมงกิจกรรม</span>';
  }
  if (event.loanHours === true) {
    tags += '<span class="chip chip-hours">กิจกรรมที่ได้ชั่วโมงกยศ.</span>';
  }
  if (past) {
    tags += '<span class="chip chip-status">จบแล้ว</span>';
  } else if (left === 0) {
    tags += '<span class="chip chip-full">เต็ม</span>';
  }

  // รูปโปสเตอร์ (ถ้ามี) alt ต้องบรรยายว่าในรูปมีอะไร (ข้อ T3)
  let poster = '';
  if (event.poster) {
    poster = '<img class="ticket-poster" src="' + escapeHtml(event.poster) + '" alt="' +
      escapeHtml(event.posterAlt || 'โปสเตอร์กิจกรรม ' + event.title) + '" loading="lazy">';
  }

  // ส่วนที่นั่ง แสดงเฉพาะกิจกรรมที่ยังไม่จบ
  // ความกว้างแถบเก็บไว้ใน data-percent แล้วให้ applySeatBars() ตั้งค่าทีหลัง
  // (ข้อ T4 ห้าม inline style ยกเว้นค่าที่ JS คำนวณ)
  let seats = '';
  if (!past && left === null) {
    seats = '<p class="seat-text">' + seatText(event) + '</p>';
  } else if (!past) {
    const percent = Math.round(used / event.capacity * 100);
    seats = `
      <div class="seats">
        <div class="seat-bar" aria-hidden="true"><div class="seat-fill" data-percent="${percent}"></div></div>
        <p class="seat-text">${seatText(event)}</p>
      </div>`;
  }

  // ปุ่ม: ลงทะเบียน (ถ้ายังไม่เริ่มและไม่เต็ม) + แชร์
  // span.visually-hidden เพิ่มชื่อกิจกรรมให้โปรแกรมอ่านหน้าจอ ลิงก์ "ลงทะเบียน" แต่ละอันจะไม่ซ้ำกัน
  // options.hideRegister = true ใช้ในหน้ากิจกรรมของฉัน (ลงทะเบียนไว้แล้ว ไม่ต้องมีปุ่มนี้)
  let actions = '';
  if (!options.hideRegister && !hasStarted(event) && left !== 0) {
    actions += '<a class="btn btn-primary btn-small" href="register.html?event=' + encodeURIComponent(event.id) + '">' +
      'ลงทะเบียน<span class="visually-hidden"> ' + title + '</span></a>';
  }
  actions += '<button type="button" class="btn btn-ghost btn-small share-btn" data-id="' + escapeHtml(event.id) + '">' +
    'แชร์<span class="visually-hidden"> ' + title + '</span></button>';
  if (options.extraActions) {
    actions += options.extraActions;
  }

  const h = 'h' + (options.headingLevel || 3);

  // aria-hidden="true" ที่ต้นขั้ว: วันที่เต็มอ่านจาก <dl> ด้านล่างอยู่แล้ว ไม่ต้องอ่านซ้ำ
  // tabindex="-1" ทำให้ JS ย้ายโฟกัสมาที่การ์ดได้ (ตอนกดลิงก์แชร์หรือกดจากปฏิทิน)
  return `
    <article class="${classes}" id="event-${escapeHtml(event.id)}" data-type="${escapeHtml(event.type)}" tabindex="-1">
      <div class="ticket-stub" aria-hidden="true">
        <span class="stub-month">${stub.month}</span>
        <span class="stub-day">${stub.day}</span>
        <span class="stub-weekday">${stub.weekday} ${stub.year}</span>
      </div>
      <div class="ticket-body">
        ${poster}
        <div class="ticket-tags">${tags}</div>
        <${h}>${title}</${h}>
        <p class="ticket-club">${escapeHtml(club.name)}${event.organizer ? '<br>จัดโดย ' + escapeHtml(event.organizer) : ''}</p>
        <dl class="ticket-meta">
          <div><dt>วันที่</dt><dd><time datetime="${escapeHtml(event.date)}">${formatEventDate(event)}</time></dd></div>
          <div><dt>เวลา</dt><dd>${formatTimeRange(event)}</dd></div>
          <div><dt>สถานที่</dt><dd>${escapeHtml(event.place || 'ไม่ระบุสถานที่')}</dd></div>
        </dl>
        ${options.extraInfo || ''}
        ${seats}
        <div class="ticket-actions">${actions}</div>
      </div>
    </article>`;
}

// ตั้งความกว้างแถบที่นั่งของทุกการ์ดใน container (ต้องเรียกหลังใส่ innerHTML)
function applySeatBars(container) {
  const fills = container.querySelectorAll('.seat-fill');
  for (const fill of fills) {
    fill.style.width = fill.dataset.percent + '%';
  }
}

// ปุ่มแชร์ (ฟีเจอร์เสริม): คัดลอกลิงก์กิจกรรมด้วย Clipboard API
// ใช้ "event delegation": ผูก listener ไว้ที่กล่องแม่ตัวเดียว แทนการผูกทุกปุ่ม
// ข้อดี: การ์ดที่สร้างใหม่ทีหลัง (เช่น ตอนกรอง) ใช้ได้ทันทีโดยไม่ต้องผูกซ้ำ
function enableShareButtons(container) {
  container.addEventListener('click', function (e) {
    // closest() หา element ที่ตรง selector จากตัวที่ถูกคลิกขึ้นไปหาแม่
    // (คลิกโดน <span> ในปุ่มก็ยังหาปุ่มเจอ)
    const button = e.target.closest('.share-btn');
    if (button === null) {
      return;                   // ไม่ได้คลิกปุ่มแชร์
    }
    shareEvent(button.dataset.id);
  });
}

async function shareEvent(eventId) {
  // new URL(ที่อยู่, ฐาน) สร้างลิงก์เต็มจาก relative path เช่น
  //   https://user.github.io/smart-campus-club-events-hub/events.html#event-e006
  const link = new URL('events.html#event-' + eventId, window.location.href).href;

  try {
    // navigator.clipboard ใช้ได้เฉพาะ https หรือ localhost
    await navigator.clipboard.writeText(link);
    showNotice('คัดลอกลิงก์กิจกรรมแล้ว');
  } catch (error) {
    // เปิดไฟล์ตรง ๆ (file://) หรือเบราว์เซอร์ไม่อนุญาต → ให้ผู้ใช้คัดลอกเอง
    window.prompt('คัดลอกลิงก์นี้เพื่อแชร์กิจกรรม', link);
  }
}


/* ---------- 6) นับถอยหลัง (F6) ---------- */

// เก็บหมายเลขของ setInterval ไว้ เพื่อหยุดตัวเก่าก่อนเริ่มตัวใหม่ (ไม่อย่างนั้นจะนับซ้อนกันหลายตัว)
let countdownTimer = null;

// แยกมิลลิวินาทีเป็น วัน ชั่วโมง นาที
//   1 วัน = 86,400,000 ms, 1 ชั่วโมง = 3,600,000 ms, 1 นาที = 60,000 ms
//   Math.floor ปัดลง   % (modulo) = เศษที่เหลือหลังหาร
function splitTime(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  return {
    days: Math.floor(totalMinutes / (60 * 24)),
    hours: Math.floor(totalMinutes / 60) % 24,
    minutes: totalMinutes % 60
  };
}

// เติม 0 ข้างหน้าให้ครบ 2 หลัก: 5 → "05"
function pad2(number) {
  return String(number).padStart(2, '0');
}

// แสดงกล่องนับถอยหลังถึงกิจกรรม event ใน box แล้วอัปเดตทุก 1 วินาที
function renderCountdown(box, event, club) {
  box.innerHTML = `
    <p class="countdown-title"><a href="events.html#event-${escapeHtml(event.id)}">${escapeHtml(event.title)}</a></p>
    <p class="countdown-when">${formatEventDate(event)} ${formatTimeRange(event)}<br>${escapeHtml(event.place || 'ไม่ระบุสถานที่')}</p>
    <div class="timer" role="timer" aria-label="เวลาที่เหลือก่อนเริ่มกิจกรรม">
      <div class="timer-part"><span class="timer-num" data-part="days">0</span><span class="timer-unit">วัน</span></div>
      <div class="timer-part"><span class="timer-num" data-part="hours">00</span><span class="timer-unit">ชั่วโมง</span></div>
      <div class="timer-part"><span class="timer-num" data-part="minutes">00</span><span class="timer-unit">นาที</span></div>
    </div>
    <p class="countdown-status visually-hidden" data-part="status"></p>`;
  box.setAttribute('aria-busy', 'false');

  const daysEl = box.querySelector('[data-part="days"]');
  const hoursEl = box.querySelector('[data-part="hours"]');
  const minutesEl = box.querySelector('[data-part="minutes"]');
  const statusEl = box.querySelector('[data-part="status"]');
  const start = getStart(event);

  // ฟังก์ชันอัปเดตตัวเลข 1 ครั้ง
  function tick() {
    const remaining = start - new Date();     // มิลลิวินาทีที่เหลือ

    if (remaining <= 0) {
      clearInterval(countdownTimer);           // ถึงเวลาแล้ว หยุดนับ
      daysEl.textContent = '0';
      hoursEl.textContent = '00';
      minutesEl.textContent = '00';
      statusEl.textContent = 'กิจกรรมเริ่มแล้ว';
      statusEl.classList.remove('visually-hidden');
      return;
    }

    const t = splitTime(remaining);
    daysEl.textContent = t.days;
    hoursEl.textContent = pad2(t.hours);
    minutesEl.textContent = pad2(t.minutes);
    // ข้อความเต็มสำหรับโปรแกรมอ่านหน้าจอ (role="timer" ไม่อ่านอัตโนมัติทุกวินาที จึงไม่รบกวน)
    statusEl.textContent = 'เหลืออีก ' + t.days + ' วัน ' + t.hours + ' ชั่วโมง ' + t.minutes + ' นาที';
  }

  clearInterval(countdownTimer);   // หยุดตัวเก่า (ถ้ามี)
  tick();                          // แสดงค่าแรกทันที ไม่ต้องรอ 1 วินาที
  // setInterval(ฟังก์ชัน, ms) = เรียกฟังก์ชันซ้ำทุก ๆ ms ที่กำหนด
  // อัปเดตทุก 1 วินาที เพื่อให้หลักนาทีเปลี่ยนตรงเวลา
  countdownTimer = setInterval(tick, 1000);
}

// แสดงข้อความแทนการนับถอยหลัง (เช่น ไม่มีกิจกรรมที่กำลังจะมาถึง)
function renderCountdownEmpty(box, html) {
  clearInterval(countdownTimer);
  box.innerHTML = '<p class="countdown-status">' + html + '</p>';
  box.setAttribute('aria-busy', 'false');
}


/* ---------- 7) แจ้งเตือน + เมนู ---------- */

let noticeTimer = null;

// แสดงข้อความมุมล่าง 2.5 วินาที (textContent ไม่ตีความ HTML จึงปลอดภัย)
function showNotice(message) {
  const notice = document.querySelector('#notice');
  if (notice === null) {
    return;
  }
  notice.textContent = message;
  notice.classList.add('show');

  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(function () {
    notice.classList.remove('show');
  }, 2500);
}

// ตัวเลขบนเมนู "กิจกรรมของฉัน" = จำนวนการลงทะเบียนในเบราว์เซอร์นี้
function updateNavBadge() {
  const badge = document.querySelector('#my-count');
  if (badge === null) {
    return;
  }
  const count = readRegistrations().length;
  badge.textContent = count;
  badge.hidden = (count === 0);
  // ไม่ใส่ aria-label ที่ <span> เพราะ ARIA ไม่อนุญาตให้ตั้งชื่อ element ที่ไม่มี role
  // โปรแกรมอ่านหน้าจอจะอ่านลิงก์ทั้งก้อนว่า "กิจกรรมของฉัน 3" ซึ่งเข้าใจได้อยู่แล้ว
}


/* ---------- 8) เริ่มทำงาน ---------- */
// <script> อยู่ท้าย <body> เมนูจึงโหลดเสร็จแล้ว แสดงตัวเลขบนเมนูได้ทันทีทุกหน้า
updateNavBadge();

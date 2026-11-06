/* =========================================================
   register.js — ฟอร์มลงทะเบียน (register.html)
   F4 ฟอร์ม + validation, F5 ที่นั่งคงเหลือ + บันทึกลง localStorage

   แบ่งเป็น 6 ส่วน
     1) หา element + ข้อความแจ้งข้อผิดพลาด   4) สรุปกิจกรรมที่เลือก
     2) ตรวจข้อมูลทีละช่อง                  5) ส่งฟอร์ม
     3) เติมรายการกิจกรรมใน <select>        6) เริ่มทำงาน
   ========================================================= */

// ทั้งไฟล์อยู่ในฟังก์ชันเดียวที่ลงทะเบียนไว้กับ registerPage()
//   router.js เรียกฟังก์ชันนี้ทุกครั้งที่เปิดหน้านี้ (ทั้งเปิดครั้งแรกและกดเมนูมาจากหน้าอื่น)
//   ตัวแปร const/let ข้างในจึงเริ่มใหม่ทุกครั้ง และไม่ชนกับชื่อเดียวกันในไฟล์ของหน้าอื่น
registerPage('register', function () {

  /* ---------- 1) หา element + ข้อความแจ้งข้อผิดพลาด ---------- */
  const form = document.querySelector('#register-form');
  const eventSelect = document.querySelector('#event');
  const nameInput = document.querySelector('#full-name');
  const idInput = document.querySelector('#student-id');
  const emailInput = document.querySelector('#email');
  const facultySelect = document.querySelector('#faculty');
  const acceptBox = document.querySelector('#accept');
  const formAlert = document.querySelector('#form-alert');
  const formSuccess = document.querySelector('#form-success');
  const summaryBox = document.querySelector('#event-summary');

  // ช่องทั้งหมดที่ต้องตรวจ เรียงตามลำดับบนหน้าจอ (ใช้หาช่องแรกที่ผิดเพื่อย้ายโฟกัสไป)
  const fields = [eventSelect, nameInput, idInput, emailInput, facultySelect, acceptBox];

  // ข้อความแจ้งข้อผิดพลาดภาษาไทย แยกตาม id ของช่อง และชนิดของปัญหา
  // ชื่อชนิดปัญหา (valueMissing, patternMismatch ...) มาจาก input.validity ของ HTML
  const MESSAGES = {
    'event': {
      valueMissing: 'เลือกกิจกรรมที่ต้องการลงทะเบียน'
    },
    'full-name': {
      valueMissing: 'กรอกชื่อและนามสกุล',
      tooShort: 'ชื่อ–สกุลสั้นเกินไป'
    },
    'student-id': {
      valueMissing: 'กรอกรหัสนักศึกษา',
      // ใช้ข้อความ hint ใต้ช่อง เพื่อให้แก้รูปแบบรหัสที่ register.html ที่เดียว
      patternMismatch: 'รหัสนักศึกษาไม่ถูกรูปแบบ: ' + document.querySelector('#student-id-hint').textContent
    },
    'email': {
      valueMissing: 'กรอกอีเมล',
      typeMismatch: 'อีเมลไม่ถูกรูปแบบ ตัวอย่างที่ถูก: name@example.com'
    },
    'faculty': {
      valueMissing: 'เลือกคณะ'
    },
    'accept': {
      valueMissing: 'ต้องยินยอมตามเงื่อนไขก่อนลงทะเบียน'
    }
  };

  let allClubs = [];
  let allEvents = [];


  /* ---------- 2) ตรวจข้อมูลทีละช่อง ---------- */

  // คืนข้อความผิดพลาดของช่อง ถ้าถูกต้องคืน '' (ข้อความว่าง)
  function getErrorMessage(input) {
    const messages = MESSAGES[input.id];
    const v = input.validity;      // ผลการตรวจของ HTML (required, pattern, type, minlength)

    // ชั้นที่ 1: กฎจาก attribute ใน HTML
    if (v.valueMissing) return messages.valueMissing;
    if (v.tooShort) return messages.tooShort;
    if (v.patternMismatch) return messages.patternMismatch;
    if (v.typeMismatch) return messages.typeMismatch;

    // ชั้นที่ 2: กฎที่ HTML ทำเองไม่ได้
    if (input === nameInput && !input.value.trim().includes(' ')) {
      return 'กรอกทั้งชื่อและนามสกุล โดยเว้นวรรคระหว่างกัน';
    }

    if (input === eventSelect) {
      const event = findEvent(allEvents, input.value);
      if (event === undefined) {
        return 'ไม่พบกิจกรรมที่เลือก';
      }
      if (hasStarted(event)) {
        return 'กิจกรรมนี้เริ่มไปแล้ว ลงทะเบียนไม่ได้';
      }
      if (seatsLeft(event) === 0) {
        return 'กิจกรรมนี้ที่นั่งเต็มแล้ว';               // ห้ามเกินจำนวนที่นั่ง (F4)
      }
    }

    // ห้ามลงทะเบียนซ้ำ: รหัสนักศึกษาเดียวกันลงกิจกรรมเดียวกันได้ครั้งเดียว (F4)
    if (input === idInput && eventSelect.value !== '') {
      const duplicate = readRegistrations().some(function (reg) {
        return reg.eventId === eventSelect.value && reg.studentId === idInput.value.trim();
      });
      if (duplicate) {
        return 'รหัสนักศึกษานี้ลงทะเบียนกิจกรรมนี้ไว้แล้ว ดูได้ที่หน้ากิจกรรมของฉัน';
      }
    }

    return '';
  }

  // ตรวจ 1 ช่องแล้วแสดงผล คืน true ถ้าถูกต้อง
  function validateField(input) {
    const message = getErrorMessage(input);
    const errorEl = document.querySelector('#' + input.id + '-error');

    errorEl.textContent = message;
    // aria-invalid บอกโปรแกรมอ่านหน้าจอว่าช่องนี้ผิด และ CSS ใช้ทำขอบแดง
    if (message === '') {
      input.removeAttribute('aria-invalid');
    } else {
      input.setAttribute('aria-invalid', 'true');
    }
    return message === '';
  }

  // ตรวจเมื่อออกจากช่องหรือเปลี่ยนค่าเสร็จ (event "change")
  // ไม่ตรวจทุกตัวอักษรที่พิมพ์ เพราะจะขึ้นสีแดงตั้งแต่ผู้ใช้ยังพิมพ์ไม่เสร็จ
  for (const input of fields) {
    input.addEventListener('change', function () {
      validateField(this);
    });

    // ถ้าช่องนั้นแดงอยู่แล้ว ให้ตรวจใหม่ระหว่างพิมพ์ เพื่อให้สีแดงหายทันทีที่แก้ถูก
    input.addEventListener('input', function () {
      if (this.getAttribute('aria-invalid') === 'true') {
        validateField(this);
      }
    });
  }


  /* ---------- 3) เติมรายการกิจกรรมใน <select> ---------- */

  function fillEventOptions(selectedId) {
    // กิจกรรมที่ยังไม่เริ่ม เรียงตามวันที่
    const open = sortByStart(allEvents).filter(function (e) {
      return !hasStarted(e);
    });

    eventSelect.innerHTML = '';
    eventSelect.add(new Option(open.length > 0 ? 'เลือกกิจกรรม' : 'ยังไม่มีกิจกรรมที่เปิดลงทะเบียน', ''));

    for (const e of open) {
      const stub = getStubParts(e.date);
      const left = seatsLeft(e);
      const status = left === 0 ? 'เต็มแล้ว' : 'เหลือ ' + left + ' ที่';
      const option = new Option(stub.day + ' ' + stub.month + ' — ' + e.title + ' (' + status + ')', e.id);
      option.disabled = (left === 0);       // ที่นั่งเต็ม เลือกไม่ได้
      eventSelect.add(option);
    }

    if (selectedId) {
      eventSelect.value = selectedId;
    }
  }


  /* ---------- 4) สรุปกิจกรรมที่เลือก (F5 ที่นั่งคงเหลือ) ---------- */

  function renderSummary() {
    const event = findEvent(allEvents, eventSelect.value);

    if (event === undefined) {
      summaryBox.innerHTML = '<p class="muted">เลือกกิจกรรมเพื่อดูรายละเอียดและที่นั่งคงเหลือ</p>';
      return;
    }

    const club = findClub(allClubs, event.clubId);
    const left = seatsLeft(event);
    const hours = event.activityHours > 0
      ? '<span class="chip chip-hours">นับ ' + event.activityHours + ' ชั่วโมงกิจกรรม</span>'
      : '<span class="chip chip-status">ไม่นับชั่วโมงกิจกรรม</span>';

    summaryBox.innerHTML = `
      <div class="summary-body" data-type="${escapeHtml(event.type)}">
        <div class="ticket-tags"><span class="chip">${escapeHtml(event.type)}</span>${hours}</div>
        <p class="summary-title">${escapeHtml(event.title)}</p>
        <p class="ticket-club">${escapeHtml(club.name)}</p>
        <dl class="ticket-meta">
          <div><dt>วันที่</dt><dd>${formatThaiDate(event.date)}</dd></div>
          <div><dt>เวลา</dt><dd>${formatTimeRange(event)}</dd></div>
          <div><dt>สถานที่</dt><dd>${escapeHtml(event.place)}</dd></div>
        </dl>
        <p class="summary-desc">${escapeHtml(event.description || '')}</p>
        <div>
          <p class="seat-big">${left}</p>
          <p>${seatText(event)}</p>
        </div>
      </div>`;
  }

  eventSelect.addEventListener('change', function () {
    renderSummary();
    // เปลี่ยนกิจกรรมแล้ว ตรวจรหัสซ้ำใหม่ (ถ้ากรอกรหัสไว้แล้ว)
    if (idInput.value !== '') {
      validateField(idInput);
    }
  });


  /* ---------- 5) ส่งฟอร์ม ---------- */

  form.addEventListener('submit', function (e) {
    e.preventDefault();             // ไม่ส่งฟอร์มไปไหน JavaScript จัดการเอง
    formSuccess.hidden = true;

    // ตรวจทุกช่อง เก็บช่องที่ผิดไว้
    const invalid = [];
    for (const input of fields) {
      if (!validateField(input)) {
        invalid.push(input);
      }
    }

    if (invalid.length > 0) {
      formAlert.textContent = 'ยังลงทะเบียนไม่ได้ มี ' + invalid.length + ' ช่องที่ต้องแก้ไข';
      formAlert.hidden = false;
      invalid[0].focus();           // ย้ายโฟกัสไปช่องแรกที่ผิด
      return;
    }
    formAlert.hidden = true;

    // ผ่านทุกเงื่อนไข → บันทึก (อ่าน → เพิ่ม → บันทึก)
    const event = findEvent(allEvents, eventSelect.value);
    const list = readRegistrations();
    list.push({
      eventId: event.id,
      fullName: nameInput.value.trim(),
      studentId: idInput.value.trim(),
      email: emailInput.value.trim().toLowerCase(),
      faculty: facultySelect.value,
      registeredAt: new Date().toISOString()
    });
    saveRegistrations(list);
    updateNavBadge();

    // แจ้งผล แล้วย้ายโฟกัสไปที่กล่องแจ้งผล (โปรแกรมอ่านหน้าจออ่านทันที)
    formSuccess.innerHTML = `
      <h3>ลงทะเบียนสำเร็จ</h3>
      <p>ลงทะเบียน "${escapeHtml(event.title)}" แล้ว วัน${formatThaiDate(event.date)} เวลา ${formatTimeRange(event)}</p>
      <a class="btn btn-primary btn-small" href="my-events.html">ดูกิจกรรมของฉัน</a>`;
    formSuccess.hidden = false;
    formSuccess.focus();
    showNotice('ลงทะเบียนสำเร็จ');

    // ล้างฟอร์ม แล้วสร้างรายการกิจกรรมใหม่ (ที่นั่งคงเหลือเปลี่ยนแล้ว)
    form.reset();
    fillEventOptions(event.id);
    renderSummary();
  });


  /* ---------- 6) เริ่มทำงาน ---------- */

  async function initRegister() {
    try {
      const data = await loadData();
      allClubs = data.clubs;
      allEvents = data.events;

      // register.html?event=e006 → เลือกกิจกรรมให้ล่วงหน้า
      const params = new URLSearchParams(window.location.search);
      const wanted = params.get('event');
      fillEventOptions(wanted);

      // กิจกรรมใน URL เลือกไม่ได้ (เริ่มแล้ว/เต็ม/ไม่มีอยู่จริง) → แจ้งให้รู้
      if (wanted && eventSelect.value !== wanted) {
        showNotice('กิจกรรมที่เลือกมาปิดรับลงทะเบียนแล้ว เลือกกิจกรรมอื่นได้');
      }
      renderSummary();
    } catch (error) {
      console.error(error);
      eventSelect.innerHTML = '<option value="">โหลดรายการกิจกรรมไม่สำเร็จ</option>';
      showLoadError(summaryBox, initRegister);
    }
  }

  initRegister();

});

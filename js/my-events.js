/* =========================================================
   my-events.js — หน้ากิจกรรมของฉัน (my-events.html)
   F5 รายการจาก localStorage + ยกเลิก (ถามยืนยันก่อน)
   F6 นับถอยหลังถึงกิจกรรมถัดไปของฉัน
   ฟีเจอร์เสริม: สรุปชั่วโมงกิจกรรมสะสม
   ========================================================= */

// ทั้งไฟล์อยู่ในฟังก์ชันเดียวที่ลงทะเบียนไว้กับ registerPage()
//   ฟังก์ชันนี้ทำงานเมื่อเปิดหน้านี้ (ดู registerPage() ใน common.js)
//   ตัวแปร const/let ข้างในจึงเริ่มใหม่ทุกครั้ง และไม่ชนกับชื่อเดียวกันในไฟล์ของหน้าอื่น
registerPage('my-events', function () {

  const countdownBox = document.querySelector('#countdown-box');
  const upcomingList = document.querySelector('#my-upcoming');
  const pastList = document.querySelector('#my-past');

  let allClubs = [];
  let allEvents = [];


  // จับคู่การลงทะเบียนกับรายละเอียดกิจกรรม
  // คืน array ของ { reg, event } เฉพาะรายการที่ยังมีกิจกรรมนั้นอยู่ในข้อมูล
  function getMyItems() {
    const items = [];
    for (const reg of readRegistrations()) {
      const event = findEvent(allEvents, reg.eventId);
      if (event !== undefined) {
        items.push({ reg: reg, event: event });
      }
    }
    // เรียงตามเวลาเริ่มของกิจกรรม
    items.sort(function (a, b) {
      return getStart(a.event) - getStart(b.event);
    });
    return items;
  }


  // สร้างการ์ดของฉัน: ใช้การ์ดตั๋วตัวเดียวกับหน้าอื่น เพิ่มข้อมูลผู้ลงทะเบียนและปุ่มยกเลิก
  function createMyTicket(item, canCancel) {
    const club = findClub(allClubs, item.event.clubId);
    const info = '<p class="my-reg">ลงทะเบียนในชื่อ ' + escapeHtml(item.reg.fullName || '') +
      ' รหัส ' + escapeHtml(item.reg.studentId) + '</p>';

    // data-event และ data-student ใช้ระบุว่าจะยกเลิกรายการไหน (รหัสเดียวกันลงกิจกรรมเดียวกันได้ครั้งเดียว)
    let cancel = '';
    if (canCancel) {
      cancel = '<button type="button" class="btn btn-danger btn-small cancel-btn"' +
        ' data-event="' + escapeHtml(item.event.id) + '" data-student="' + escapeHtml(item.reg.studentId) + '">' +
        'ยกเลิกการลงทะเบียน<span class="visually-hidden"> ' + escapeHtml(item.event.title) + '</span></button>';
    }

    return '<li>' + createTicket(item.event, club, { extraInfo: info, extraActions: cancel, hideRegister: true }) + '</li>';
  }


  function renderLists(items) {
    const upcoming = items.filter(function (item) { return !isPast(item.event); });
    // ที่จบแล้ว เรียงล่าสุดก่อน
    const past = items.filter(function (item) { return isPast(item.event); }).reverse();

    if (upcoming.length === 0) {
      upcomingList.innerHTML = '<li class="grid-message">ยังไม่มีกิจกรรมที่ลงทะเบียนไว้ ' +
        '<a href="events.html">เลือกกิจกรรมที่สนใจ</a></li>';
    } else {
      let html = '';
      for (const item of upcoming) {
        // ยกเลิกได้เฉพาะกิจกรรมที่ยังไม่เริ่ม
        html += createMyTicket(item, !hasStarted(item.event));
      }
      upcomingList.innerHTML = html;
      applySeatBars(upcomingList);
    }
    upcomingList.setAttribute('aria-busy', 'false');

    if (past.length === 0) {
      pastList.innerHTML = '<li class="grid-message">ยังไม่มีกิจกรรมที่เข้าร่วมแล้ว</li>';
    } else {
      let html = '';
      for (const item of past) {
        html += createMyTicket(item, false);
      }
      pastList.innerHTML = html;
    }
  }


  // นับถอยหลังถึงกิจกรรมถัดไปของฉัน (F6)
  function renderMyCountdown(items) {
    const next = items.find(function (item) {
      return !hasStarted(item.event);
    });

    if (next === undefined) {
      renderCountdownEmpty(countdownBox, 'ยังไม่มีกิจกรรมที่รออยู่ ' +
        '<a href="events.html">ดูกิจกรรมที่กำลังจะมาถึง</a>');
      return;
    }
    renderCountdown(countdownBox, next.event, findClub(allClubs, next.event.clubId));
  }


  function renderAll() {
    const items = getMyItems();
    renderLists(items);
    renderMyCountdown(items);
  }


  // ยกเลิกการลงทะเบียน (event delegation ที่รายการ ไม่ต้องผูกทีละปุ่ม)
  upcomingList.addEventListener('click', function (e) {
    const button = e.target.closest('.cancel-btn');
    if (button === null) {
      return;
    }

    const eventId = button.dataset.event;
    const studentId = button.dataset.student;
    const event = findEvent(allEvents, eventId);

    // confirm() แสดงกล่องถามยืนยัน: กด OK ได้ true, กด Cancel ได้ false
    const ok = window.confirm('ยกเลิกการลงทะเบียน "' + event.title + '" ใช่หรือไม่?');
    if (!ok) {
      return;
    }

    // เก็บทุกรายการ ยกเว้นรายการที่ตรงกับปุ่มที่กด
    const remaining = readRegistrations().filter(function (reg) {
      return !(reg.eventId === eventId && reg.studentId === studentId);
    });
    saveRegistrations(remaining);

    updateNavBadge();
    renderAll();
    showNotice('ยกเลิกการลงทะเบียน ' + event.title + ' แล้ว');
    // ปุ่มที่กดหายไปแล้ว ย้ายโฟกัสไปหัวข้อรายการ ไม่ให้โฟกัสหลุดไปต้นหน้า
    document.querySelector('#my-upcoming-title').focus();
  });


  async function initMyEvents() {
    try {
      const data = await loadData();
      allClubs = data.clubs;
      allEvents = data.events;
      renderAll();
    } catch (error) {
      console.error(error);
      renderCountdownEmpty(countdownBox, 'โหลดข้อมูลไม่สำเร็จ');
      upcomingList.innerHTML = '<li></li>';
      showLoadError(upcomingList.firstElementChild, initMyEvents);
    }
  }

  enableShareButtons(upcomingList);
  enableShareButtons(pastList);
  initMyEvents();

});

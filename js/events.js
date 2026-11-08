/* =========================================================
   events.js — หน้ากิจกรรมทั้งหมด (events.html)
   F1 fetch + สร้างการ์ด, F2 เรียง + แยกกำลังจะมาถึง/ผ่านไปแล้ว, F3 ค้นหา + กรอง
   ฟีเจอร์เสริม: ปฏิทินรายเดือน, ปุ่มแชร์ (อยู่ใน common.js)

   แบ่งเป็น 6 ส่วน
     1) หา element         4) มุมมองปฏิทิน
     2) ตัวกรอง (F3)        5) สลับมุมมอง + ไปที่การ์ด
     3) มุมมองรายการ (F2)   6) เริ่มทำงาน
   ========================================================= */

// ทั้งไฟล์อยู่ในฟังก์ชันเดียวที่ลงทะเบียนไว้กับ registerPage()
//   ฟังก์ชันนี้ทำงานเมื่อเปิดหน้านี้ (ดู registerPage() ใน common.js)
//   ตัวแปร const/let ข้างในจึงเริ่มใหม่ทุกครั้ง และไม่ชนกับชื่อเดียวกันในไฟล์ของหน้าอื่น
registerPage('events', function () {

  /* ---------- 1) หา element ---------- */
  const filterForm = document.querySelector('#filter-form');
  const searchInput = document.querySelector('#q');
  const typeSelect = document.querySelector('#type');
  const clubSelect = document.querySelector('#club');
  const hoursOnly = document.querySelector('#hours-only');
  const clearButton = document.querySelector('#clear-filters');
  const resultCount = document.querySelector('#result-count');

  const listView = document.querySelector('#list-view');
  const upcomingGrid = document.querySelector('#upcoming-grid');
  const pastGrid = document.querySelector('#past-grid');
  const upcomingTitle = document.querySelector('#upcoming-title');
  const pastTitle = document.querySelector('#past-title');

  const calendarView = document.querySelector('#calendar-view');
  const calGrid = document.querySelector('#cal-grid');
  const calTitle = document.querySelector('#cal-title');
  const calPrev = document.querySelector('#cal-prev');
  const calNext = document.querySelector('#cal-next');
  const viewButtons = document.querySelectorAll('.view-toggle button');

  // ข้อมูลทั้งหมดหลังโหลด (ใช้ซ้ำทุกครั้งที่กรอง ไม่ต้อง fetch ใหม่)
  let allClubs = [];
  let allEvents = [];

  // เดือนที่ปฏิทินกำลังแสดง (month นับจาก 0 = มกราคม เหมือน Date ของ JavaScript)
  let calYear = 0;
  let calMonth = 0;


  /* ---------- 2) ตัวกรอง (F3) ---------- */

  // เติม option ของ select ประเภทและชมรม จากข้อมูลจริง
  function fillFilterOptions() {
    // new Set() เก็บค่าไม่ซ้ำ: ประเภทที่ซ้ำกันหลายกิจกรรมจะเหลืออันเดียว
    const types = new Set();
    for (const e of allEvents) {
      types.add(e.type);
    }

    for (const type of types) {
      // new Option(ข้อความที่แสดง, value) สร้าง <option> โดยไม่ต้องประกอบ HTML เอง
      typeSelect.add(new Option(type, type));
    }

    for (const club of allClubs) {
      clubSelect.add(new Option(club.name, club.id));
    }
  }

  // อ่านค่าจาก URL มาตั้งตัวกรองล่วงหน้า เช่น events.html?type=กีฬา&club=c02
  function applyUrlFilters() {
    // URLSearchParams อ่านส่วนหลัง ? ให้ และถอดรหัสภาษาไทย (%E0%B8...) ให้เอง
    const params = new URLSearchParams(window.location.search);
    searchInput.value = params.get('q') || '';
    typeSelect.value = params.get('type') || '';
    clubSelect.value = params.get('club') || '';
    // ถ้าค่าใน URL ไม่มีใน option, select จะกลายเป็นค่าว่าง ("" = ทุกประเภท) เอง
  }

  // คืนกิจกรรมที่ผ่านทุกเงื่อนไข (เงื่อนไขที่ไม่ได้เลือก = ไม่กรอง)
  function getFilteredEvents() {
    const keyword = searchInput.value.trim().toLowerCase();
    const type = typeSelect.value;
    const clubId = clubSelect.value;
    const onlyHours = hoursOnly.checked;

    return allEvents.filter(function (e) {
      if (type !== '' && e.type !== type) {
        return false;
      }
      if (clubId !== '' && e.clubId !== clubId) {
        return false;
      }
      // ติ๊ก "เฉพาะกิจกรรมที่ได้ชั่วโมงกยศ." → เหลือเฉพาะกิจกรรมที่ loanHours เป็น true
      if (onlyHours && e.loanHours !== true) {
        return false;
      }
      if (keyword !== '') {
        // ค้นจากชื่อกิจกรรม รายละเอียด สถานที่ และชื่อชมรม (ไม่สนตัวพิมพ์เล็ก-ใหญ่)
        const club = findClub(allClubs, e.clubId);
        const text = (e.title + ' ' + (e.description || '') + ' ' + (e.place || '') + ' ' + (e.organizer || '') + ' ' + club.name).toLowerCase();
        if (!text.includes(keyword)) {
          return false;
        }
      }
      return true;
    });
  }

  // แสดงผลใหม่ทุกครั้งที่ตัวกรองเปลี่ยน
  function render() {
    const filtered = getFilteredEvents();
    renderList(filtered);
    renderCalendar(filtered);
  }

  // event "input" เกิดทุกครั้งที่พิมพ์หรือเปลี่ยนค่า (ทั้ง input, select และ checkbox)
  // ผูกที่ฟอร์มตัวเดียวได้ เพราะ event จะ "ลอยขึ้น" (bubble) จากช่องกรอกมาถึงฟอร์ม
  filterForm.addEventListener('input', render);

  // กด Enter ในช่องค้นหา = ส่งฟอร์ม → กันไม่ให้โหลดหน้าใหม่
  filterForm.addEventListener('submit', function (e) {
    e.preventDefault();
  });

  clearButton.addEventListener('click', function () {
    searchInput.value = '';
    typeSelect.value = '';
    clubSelect.value = '';
    hoursOnly.checked = false;
    render();
    searchInput.focus();
  });


  /* ---------- 3) มุมมองรายการ (F2) ---------- */

  function renderList(filtered) {
    // เรียงตามวันที่ แล้วแยกเป็น 2 กลุ่ม
    const sorted = sortByStart(filtered);
    const upcoming = sorted.filter(function (e) { return !isPast(e); });
    // กิจกรรมที่ผ่านไปแล้วเรียงจากล่าสุดไปเก่าสุด (reverse กลับลำดับ)
    const past = sorted.filter(function (e) { return isPast(e); }).reverse();

    fillGrid(upcomingGrid, upcoming, 'ไม่พบกิจกรรมที่กำลังจะมาถึงตามเงื่อนไขนี้ ลองล้างตัวกรอง');
    fillGrid(pastGrid, past, 'ไม่พบกิจกรรมที่ผ่านไปแล้วตามเงื่อนไขนี้');

    upcomingTitle.innerHTML = 'กำลังจะมาถึง <span class="count-pill">' + upcoming.length + '</span>';
    pastTitle.innerHTML = 'ผ่านไปแล้ว <span class="count-pill">' + past.length + '</span>';

    resultCount.textContent = 'พบ ' + filtered.length + ' กิจกรรม จากทั้งหมด ' + allEvents.length + ' กิจกรรม';
  }

  function fillGrid(grid, events, emptyText) {
    if (events.length === 0) {
      grid.innerHTML = '<p class="grid-message">' + emptyText + '</p>';
    } else {
      let html = '';
      for (const e of events) {
        html += createTicket(e, findClub(allClubs, e.clubId));
      }
      grid.innerHTML = html;
      applySeatBars(grid);
    }
    grid.setAttribute('aria-busy', 'false');
  }


  /* ---------- 4) มุมมองปฏิทิน (ฟีเจอร์เสริม) ---------- */

  // "2026-12-05" ของวันในปฏิทิน (padStart เติม 0 ให้ครบ 2 หลัก)
  function toDateKey(year, month, day) {
    return year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  }

  function renderCalendar(filtered) {
    const firstDay = new Date(calYear, calMonth, 1);
    // new Date(ปี, เดือนถัดไป, 0) = วันสุดท้ายของเดือนนี้ → getDate() ได้จำนวนวันในเดือน
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    // getDay() = วันในสัปดาห์ของวันที่ 1 (0 = อาทิตย์) = จำนวนช่องว่างก่อนวันที่ 1
    const blanks = firstDay.getDay();
    const todayKey = toDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    calTitle.textContent = firstDay.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

    let html = '';
    for (let i = 0; i < blanks; i++) {
      html += '<li class="cal-day cal-empty" aria-hidden="true"></li>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const key = toDateKey(calYear, calMonth, day);
      const dayEvents = sortByStart(filtered.filter(function (e) {
        return e.date === key;
      }));

      let links = '';
      for (const e of dayEvents) {
        links += `<li><a href="#event-${escapeHtml(e.id)}" data-id="${escapeHtml(e.id)}" data-type="${escapeHtml(e.type)}">` +
          `<span class="cal-event-text">${escapeHtml(e.start)} ${escapeHtml(e.title)}</span></a></li>`;
      }

      // aria-current="date" = วันนี้ (CSS ใช้ทำกรอบสีฟ้า)
      const current = key === todayKey ? ' aria-current="date"' : '';
      // วันที่เต็มสำหรับโปรแกรมอ่านหน้าจอ เช่น "5 ธันวาคม 2569"
      const fullDate = new Date(calYear, calMonth, day).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

      html += `
        <li class="cal-day"${current}>
          <span class="cal-date" aria-hidden="true">${day}</span>
          <span class="visually-hidden">${fullDate}${dayEvents.length > 0 ? ' มี ' + dayEvents.length + ' กิจกรรม' : ''}</span>
          ${links ? '<ul class="cal-events">' + links + '</ul>' : ''}
        </li>`;
    }

    calGrid.innerHTML = html;
  }

  // เปลี่ยนเดือน: +1 หรือ -1
  function moveMonth(step) {
    calMonth += step;
    if (calMonth > 11) {
      calMonth = 0;
      calYear += 1;
    } else if (calMonth < 0) {
      calMonth = 11;
      calYear -= 1;
    }
    renderCalendar(getFilteredEvents());
  }

  calPrev.addEventListener('click', function () {
    moveMonth(-1);
  });

  calNext.addEventListener('click', function () {
    moveMonth(1);
  });

  // กดชื่อกิจกรรมในปฏิทิน → สลับไปมุมมองรายการแล้วไปที่การ์ดนั้น (event delegation)
  calGrid.addEventListener('click', function (e) {
    const link = e.target.closest('a[data-id]');
    if (link === null) {
      return;
    }
    e.preventDefault();
    setView('list');
    history.replaceState(null, '', '#event-' + link.dataset.id);   // เปลี่ยน URL โดยไม่โหลดหน้าใหม่
    goToCard(link.dataset.id);
  });

  // เดือนเริ่มต้นของปฏิทิน = เดือนของกิจกรรมถัดไป (ถ้าไม่มี ใช้เดือนปัจจุบัน)
  function setInitialMonth() {
    const next = sortByStart(allEvents).find(function (e) {
      return !isPast(e);
    });
    const base = next ? new Date(next.date + 'T00:00') : new Date();
    calYear = base.getFullYear();
    calMonth = base.getMonth();
  }


  /* ---------- 5) สลับมุมมอง + ไปที่การ์ด ---------- */

  function setView(view) {
    listView.hidden = (view !== 'list');
    calendarView.hidden = (view !== 'calendar');
    for (const button of viewButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.view === view));
    }
  }

  for (const button of viewButtons) {
    button.addEventListener('click', function () {
      setView(this.dataset.view);
    });
  }

  // เลื่อนไปที่การ์ด ไฮไลต์ และย้ายโฟกัส (ใช้กับลิงก์แชร์และปฏิทิน)
  function goToCard(eventId) {
    const card = document.querySelector('#event-' + CSS.escape(eventId));
    if (card === null) {
      showNotice('กิจกรรมนี้ไม่ตรงกับตัวกรองที่เลือก');
      return;
    }
    const old = document.querySelector('.ticket.is-highlight');
    if (old !== null) {
      old.classList.remove('is-highlight');
    }
    card.classList.add('is-highlight');
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.focus({ preventScroll: true });
  }


  /* ---------- 6) เริ่มทำงาน ---------- */

  async function initEvents() {
    try {
      const data = await loadData();
      allClubs = data.clubs;
      allEvents = data.events;

      fillFilterOptions();
      applyUrlFilters();
      setInitialMonth();
      render();

      // เปิดจากลิงก์แชร์ (events.html#event-e006): การ์ดเพิ่งถูกสร้าง เบราว์เซอร์จึงยังไม่ได้เลื่อนให้
      if (window.location.hash.startsWith('#event-')) {
        goToCard(window.location.hash.replace('#event-', ''));
      }
    } catch (error) {
      console.error(error);
      resultCount.textContent = '';
      showLoadError(upcomingGrid, initEvents);
    }
  }

  enableShareButtons(listView);
  initEvents();

});

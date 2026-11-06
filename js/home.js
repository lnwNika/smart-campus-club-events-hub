/* =========================================================
   home.js — หน้าแรก (index.html)
   ใช้ฟังก์ชันจาก common.js: loadData, sortByStart, createTicket, renderCountdown ฯลฯ

   ลำดับการทำงาน (อ่านจากฟังก์ชัน initHome ท้ายไฟล์ก่อน)
     1) โหลดข้อมูล
     2) เลือกกิจกรรมที่จะนับถอยหลัง แล้วเริ่มนับ (F6)
     3) สร้างการ์ดกิจกรรมแนะนำ (F1)
     4) สร้างลิงก์ประเภทกิจกรรม
   ========================================================= */

// ทั้งไฟล์อยู่ในฟังก์ชันเดียวที่ลงทะเบียนไว้กับ registerPage()
//   router.js เรียกฟังก์ชันนี้ทุกครั้งที่เปิดหน้านี้ (ทั้งเปิดครั้งแรกและกดเมนูมาจากหน้าอื่น)
//   ตัวแปร const/let ข้างในจึงเริ่มใหม่ทุกครั้ง และไม่ชนกับชื่อเดียวกันในไฟล์ของหน้าอื่น
registerPage('home', function () {

  const countdownBox = document.querySelector('#countdown-box');
  const countdownTitle = document.querySelector('#countdown-title');
  const featuredGrid = document.querySelector('#featured-grid');
  const typeLinks = document.querySelector('#type-links');

  // จำนวนการ์ดกิจกรรมแนะนำที่แสดง
  const FEATURED_LIMIT = 3;


  // เลือกกิจกรรมที่จะนับถอยหลัง
  //   ถ้าเคยลงทะเบียนกิจกรรมที่ยังไม่เริ่ม → เลือกอันที่ใกล้ที่สุดของฉัน
  //   ถ้าไม่มี                              → เลือกกิจกรรมที่ใกล้ที่สุดของทุกชมรม
  // คืนค่า { event, mine } หรือ null ถ้าไม่มีกิจกรรมที่ยังไม่เริ่มเลย
  function pickCountdownEvent(events) {
    const notStarted = sortByStart(events).filter(function (e) {
      return !hasStarted(e);
    });

    if (notStarted.length === 0) {
      return null;
    }

    // map() แปลงทุกสมาชิก: ได้ array ของ eventId ที่ลงทะเบียนไว้
    const myIds = readRegistrations().map(function (reg) {
      return reg.eventId;
    });

    const myNext = notStarted.find(function (e) {
      return myIds.includes(e.id);
    });

    if (myNext !== undefined) {
      return { event: myNext, mine: true };
    }
    return { event: notStarted[0], mine: false };
  }


  function showCountdown(data) {
    const picked = pickCountdownEvent(data.events);

    if (picked === null) {
      countdownTitle.textContent = 'กิจกรรมใกล้ที่สุด';
      renderCountdownEmpty(countdownBox, 'ยังไม่มีกิจกรรมที่กำลังจะมาถึง');
      return;
    }

    countdownTitle.textContent = picked.mine ? 'กิจกรรมถัดไปของฉัน' : 'กิจกรรมใกล้ที่สุด';
    renderCountdown(countdownBox, picked.event, findClub(data.clubs, picked.event.clubId));
  }


  // กิจกรรมแนะนำ: กิจกรรมที่ยังไม่จบและตั้ง featured = true
  // ถ้ามีไม่ครบ FEATURED_LIMIT ให้เติมด้วยกิจกรรมที่ใกล้ที่สุด
  function showFeatured(data) {
    const upcoming = sortByStart(data.events).filter(function (e) {
      return !isPast(e);
    });

    let picked = upcoming.filter(function (e) {
      return e.featured === true;
    });

    for (const e of upcoming) {
      if (picked.length >= FEATURED_LIMIT) {
        break;                    // ครบแล้ว ออกจากลูป
      }
      if (!picked.includes(e)) {
        picked.push(e);
      }
    }
    picked = picked.slice(0, FEATURED_LIMIT);

    if (picked.length === 0) {
      featuredGrid.innerHTML = '<p class="grid-message">ยังไม่มีกิจกรรมที่กำลังจะมาถึง</p>';
    } else {
      let html = '';
      for (const e of picked) {
        html += createTicket(e, findClub(data.clubs, e.clubId));
      }
      featuredGrid.innerHTML = html;
      applySeatBars(featuredGrid);
    }
    featuredGrid.setAttribute('aria-busy', 'false');
  }


  // ลิงก์ประเภทกิจกรรม พร้อมจำนวนกิจกรรมที่กำลังจะมาถึงของแต่ละประเภท
  function showTypeLinks(data) {
    // นับจำนวนต่อประเภท เก็บใน object เช่น { 'วิชาการ': 3, 'กีฬา': 2 }
    const counts = {};
    for (const e of data.events) {
      if (isPast(e)) {
        continue;                 // ข้ามกิจกรรมที่จบแล้ว
      }
      counts[e.type] = (counts[e.type] || 0) + 1;
    }

    let html = '';
    for (const type in counts) {
      html += `
        <li>
          <a href="events.html?type=${encodeURIComponent(type)}" data-type="${escapeHtml(type)}">
            <span class="type-name">${escapeHtml(type)}</span>
            <span class="type-count">${counts[type]} กิจกรรมที่กำลังจะมาถึง</span>
          </a>
        </li>`;
    }
    typeLinks.innerHTML = html;
  }


  async function initHome() {
    try {
      const data = await loadData();
      showCountdown(data);
      showFeatured(data);
      showTypeLinks(data);
    } catch (error) {
      console.error(error);       // รายละเอียดสำหรับนักพัฒนา (F12 → Console)
      renderCountdownEmpty(countdownBox, 'โหลดข้อมูลไม่สำเร็จ');
      showLoadError(featuredGrid, initHome);
    }
  }

  enableShareButtons(featuredGrid);
  initHome();

});

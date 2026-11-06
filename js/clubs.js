/* =========================================================
   clubs.js — หน้ารายชื่อชมรม (clubs.html)
   สร้างการ์ดชมรม 1 ใบต่อ 1 ชมรม พร้อมกิจกรรมที่กำลังจะมาถึงของชมรมนั้น
   ========================================================= */

// ทั้งไฟล์อยู่ในฟังก์ชันเดียวที่ลงทะเบียนไว้กับ registerPage()
//   router.js เรียกฟังก์ชันนี้ทุกครั้งที่เปิดหน้านี้ (ทั้งเปิดครั้งแรกและกดเมนูมาจากหน้าอื่น)
//   ตัวแปร const/let ข้างในจึงเริ่มใหม่ทุกครั้ง และไม่ชนกับชื่อเดียวกันในไฟล์ของหน้าอื่น
registerPage('clubs', function () {

  const clubGrid = document.querySelector('#club-grid');

  // แสดงกิจกรรมที่กำลังจะมาถึงสูงสุดกี่รายการต่อชมรม
  const CLUB_EVENT_LIMIT = 3;


  // สร้าง HTML การ์ดชมรม 1 ใบ
  function createClubCard(club, events) {
    // กิจกรรมของชมรมนี้ที่ยังไม่จบ เรียงตามวันที่
    const upcoming = sortByStart(events).filter(function (e) {
      return e.clubId === club.id && !isPast(e);
    });
    const total = events.filter(function (e) {
      return e.clubId === club.id;
    }).length;

    // ไม่มีกิจกรรมที่กำลังจะมาถึง → แสดงกิจกรรมล่าสุดของชมรมแทน (reverse = ล่าสุดก่อน)
    let shown = upcoming;
    let listTitle = 'กิจกรรมที่กำลังจะมาถึง';
    if (shown.length === 0) {
      shown = sortByStart(events).filter(function (e) {
        return e.clubId === club.id;
      }).reverse();
      listTitle = 'กิจกรรมล่าสุด';
    }

    let list = '';
    if (shown.length === 0) {
      list = '<p class="muted">ยังไม่มีข้อมูลกิจกรรม</p>';
    } else {
      list = '<ul class="club-events">';
      // slice(0, n) = เอาแค่ n ตัวแรก
      for (const e of shown.slice(0, CLUB_EVENT_LIMIT)) {
        const stub = getStubParts(e.date);
        list += `
          <li>
            <time datetime="${escapeHtml(e.date)}">${stub.day} ${stub.month} ${stub.year}</time>
            <a href="events.html#event-${escapeHtml(e.id)}">${escapeHtml(e.title)}</a>
          </li>`;
      }
      list += '</ul>';
    }

    // ช่องทางติดต่อ ถ้ามีลิงก์แหล่งที่มา (source) ให้เป็นลิงก์กดได้
    let contact = escapeHtml(club.contact || '');
    if (club.source) {
      contact = '<a href="' + escapeHtml(club.source) + '" target="_blank" rel="noopener">' + contact + '</a>';
    }

    // data-type ทำให้สีขอบบนการ์ดเป็นสีประจำประเภท (กำหนดใน style.css ข้อ 7)
    return `
      <article class="club" data-type="${escapeHtml(club.type)}">
        <div class="ticket-tags"><span class="chip">${escapeHtml(club.type)}</span></div>
        <h2>${escapeHtml(club.name)}</h2>
        <p>${escapeHtml(club.description || '')}</p>
        ${contact ? '<p class="club-contact">ติดต่อ: ' + contact + '</p>' : ''}
        <h3>${listTitle}</h3>
        ${list}
        <p class="club-foot">
          <a class="text-link" href="events.html?club=${encodeURIComponent(club.id)}">ดูกิจกรรมทั้งหมดของ${escapeHtml(club.name)} (${total})</a>
        </p>
      </article>`;
  }


  async function initClubs() {
    try {
      const data = await loadData();

      if (data.clubs.length === 0) {
        clubGrid.innerHTML = '<p class="grid-message">ยังไม่มีข้อมูลชมรม</p>';
      } else {
        let html = '';
        for (const club of data.clubs) {
          html += createClubCard(club, data.events);
        }
        clubGrid.innerHTML = html;
      }
      clubGrid.setAttribute('aria-busy', 'false');
    } catch (error) {
      console.error(error);
      showLoadError(clubGrid, initClubs);
    }
  }

  initClubs();

});

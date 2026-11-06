/* =========================================================
   router.js — เปลี่ยนหน้าโดยไม่โหลดใหม่ทั้งหน้า
   Club & Events Hub · SC17332 กลุ่มที่ 3

   ปัญหา: เว็บมี 5 ไฟล์ HTML ตามโจทย์ กดเมนูทีไรเบราว์เซอร์โหลดใหม่ทั้งหน้า
          (หน้าขาววูบ ฟอนต์โหลดใหม่ fetch events.json ซ้ำทุกครั้ง)

   วิธีแก้: ดักการคลิกลิงก์ในเว็บของเรา แล้วทำเอง 4 ขั้น
     1) fetch ไฟล์ HTML ของหน้าปลายทาง (ได้เป็นข้อความ)
     2) DOMParser แปลงข้อความเป็น document แล้วหยิบเฉพาะ <main id="main">
     3) เอา <main> ใหม่ไปแทน <main> เดิม   header และ footer อยู่ที่เดิม ไม่กระพริบ
     4) history.pushState เปลี่ยน URL บนแถบที่อยู่ โดยไม่โหลดหน้าใหม่
   แล้วเรียกฟังก์ชันของหน้านั้นที่ลงทะเบียนไว้ด้วย registerPage() (ดู common.js)

   ทำไมยังมี 5 ไฟล์ HTML?
     - โจทย์กำหนด 5 หน้า และทุกหน้าต้องเปิดตรง ๆ ได้ เช่นมีคนแชร์ลิงก์ events.html มา
     - ถ้า router.js ทำงานไม่ได้ (เช่น fetch ไม่สำเร็จ) ลิงก์ก็ยังพาไปหน้าใหม่แบบปกติ

   ข้อจำกัด: เปิดไฟล์ตรง ๆ (file:///) เบราว์เซอร์ไม่ยอมให้ fetch
             router.js จึงไม่ดักลิงก์ ปล่อยให้โหลดหน้าใหม่ตามปกติ ต้องเปิดผ่าน Live Server

   ลองดูการทำงาน: F12 → Network → กดเมนู จะเห็นคำขอ events.html แบบ fetch
                 แต่ไม่มีคำขอ style.css หรือฟอนต์ซ้ำ
   ========================================================= */


const mainSelector = '#main';

// หน้าที่แสดงอยู่ตอนนี้ (path + query) ใช้เช็กว่าการกด ← ย้อนกลับเปลี่ยนหน้าจริงหรือแค่เปลี่ยน #
let currentPage = location.pathname + location.search;

// นับจำนวนครั้งที่เปลี่ยนหน้า ถ้ากดเมนูรัว ๆ จะใช้เฉพาะผลของครั้งล่าสุด
let navigationId = 0;


// เรียกฟังก์ชันของหน้าที่แสดงอยู่ (ชื่อหน้าอ่านจาก <body data-page="...">)
function startCurrentPage() {
  const start = pages[document.body.dataset.page];
  if (start) {
    start();
  }
  updateNavBadge();
}

// ทำให้เมนูของหน้าปัจจุบันมีพื้นสีค้างไว้ (aria-current="page" กำหนดหน้าตาใน style.css)
function updateCurrentLink() {
  const here = location.pathname.endsWith('/') ? location.pathname + 'index.html' : location.pathname;
  const links = document.querySelectorAll('.nav-links a');
  for (const link of links) {
    if (new URL(link.href).pathname === here) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  }
}

// ลิงก์นี้ควรเปลี่ยนหน้าด้วย router ไหม
function shouldHandle(link, event) {
  // เปิดไฟล์ตรง ๆ (file:///) fetch ไม่ได้ → ให้โหลดหน้าใหม่ตามปกติ
  if (location.protocol === 'file:') {
    return false;
  }
  // ปล่อยให้เบราว์เซอร์จัดการเอง: กด Ctrl/Shift (เปิดแท็บใหม่) หรือคลิกเมาส์ปุ่มอื่น
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
    return false;
  }
  if (link.target !== '' || link.hasAttribute('download')) {
    return false;
  }

  const url = new URL(link.href);

  // ลิงก์ไปเว็บอื่น เช่น GitHub
  if (url.origin !== location.origin) {
    return false;
  }
  // ไม่ใช่หน้า HTML ของเรา
  if (!url.pathname.endsWith('.html') && !url.pathname.endsWith('/')) {
    return false;
  }
  // หน้าเดิม ต่างแค่ #... เช่น ลิงก์ข้ามเมนู #main → ให้เบราว์เซอร์เลื่อนเอง
  if (url.pathname === location.pathname && url.search === location.search && url.hash !== '') {
    return false;
  }
  return true;
}

// เปลี่ยนไปหน้า url
//   addToHistory = true  เมื่อกดลิงก์ (เพิ่มรายการในประวัติ กด ← ย้อนกลับได้)
//   addToHistory = false เมื่อกด ← หรือ → ของเบราว์เซอร์ (ประวัติเปลี่ยนไปแล้ว)
async function goTo(url, addToHistory) {
  navigationId += 1;
  const myId = navigationId;

  let html;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    html = await response.text();
  } catch (error) {
    console.error(error);
    window.location.href = url;      // โหลดไม่สำเร็จ → เปลี่ยนหน้าแบบปกติแทน
    return;
  }

  // ระหว่างรอ ผู้ใช้กดลิงก์อื่นไปแล้ว → ทิ้งผลครั้งนี้
  if (myId !== navigationId) {
    return;
  }

  // แปลงข้อความ HTML เป็น document (ยังไม่แสดงบนจอ และ <script> ในนั้นไม่ถูกรัน)
  const newDoc = new DOMParser().parseFromString(html, 'text/html');
  const newMain = newDoc.querySelector(mainSelector);
  const pageName = newDoc.body.dataset.page;

  if (newMain === null || pages[pageName] === undefined) {
    window.location.href = url;
    return;
  }

  stopCountdown();                   // setInterval ของหน้าเก่าไม่ต้องทำงานต่อ

  if (addToHistory) {
    history.pushState(null, '', url);
  }
  currentPage = location.pathname + location.search;

  document.title = newDoc.title;
  document.body.dataset.page = pageName;
  document.querySelector(mainSelector).replaceWith(newMain);
  updateCurrentLink();

  // เลื่อนขึ้นบนสุด (ถ้ามี #event-... หน้า events จะเลื่อนไปที่การ์ดเอง)
  if (location.hash === '') {
    window.scrollTo(0, 0);
  }

  // ย้ายโฟกัสไปที่หัวข้อของหน้าใหม่ โปรแกรมอ่านหน้าจอจะอ่านชื่อหน้าให้ผู้ใช้รู้ว่าเปลี่ยนหน้าแล้ว
  // tabindex="-1" = โฟกัสด้วย JavaScript ได้ แต่กด Tab ไม่หยุดที่หัวข้อนี้
  const heading = newMain.querySelector('h1');
  if (heading !== null) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }

  startCurrentPage();
}


// ดักการคลิกลิงก์ทั้งหน้าด้วย event delegation ที่ document ตัวเดียว
// (ลิงก์ในการ์ดที่ JavaScript สร้างทีหลังก็ใช้ได้ด้วย)
document.addEventListener('click', function (event) {
  const link = event.target.closest('a[href]');
  if (link === null || !shouldHandle(link, event)) {
    return;
  }
  event.preventDefault();            // ไม่ให้เบราว์เซอร์โหลดหน้าใหม่
  goTo(link.href, true);
});

// กด ← ย้อนกลับ หรือ → ไปข้างหน้า ของเบราว์เซอร์
window.addEventListener('popstate', function () {
  // ถ้าเปลี่ยนแค่ #... (เช่น ปฏิทินเปลี่ยน URL เป็น #event-e006) ไม่ต้องโหลดหน้าใหม่
  if (location.pathname + location.search === currentPage) {
    return;
  }
  goTo(location.href, false);
});


/* ---------- เริ่มทำงาน ---------- */
// เปิดหน้าครั้งแรก (พิมพ์ URL, รีเฟรช, เปิดจากลิงก์ที่แชร์มา) → เริ่มหน้านั้นเลย
startCurrentPage();

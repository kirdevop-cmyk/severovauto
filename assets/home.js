/* Головна: галерея фото лотів, вікно заявки, форма підбору «3 варіанти». */
(function () {
  var RU = document.documentElement.lang === 'ru';
  var T = RU ? {
    send: 'Отправляю…', photo: 'Фото', of: 'из',
    year: 'Год', budget: 'Бюджет', car: 'Авто',
    defTitle: 'Получить 3 варианта', defSub: 'Подберём 3 варианта с фото и расчётом под ключ и пришлём в мессенджер.'
  } : {
    send: 'Надсилаю…', photo: 'Фото', of: 'з',
    year: 'Рік', budget: 'Бюджет', car: 'Авто',
    defTitle: 'Отримати 3 варіанти', defSub: 'Підберемо 3 варіанти з фото й розрахунком під ключ і надішлемо в месенджер.'
  };
  var CDN = 'https://cs.copart.com/v1/AUTH_svc.pdoc00001/';
  var lastFocus = null;

  function lockScroll(on) { document.body.style.overflow = on ? 'hidden' : ''; }

  /* ---------- «Показати всі лоти» ---------- */
  var more = document.getElementById('lotsMore');
  if (more) more.addEventListener('click', function () {
    document.getElementById('lotsGrid').classList.add('all');
  });

  /* ---------- галерея ---------- */
  var lb = document.getElementById('lb');
  var lbImg = lb && lb.querySelector('.lb-stage img');
  var lbStrip = lb && lb.querySelector('.lb-strip');
  var lbTitle = lb && lb.querySelector('.lb-top b');
  var lbCount = lb && lb.querySelector('.lb-count');
  var photos = [], cur = 0;

  function show(i) {
    cur = (i + photos.length) % photos.length;
    lbImg.src = photos[cur] + '_ful.jpg';
    lbCount.textContent = T.photo + ' ' + (cur + 1) + ' ' + T.of + ' ' + photos.length;
    lbStrip.querySelectorAll('button').forEach(function (b, k) {
      b.setAttribute('aria-current', k === cur ? 'true' : 'false');
      if (k === cur) b.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
  }
  function openLb(lot, i) {
    var dir = lot.getAttribute('data-dir');
    photos = lot.getAttribute('data-photos').split(',').map(function (h) { return CDN + dir + '/' + h; });
    lbTitle.textContent = lot.getAttribute('data-car');
    lbStrip.innerHTML = photos.map(function (p, k) {
      return '<button type="button" aria-label="' + T.photo + ' ' + (k + 1) + '"><img src="' + p + '_thb.jpg" alt="" loading="lazy"></button>';
    }).join('');
    lbStrip.querySelectorAll('button').forEach(function (b, k) { b.addEventListener('click', function () { show(k); }); });
    lastFocus = document.activeElement;
    lb.classList.add('open'); lockScroll(true);
    show(i || 0);
    lb.querySelector('.lb-x').focus();
  }
  function closeLb() { lb.classList.remove('open'); lockScroll(false); if (lastFocus) lastFocus.focus(); }
  if (lb) {
    document.querySelectorAll('[data-open-photo]').forEach(function (b) {
      b.addEventListener('click', function () { openLb(b.closest('.lot'), +b.getAttribute('data-open-photo')); });
    });
    lb.querySelector('.lb-x').addEventListener('click', closeLb);
    lb.querySelector('.lb-prev').addEventListener('click', function () { show(cur - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { show(cur + 1); });
    var sx = null;
    lb.querySelector('.lb-stage').addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.querySelector('.lb-stage').addEventListener('touchend', function (e) {
      if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1));
    });
  }

  /* ---------- вікно заявки ---------- */
  var modal = document.getElementById('leadModal');
  var mForm = document.getElementById('modalForm');
  function openModal(o) {
    o = o || {};
    modal.querySelector('h3').textContent = o.title || T.defTitle;
    modal.querySelector('.modal-sub').textContent = o.sub || T.defSub;
    ['car', 'year', 'budget', 'topic'].forEach(function (k) { mForm.elements[k].value = o[k] || ''; });
    var sum = [];
    if (o.car) sum.push(T.car + ': ' + o.car);
    if (o.year) sum.push(T.year + ': ' + o.year);
    if (o.budget) sum.push(T.budget + ': ' + o.budget);
    modal.querySelector('.modal-sum').innerHTML = sum.map(function (s) {
      return '<span>' + s.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }) + '</span>';
    }).join('');
    document.getElementById('modalBody').style.display = '';
    document.getElementById('modalOk').classList.remove('show');
    document.getElementById('modalErr').classList.remove('show');
    lastFocus = document.activeElement;
    modal.classList.add('open'); lockScroll(true);
    setTimeout(function () { mForm.elements.name.focus(); }, 30);
  }
  function closeModal() { modal.classList.remove('open'); lockScroll(false); if (lastFocus) lastFocus.focus(); }
  if (modal) {
    modal.querySelector('.modal-x').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.querySelectorAll('[data-lead]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        openModal({ title: a.getAttribute('data-title'), car: a.getAttribute('data-car'), topic: a.getAttribute('data-lead') });
      });
    });
    var btn = mForm.querySelector('button[type="submit"]'), label = btn.innerHTML;
    mForm.addEventListener('submit', function (e) {
      e.preventDefault();
      document.getElementById('modalErr').classList.remove('show');
      btn.disabled = true; btn.textContent = T.send;
      var d = Object.fromEntries(new FormData(mForm).entries());
      d.comment = (d.messenger ? 'Зв’язок: ' + d.messenger : '');
      d.page = mForm.getAttribute('data-page');
      fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
        .then(function (r) {
          if (!r.ok) throw new Error(String(r.status));
          document.getElementById('modalBody').style.display = 'none';
          document.getElementById('modalOk').classList.add('show');
          mForm.reset();
        })
        .catch(function () { document.getElementById('modalErr').classList.add('show'); })
        .then(function () { btn.disabled = false; btn.innerHTML = label; });
    });
  }

  /* ---------- форма підбору → вікно заявки ---------- */
  var pick = document.getElementById('pickForm');
  if (pick) pick.addEventListener('submit', function (e) {
    e.preventDefault();
    openModal({
      title: pick.getAttribute('data-title'),
      car: pick.elements.car.value.trim(),
      year: pick.elements.year.value,
      budget: pick.elements.budget.value,
      topic: pick.getAttribute('data-topic')
    });
  });

  /* Escape закриває відкрите вікно; стрілки гортають фото */
  addEventListener('keydown', function (e) {
    if (lb && lb.classList.contains('open')) {
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowRight') show(cur + 1);
      if (e.key === 'ArrowLeft') show(cur - 1);
    } else if (modal && modal.classList.contains('open') && e.key === 'Escape') closeModal();
  });
})();

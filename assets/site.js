/* Спільна поведінка сторінок: шапка, мобільне меню, поява блоків, фільтр авто, заявка. */
(function () {
  /* шапка стає щільною після прокрутки */
  var hdr = document.getElementById('hdr');
  if (hdr) {
    var onScroll = function () { hdr.classList.toggle('solid', scrollY > 30); };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* мобільне меню */
  var burger = document.getElementById('burger'), mnav = document.getElementById('mnav');
  if (burger && mnav) {
    var setMenu = function (open) {
      mnav.classList.toggle('open', open);
      burger.classList.toggle('on', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', function () { setMenu(!mnav.classList.contains('open')); });
    mnav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    addEventListener('resize', function () { if (innerWidth > 1180) setMenu(false); }, { passive: true });
  }

  /* поява блоків при скролі */
  var rv = document.querySelectorAll('.rv, .office');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    rv.forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('in'); });
  }

  /* фільтр авто за ринком */
  var grid = document.getElementById('fleetGrid');
  var chips = document.querySelectorAll('[data-filter-btn]');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-filter-btn');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
      grid.setAttribute('data-filter', f);
      grid.querySelectorAll('.car').forEach(function (car) {
        car.hidden = f !== 'all' && car.getAttribute('data-origin') !== f;
      });
    });
  });

  /* «Дізнатись ціну» підставляє модель у форму */
  document.querySelectorAll('[data-car]').forEach(function (a) {
    a.addEventListener('click', function () {
      var input = document.querySelector('#leadForm input[name="car"]');
      var origin = document.querySelector('#leadForm select[name="origin"]');
      if (input) input.value = a.getAttribute('data-car');
      if (origin && a.getAttribute('data-from')) origin.value = a.getAttribute('data-from');
    });
  });

  /* відправка заявки в /api/lead */
  var form = document.getElementById('leadForm');
  if (form) {
    var body = document.getElementById('formBody');
    var ok = document.getElementById('okBox');
    var btn = form.querySelector('button[type="submit"]');
    var err = document.getElementById('formErr');
    var label = btn ? btn.innerHTML : '';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (err) err.classList.remove('show');
      if (btn) { btn.disabled = true; btn.textContent = 'Надсилаю…'; }
      var data = Object.fromEntries(new FormData(form).entries());
      data.page = form.getAttribute('data-page') || document.title;
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        body.style.display = 'none';
        ok.classList.add('show');
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.innerHTML = label; }
        if (err) err.classList.add('show');
      });
    });
  }
})();

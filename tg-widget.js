// Плаваючий віджет месенджерів справа внизу: пульсуюча кнопка Telegram,
// над нею WhatsApp та Instagram, + підказка-бульбашка.
// Підключається на кожній сторінці одним рядком: <script src="/tg-widget.js" defer></script>
(function () {
  if (window.__tgWidget) return;
  window.__tgWidget = true;

  var TG_URL = 'https://t.me/severovauto';
  var WA_URL = 'https://wa.me/380661661654';
  var IG_URL = 'https://www.instagram.com/autogroupkh';
  var SHOW_BUBBLE_AFTER = 5000; // мс до появи підказки
  var KEY = 'tgw-closed';
  var T = document.documentElement.lang === 'ru' ? {
    q: 'Есть вопросы по авто?',
    t: 'Напишите менеджеру в <em>Telegram</em> или <em>WhatsApp</em> — подберём вариант и посчитаем стоимость.',
    x: 'Закрыть подсказку', wa: 'Написать в WhatsApp', tg: 'Написать в Telegram'
  } : {
    q: 'Є питання щодо авто?',
    t: 'Напишіть менеджеру в <em>Telegram</em> або <em>WhatsApp</em> — підберемо варіант і порахуємо вартість.',
    x: 'Закрити підказку', wa: 'Написати у WhatsApp', tg: 'Написати в Telegram'
  };

  var css = [
    '.tgw{position:fixed;right:22px;bottom:22px;z-index:95;display:flex;align-items:flex-end;gap:14px;',
    'font-family:"Onest",system-ui,sans-serif;pointer-events:none}',
    '.tgw>*{pointer-events:auto}',
    '.tgw-stack{display:flex;flex-direction:column;align-items:center;gap:12px}',

    '.tgw-mini{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;color:#fff;text-decoration:none;',
    'box-shadow:0 8px 20px rgba(0,0,0,.4),0 0 0 1px rgba(255,255,255,.12) inset;',
    'transform:scale(0);animation:tgw-in .6s cubic-bezier(.16,1,.3,1) forwards;transition:transform .25s}',
    '.tgw-mini:hover{transform:scale(1.1)!important}',
    '.tgw-mini:focus-visible{outline:2px solid #D8A44A;outline-offset:4px}',
    '.tgw-mini svg{width:24px;height:24px}',
    '.tgw-wa{background:linear-gradient(145deg,#3EE07A,#1FAF53);animation-delay:1.25s}',
    '.tgw-ig{background:radial-gradient(circle at 30% 107%,#FDF497 0%,#FD5949 45%,#D6249F 60%,#285AEB 90%);animation-delay:1.45s}',

    '.tgw-btn{position:relative;width:62px;height:62px;border-radius:50%;flex:none;display:grid;place-items:center;',
    'background:linear-gradient(145deg,#37BBFE,#1E96D8);color:#fff;text-decoration:none;',
    'box-shadow:0 10px 28px rgba(30,150,216,.45),0 0 0 1px rgba(255,255,255,.12) inset;',
    'transform:scale(0);animation:tgw-in .7s cubic-bezier(.16,1,.3,1) .8s forwards;transition:transform .25s}',
    '.tgw-btn:hover{transform:scale(1.08)!important}',
    '.tgw-btn:focus-visible{outline:2px solid #D8A44A;outline-offset:4px}',
    '.tgw-btn svg{width:30px;height:30px;margin-left:-3px;animation:tgw-fly 6s ease-in-out 2.5s infinite}',

    '.tgw-ring{position:absolute;inset:0;border-radius:50%;border:2px solid #37BBFE;opacity:0;',
    'animation:tgw-ring 2.6s cubic-bezier(.16,1,.3,1) 1.6s infinite}',
    '.tgw-ring+.tgw-ring{animation-delay:2.9s}',

    '.tgw-dot{position:absolute;top:2px;right:2px;min-width:20px;height:20px;padding:0 6px;border-radius:10px;',
    'background:#D8A44A;color:#08090D;font-size:11px;font-weight:800;line-height:20px;text-align:center;',
    'box-shadow:0 0 0 3px #08090D;transform:scale(0);transition:transform .4s cubic-bezier(.16,1,.3,1)}',
    '.tgw.is-open .tgw-dot{transform:scale(1)}',

    '.tgw-bubble{position:relative;max-width:250px;margin-bottom:8px;padding:14px 34px 14px 16px;border-radius:16px 16px 4px 16px;',
    'background:#141824;color:#EDE8DE;border:1px solid rgba(216,164,74,.35);',
    'box-shadow:0 18px 40px rgba(0,0,0,.45);',
    'opacity:0;transform:translateY(10px) scale(.96);transform-origin:100% 100%;visibility:hidden;',
    'transition:opacity .45s cubic-bezier(.16,1,.3,1),transform .45s cubic-bezier(.16,1,.3,1),visibility 0s .45s}',
    '.tgw.is-open .tgw-bubble{opacity:1;transform:none;visibility:visible;transition-delay:0s}',
    '.tgw-link{color:inherit;text-decoration:none}',
    '.tgw-link::after{content:"";position:absolute;inset:0;border-radius:inherit}',
    '.tgw-link:focus-visible{outline:none}.tgw-bubble:has(.tgw-link:focus-visible){outline:2px solid #D8A44A;outline-offset:3px}',
    '.tgw-bubble b{display:block;font-size:14px;font-weight:700;margin-bottom:3px}',
    '.tgw-bubble span{display:block;font-size:13px;line-height:1.4;color:#8A8F9C}',
    '.tgw-bubble em{font-style:normal;color:#D8A44A;font-weight:600}',
    '.tgw-x{position:absolute;z-index:1;top:6px;right:6px;width:24px;height:24px;border:0;border-radius:50%;cursor:pointer;',
    'background:transparent;color:#8A8F9C;font-size:18px;line-height:24px;padding:0}',
    '.tgw-x:hover{color:#EDE8DE;background:rgba(237,232,222,.08)}',

    '@keyframes tgw-in{0%{transform:scale(0) rotate(-30deg)}100%{transform:scale(1) rotate(0)}}',
    '@keyframes tgw-ring{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.75);opacity:0}}',
    '@keyframes tgw-fly{0%,82%,100%{transform:translate(0,0) rotate(0)}86%{transform:translate(3px,-3px) rotate(-10deg)}',
    '90%{transform:translate(-2px,1px) rotate(6deg)}94%{transform:translate(2px,-1px) rotate(-4deg)}}',

    '@media (max-width:600px){.tgw{right:14px;bottom:14px;gap:10px}.tgw-btn{width:56px;height:56px}',
    '.tgw-stack{gap:10px}.tgw-mini{width:44px;height:44px}.tgw-mini svg{width:22px;height:22px}',
    '.tgw-btn svg{width:27px;height:27px}.tgw-bubble{max-width:210px;padding:12px 30px 12px 14px}}',

    '@media (prefers-reduced-motion:reduce){.tgw-btn,.tgw-mini{animation:none;transform:none}.tgw-btn svg,.tgw-ring{animation:none}',
    '.tgw-ring{display:none}}'
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var plane = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.94 4.3 18.7 19.56c-.24 1.08-.88 1.35-1.79.84l-4.94-3.64-2.38 2.3c-.26.26-.48.48-.99.48l.35-5.02 9.14-8.26c.4-.35-.09-.55-.62-.2L6.17 13.17 1.3 11.65c-1.06-.33-1.08-1.06.22-1.57L20.55 2.75c.88-.33 1.66.2 1.39 1.55z"/></svg>';

  var wa = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 4.54 0 8.24 3.7 8.24 8.24 0 4.54-3.7 8.24-8.24 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z"/></svg>';
  var ig = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>';

  var root = document.createElement('div');
  root.className = 'tgw';
  root.innerHTML =
    '<div class="tgw-bubble">' +
      '<a class="tgw-link" href="' + TG_URL + '" target="_blank" rel="noopener">' +
        '<b>' + T.q + '</b>' +
        '<span>' + T.t + '</span>' +
      '</a>' +
      '<button type="button" class="tgw-x" aria-label="' + T.x + '">×</button>' +
    '</div>' +
    '<div class="tgw-stack">' +
      '<a class="tgw-mini tgw-ig" href="' + IG_URL + '" target="_blank" rel="noopener" aria-label="Instagram @autogroupkh" data-ch="instagram">' + ig + '</a>' +
      '<a class="tgw-mini tgw-wa" href="' + WA_URL + '" target="_blank" rel="noopener" aria-label="' + T.wa + '" data-ch="whatsapp">' + wa + '</a>' +
      '<a class="tgw-btn" href="' + TG_URL + '" target="_blank" rel="noopener" aria-label="' + T.tg + '" data-ch="telegram">' +
        '<i class="tgw-ring"></i><i class="tgw-ring"></i>' + plane +
        '<i class="tgw-dot">1</i>' +
      '</a>' +
    '</div>';

  function closed() {
    try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }
  function close() {
    root.classList.remove('is-open');
    try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
  }

  root.querySelector('.tgw-x').addEventListener('click', close);
  root.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      close();
      if (typeof window.gtag === 'function') window.gtag('event', (a.dataset.ch || 'telegram') + '_click', { link_url: a.href });
    });
  });

  function mount() {
    document.body.appendChild(root);
    if (!closed()) setTimeout(function () { if (!closed()) root.classList.add('is-open'); }, SHOW_BUBBLE_AFTER);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();

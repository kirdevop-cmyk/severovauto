// Плаваючий віджет Telegram справа внизу: пульсуюча кнопка + підказка-бульбашка.
// Підключається на кожній сторінці одним рядком: <script src="/tg-widget.js" defer></script>
(function () {
  if (window.__tgWidget) return;
  window.__tgWidget = true;

  var TG_URL = 'https://t.me/severovauto';
  var SHOW_BUBBLE_AFTER = 5000; // мс до появи підказки
  var KEY = 'tgw-closed';

  var css = [
    '.tgw{position:fixed;right:22px;bottom:22px;z-index:95;display:flex;align-items:flex-end;gap:14px;',
    'font-family:"Onest",system-ui,sans-serif;pointer-events:none}',
    '.tgw>*{pointer-events:auto}',

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
    '.tgw-btn svg{width:27px;height:27px}.tgw-bubble{max-width:210px;padding:12px 30px 12px 14px}}',

    '@media (prefers-reduced-motion:reduce){.tgw-btn{animation:none;transform:none}.tgw-btn svg,.tgw-ring{animation:none}',
    '.tgw-ring{display:none}}'
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var plane = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.94 4.3 18.7 19.56c-.24 1.08-.88 1.35-1.79.84l-4.94-3.64-2.38 2.3c-.26.26-.48.48-.99.48l.35-5.02 9.14-8.26c.4-.35-.09-.55-.62-.2L6.17 13.17 1.3 11.65c-1.06-.33-1.08-1.06.22-1.57L20.55 2.75c.88-.33 1.66.2 1.39 1.55z"/></svg>';

  var root = document.createElement('div');
  root.className = 'tgw';
  root.innerHTML =
    '<div class="tgw-bubble">' +
      '<a class="tgw-link" href="' + TG_URL + '" target="_blank" rel="noopener">' +
        '<b>Є питання щодо авто?</b>' +
        '<span>Напишіть менеджеру в <em>Telegram</em> — підберемо варіант і порахуємо вартість.</span>' +
      '</a>' +
      '<button type="button" class="tgw-x" aria-label="Закрити підказку">×</button>' +
    '</div>' +
    '<a class="tgw-btn" href="' + TG_URL + '" target="_blank" rel="noopener" aria-label="Написати в Telegram">' +
      '<i class="tgw-ring"></i><i class="tgw-ring"></i>' + plane +
      '<i class="tgw-dot">1</i>' +
    '</a>';

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
      if (typeof window.gtag === 'function') window.gtag('event', 'telegram_click', { link_url: TG_URL });
    });
  });

  function mount() {
    document.body.appendChild(root);
    if (!closed()) setTimeout(function () { if (!closed()) root.classList.add('is-open'); }, SHOW_BUBBLE_AFTER);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();

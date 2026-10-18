// Приймання заявок із форм сайту та надсилання їх у Telegram.
// Токен і chat_id беруться зі змінних оточення Vercel — у коді їх немає.
//   TELEGRAM_BOT_TOKEN — токен бота від @BotFather
//   TELEGRAM_CHAT_ID   — id чату/групи, куди падатимуть заявки

// Прибираємо керуючі символи (дефіси й пунктуацію не чіпаємо — вони є в телефонах)
// і обрізаємо довжину. Без регулярки, щоб у коді не було сирих керуючих байтів.
function clean(v, max) {
  const limit = max || 200;
  const src = String(v == null ? '' : v);
  let out = '';
  for (const ch of src) {
    const code = ch.codePointAt(0);
    out += (code < 32 || code === 127) ? ' ' : ch;
  }
  return out.replace(/\s+/g, ' ').trim().slice(0, limit);
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    // бот ще не підключений — фронт покаже телефон і Telegram як запасний варіант
    return res.status(503).json({ ok: false, error: 'not_configured' });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch (e) { body = {}; }
  }

  // пастка для ботів: поле приховане від людей, заповнене — значить спам
  if (clean(body.company)) return res.status(200).json({ ok: true });

  const name = clean(body.name, 80);
  const phone = clean(body.phone, 40);
  if (!name || !phone) return res.status(400).json({ ok: false, error: 'validation' });

  const digits = phone.replace(/\D/g, '');
  if (digits.length < 9) return res.status(400).json({ ok: false, error: 'phone' });

  const extras = [
    ['Сторінка', clean(body.page, 60)],
    ['Звідки', clean(body.origin, 60)],
    ['Бюджет', clean(body.budget, 60)],
    ['Двигун', clean(body.engine || body.fuel, 60)],
    ['Клас', clean(body.class, 60)],
    ['Тема', clean(body.topic, 80)],
    ['Стан авто', clean(body.state, 60)],
    ['Рік', clean(body.year, 20)],
    ['Авто', clean(body.car, 200)],
    ['Коментар', clean(body.comment, 300)]
  ].filter(function (pair) { return pair[1]; });

  const lines = ['<b>🚗 Нова заявка з сайту</b>', '',
    '<b>Ім\'я:</b> ' + esc(name),
    '<b>Телефон:</b> ' + esc(phone)
  ].concat(extras.map(function (pair) {
    return '<b>' + pair[0] + ':</b> ' + esc(pair[1]);
  }));

  try {
    const tg = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    if (!tg.ok) {
      const detail = await tg.text();
      console.error('telegram error', tg.status, detail.slice(0, 300));
      return res.status(502).json({ ok: false, error: 'telegram' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('lead handler error', e && e.message);
    return res.status(500).json({ ok: false, error: 'server' });
  }
}

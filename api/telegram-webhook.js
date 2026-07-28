const TELEGRAM_API = 'https://api.telegram.org';

function appUrl() {
  return (process.env.APP_URL || 'https://irish-theory-practice.vercel.app').replace(/\/$/, '');
}

function messageFor(command) {
  const messages = {
    '/start': {
      text: '👋 Ласкаво просимо до Irish Driving Theory Test!\n\n🇮🇪 Готуйтеся до теоретичного іспиту з водіння в Ірландії.\n\n✅ 801 питання\n✅ Режим офіційного іспиту\n✅ Робота над помилками\n✅ Закладки та статистика\n✅ Збереження і синхронізація прогресу\n\n🚗 Оберіть зручний спосіб навчання:',
      button: '🚗 Відкрити мінізастосунок',
      showWebVersion: true
    },
    '/continue': {
      text: '▶️ Продовжуйте навчання з останнього збереженого питання.',
      button: 'Продовжити навчання'
    },
    '/exam': {
      text: '📝 Відкрийте застосунок і оберіть режим «Офіційний іспит».',
      button: 'Відкрити іспит'
    },
    '/mistakes': {
      text: '❌ Відкрийте застосунок, щоб повторити питання з помилками.',
      button: 'Робота над помилками'
    },
    '/bookmarks': {
      text: '⭐ Відкрийте застосунок, щоб переглянути збережені питання.',
      button: 'Відкрити закладки'
    },
    '/support': {
      text: '💬 Напишіть своє запитання у відповідь на це повідомлення або скористайтеся контактами підтримки в застосунку.',
      button: 'Відкрити застосунок'
    }
  };

  return messages[command] || messages['/start'];
}

async function sendMessage(token, chatId, payload) {
  const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: payload.text,
      reply_markup: {
        inline_keyboard: [
          [{ text: payload.button, web_app: { url: appUrl() } }],
          ...(payload.showWebVersion ? [[{ text: '🌐 Відкрити повний сайт', url: appUrl() }]] : [])
        ]
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram sendMessage failed: ${response.status} ${body}`);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed'
    });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return res.status(500).json({
      ok: false,
      error: 'TELEGRAM_BOT_TOKEN is missing'
    });
  }

  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (configuredSecret) {
    const receivedSecret = req.headers['x-telegram-bot-api-secret-token'];

    if (receivedSecret !== configuredSecret) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid webhook secret'
      });
    }
  }

  try {
    const update = req.body || {};
    const message = update.message;

    if (!message || !message.chat || typeof message.text !== 'string') {
      return res.status(200).json({
        ok: true,
        ignored: true
      });
    }

    const command = message.text
      .trim()
      .split(/\s+/)[0]
      .toLowerCase()
      .split('@')[0];

    const supported = [
      '/start',
      '/continue',
      '/exam',
      '/mistakes',
      '/bookmarks',
      '/support'
    ];

    if (!supported.includes(command)) {
      return res.status(200).json({
        ok: true,
        ignored: true
      });
    }

    await sendMessage(token, message.chat.id, messageFor(command));

    return res.status(200).json({
      ok: true
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: 'Webhook processing failed'
    });
  }
};

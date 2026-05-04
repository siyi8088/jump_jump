import { Telegraf } from 'telegraf';
import { config } from './config.js';

let bot: Telegraf | null = null;

export const initBot = () => {
  if (!config.botToken) {
    console.warn('⚠️ No BOT_TOKEN provided, Telegram bot features disabled.');
    return;
  }

  bot = new Telegraf(config.botToken);

  bot.start((ctx) => {
    // 这里直接使用 Caddy 代理的前端静态资源 URL
    const imageUrl = 'https://jump.garden/poster.png';
    const webAppUrl = 'https://jump.garden';

    const caption = (
      "Welcome to Jump Garden! 🚀\n\n" +
      "Navigate your iconic paper plane through a neon-lit cyber space of server racks and glowing nodes.\n\n" +
      "⚡️ Hold to charge, release to leap. One missed step, and you fall into the digital abyss!\n\n" +
      "Can you dominate the global leaderboard? Prove your skills and take flight now! 👇"
    );
    ctx.replyWithPhoto(
      { url: imageUrl },
      {
        caption,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Let's Jump 🚀",
                web_app: { url: webAppUrl }
              }
            ]
          ]
        }
      }
    ).catch((err) => {
      console.error('Failed to send photo, falling back to text:', err);
      // 如果图片加载失败，退回到纯文本模式
      ctx.reply(caption, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🎮 Play Jump Jump',
                web_app: { url: webAppUrl }
              }
            ]
          ]
        }
      });
    });
  });

  bot.launch().then(() => {
    console.log('🤖 Telegram Bot is running in polling mode...');
  }).catch((err) => {
    console.error('Failed to launch Telegram Bot:', err);
  });

  // Enable graceful stop
  process.once('SIGINT', () => bot?.stop('SIGINT'));
  process.once('SIGTERM', () => bot?.stop('SIGTERM'));
};

export const getBot = () => bot;

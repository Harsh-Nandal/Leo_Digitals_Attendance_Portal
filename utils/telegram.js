

import axios from "axios";

const TELEGRAM_API = "https://api.telegram.org";

export const sendTelegramMessage = async (message) => {
  if (!message || typeof message !== "string") {
    console.warn("⚠️ Telegram message is empty");
    return;
  }

  const BOT_TOKEN = "8072882753:AAGXU1N6E3ZDGHb91oxCWUaBZSRHaSvIzSY"; // Move to .env for security
  const CHAT_ID = "6693684914";

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("❌ Telegram ENV variables missing");
    return;
  }

  try {
    await axios.post(
      `${TELEGRAM_API}/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      },
      { timeout: 10000 }
    );

    console.log("📨 Telegram message sent");
  } catch (err) {
    console.error(
      "❌ Telegram send failed:",
      err.response?.data || err.message
    );
  }
};

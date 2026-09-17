import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { message } = await request.json();

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: "TELEGRAM_BOT_TOKEN หรือ TELEGRAM_CHAT_ID ไม่ถูกตั้งค่า" },
        { status: 500 }
      );
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const res = await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.description }, { status: res.status });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

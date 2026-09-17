import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { message } = await request.json();

    // ดึง Token และ Chat ID จาก Server Environment Variables (ไม่ต้องมี NEXT_PUBLIC_)
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: "ไม่ได้ตั้งค่า TELEGRAM_BOT_TOKEN หรือ TELEGRAM_CHAT_ID ใน Server Environment Variables" },
        { status: 500 }
      );
    }

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );

    const data = await telegramRes.json();

    if (!telegramRes.ok) {
      return NextResponse.json(
        { error: "Telegram API Error", details: data },
        { status: telegramRes.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Telegram Route Handler Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}

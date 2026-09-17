// ฟังก์ชันยิงข้อความผ่าน Internal API Route
const sendTelegramMessage = async (messageText) => {
  try {
    const res = await fetch("/api/telegram", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: messageText,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("ส่งการแจ้งเตือน Telegram ไม่สำเร็จ (Server Error):", res.status, errorData);
    }
  } catch (err) {
    // แม้ Network หรือ API จะมีปัญหา ก็จะไม่กระทบขั้นตอนการบันทึกขายสำเร็จในหน้าเว็บ
    console.error("ส่งการแจ้งเตือน Telegram ไม่สำเร็จ (Network Error):", err);
  }
};

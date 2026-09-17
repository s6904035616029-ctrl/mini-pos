// ฟังก์ชันยิงข้อความผ่าน Internal API Route
  const sendTelegramMessage = async (messageText) => {
    try {
      await fetch("/api/telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageText,
        }),
      });
    } catch (err) {
      // แม้ API จะมีปัญหา ก็จะไม่กระทบขั้นตอนการบันทึกขายสำเร็จในหน้าเว็บ
      console.error("ส่งการแจ้งเตือน Telegram ไม่สำเร็จ:", err);
    }
  };

"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function SellPage() {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. ดึงรายการสินค้าทั้งหมดเมื่อเริ่มหน้าเว็บ
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      alert("เกิดข้อผิดพลาดในการดึงรายการสินค้า: " + error.message);
    } else {
      setProducts(data || []);
      if (data && data.length > 0) {
        setSelectedProductId(data[0].id);
      }
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // ฟังก์ชันช่วยเหลือในการยิง Telegram API
  const sendTelegramMessage = async (messageText) => {
    const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.warn("ไม่ได้ตั้งค่า Telegram Bot Token หรือ Chat ID ใน Environment Variables");
      return;
    }

    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: "HTML",
        }),
      });
    } catch (err) {
      console.error("ส่งการแจ้งเตือน Telegram ไม่สำเร็จ:", err);
    }
  };

  // 2. เพิ่มสินค้าเข้าตะกร้า
  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const qtyNum = Number(quantity);
    if (qtyNum <= 0) {
      alert("กรุณาระบุจำนวนสินค้าให้ถูกต้อง");
      return;
    }

    // ตรวจสอบสต็อกว่าพอสำหรับสินค้าชิ้นนี้หรือไม่ (รวมที่อยู่ในตะกร้าแล้วด้วย)
    const existingIndex = cart.findIndex((item) => item.product_id === selectedProduct.id);
    const currentQtyInCart = existingIndex !== -1 ? cart[existingIndex].quantity : 0;
    const totalRequestQty = currentQtyInCart + qtyNum;

    if (selectedProduct.stock < totalRequestQty) {
      alert(`สินค้าในสต็อกไม่พอ! (มีคงเหลือ ${selectedProduct.stock} ${selectedProduct.unit || "ชิ้น"})`);
      return;
    }

    if (existingIndex !== -1) {
      // มีสินค้านี้ในตะกร้าแล้ว -> อัปเดตจำนวน
      const updatedCart = [...cart];
      const updatedQty = updatedCart[existingIndex].quantity + qtyNum;
      updatedCart[existingIndex] = {
        ...updatedCart[existingIndex],
        quantity: updatedQty,
        total_price: updatedQty * Number(selectedProduct.price),
      };
      setCart(updatedCart);
    } else {
      // ยังไม่มีในตะกร้า -> เพิ่มรายการใหม่
      setCart([
        ...cart,
        {
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          price: Number(selectedProduct.price),
          quantity: qtyNum,
          total_price: qtyNum * Number(selectedProduct.price),
          unit: selectedProduct.unit || "ชิ้น",
          stock: selectedProduct.stock,
        },
      ]);
    }

    setQuantity(1); // รีเซ็ตจำนวนเป็น 1
  };

  // 3. ปรับจำนวนหรือลบสินค้าออกจากตะกร้า
  const handleRemoveFromCart = (index) => {
    const updatedCart = cart.filter((_, i) => i !== index);
    setCart(updatedCart);
  };

  // 4. คำนวณราคารวมของทั้งตะกร้า
  const grandTotal = cart.reduce((sum, item) => sum + item.total_price, 0);

  // 5. ชำระเงิน/ขายสินค้าทั้งหมดในตะกร้า (อัปเดตสต็อก, ลงตาราง sales และแจ้งเตือน Telegram)
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("กรุณาเลือกสินค้าใส่ตะกร้าก่อนทำรายการ");
      return;
    }

    setLoading(true);

    try {
      const salesData = cart.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        total_price: item.total_price,
        sold_at: new Date().toISOString(),
      }));

      // 5.1 บันทึกทุกรายการขายลงตาราง sales
      const { error: salesError } = await supabase.from("sales").insert(salesData);
      if (salesError) throw salesError;

      const currentTime = new Date().toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
      });

      // 5.2 ตัดสต็อกสินค้าแต่ละรายการในตาราง products พร้อมส่งแจ้งเตือน Telegram
      for (const item of cart) {
        const targetProduct = products.find((p) => p.id === item.product_id);
        if (targetProduct) {
          const newStock = targetProduct.stock - item.quantity;

          // อัปเดตสต็อกใน Supabase
          const { error: updateError } = await supabase
            .from("products")
            .update({ stock: newStock })
            .eq("id", item.product_id);

          if (updateError) throw updateError;

          // ----------------------------------------------------
          // ระบบแจ้งเตือน Telegram (ทำงานแบบ Async ไม่บล็อก UI)
          // ----------------------------------------------------

          // งานที่ 1: แจ้งเตือน Order เข้า (New Order Alert)
          const newOrderMsg =
            `🛍️ <b>มีรายการขายใหม่!</b>\n\n` +
            `- สินค้า: ${item.product_name}\n` +
            `- จำนวน: ${item.quantity} ${item.unit || "ชิ้น"}\n` +
            `- ราคารวม: ${item.total_price.toLocaleString()} บาท\n` +
            `- สต๊อกคงเหลือปัจจุบัน: ${newStock} ${item.unit || "ชิ้น"}\n` +
            `- เวลา: ${currentTime}`;

          await sendTelegramMessage(newOrderMsg);

          // งานที่ 2: แจ้งเตือน Stock เหลือน้อย (Low Stock Alert <= 5 ชิ้น)
          if (newStock <= 5) {
            const lowStockMsg =
              `🚨 <b>[เตือนภัย] สต๊อกสินค้าใกล้หมด!</b>\n\n` +
              `- สินค้า: ${item.product_name}\n` +
              `- คงเหลือเพียง: ${newStock} ${item.unit || "ชิ้น"}\n\n` +
              `⚠️ กรุณาเติมสต๊อกสินค้าด่วน!`;

            await sendTelegramMessage(lowStockMsg);
          }
        }
      }

      alert("บันทึกการขายและส่งแจ้งเตือนสำเร็จเรียบร้อย!");
      setCart([]);
      fetchProducts();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการขาย: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* ส่วนสรุปราคารวมขนาดใหญ่ด้านบนสุด */}
      <div
        class="card"
        style={{
          backgroundColor: "#1e293b",
          color: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.5rem 2rem",
          marginBottom: "1.5rem",
          borderRadius: "12px",
        }}
      >
        <div>
          <span style={{ fontSize: "1rem", color: "#94a3b8" }}>ยอดรวมทั้งหมด (Grand Total)</span>
          <h1 style={{ fontSize: "3rem", margin: 0, color: "#38bdf8", fontWeight: "800" }}>
            ฿{grandTotal.toLocaleString()}
          </h1>
        </div>
        <div>
          <button
            class="btn"
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
            style={{
              fontSize: "1.25rem",
              padding: "0.8rem 2rem",
              backgroundColor: cart.length > 0 ? "var(--success-color)" : "#64748b",
              cursor: cart.length > 0 ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "กำลังบันทึก..." : "ยืนยันชำระเงิน"}
          </button>
        </div>
      </div>

      {/* สองคอลัมน์ให้อยู่ในจอเดียวกัน: ซ้ายเลือกสินค้า / ขวาตารางตะกร้า */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "1.5rem" }}>
        
        {/* ฝั่งซ้าย: เลือกสินค้าใส่ตะกร้า */}
        <div class="card">
          <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>1. เลือกสินค้า</h2>
          <form onSubmit={handleAddToCart}>
            <div class="form-group">
              <label>รายการสินค้า</label>
              <select
                class="input"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                {products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — ฿{Number(item.price).toLocaleString()} (คงเหลือ {item.stock} {item.unit || "ชิ้น"})
                  </option>
                ))}
              </select>
            </div>

            <div class="form-group">
              <label>จำนวน</label>
              <input
                type="number"
                class="input"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            {selectedProduct && (
              <div style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                ราคาชิ้นละ: <strong>฿{Number(selectedProduct.price).toLocaleString()}</strong> |
                สต็อกคงเหลือ: <strong>{selectedProduct.stock} {selectedProduct.unit || "ชิ้น"}</strong>
              </div>
            )}

            <button type="submit" class="btn" style={{ width: "100%", padding: "0.6rem" }}>
              + เพิ่มเข้าตะกร้า
            </button>
          </form>
        </div>

        {/* ฝั่งขวา: ตะกร้าสินค้าและสรุปรายการ */}
        <div class="card">
          <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
            2. ตะกร้าสินค้า ({cart.length} รายการ)
          </h2>

          {cart.length === 0 ? (
            <p style={{ color: "var(--text-muted)", padding: "2rem 0", textAlign: "center" }}>
              ยังไม่มีสินค้าในตะกร้า เลือกสินค้าจากด้านซ้ายเพื่อเริ่มขาย
            </p>
          ) : (
            <table class="table">
              <thead>
                <tr>
                  <th>ชื่อสินค้า</th>
                  <th style={{ textAlign: "right" }}>ราคา</th>
                  <th style={{ textAlign: "center" }}>จำนวน</th>
                  <th style={{ textAlign: "right" }}>รวม</th>
                  <th style={{ textAlign: "center" }}>ลบ</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, index) => (
                  <tr key={index}>
                    <td style={{ fontWeight: "500" }}>{item.product_name}</td>
                    <td style={{ textAlign: "right" }}>฿{item.price.toLocaleString()}</td>
                    <td style={{ textAlign: "center" }}>{item.quantity}</td>
                    <td style={{ textAlign: "right", fontWeight: "bold" }}>
                      ฿{item.total_price.toLocaleString()}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        class="btn btn-danger"
                        style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                        onClick={() => handleRemoveFromCart(index)}
                      >
                        X
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

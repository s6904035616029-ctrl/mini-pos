"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function SellPage() {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

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
      console.error("ส่งการแจ้งเตือน Telegram ไม่สำเร็จ (Network Error):", err);
    }
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const qtyNum = Number(quantity);
    if (qtyNum <= 0) {
      alert("กรุณาระบุจำนวนสินค้าให้ถูกต้อง");
      return;
    }

    const existingIndex = cart.findIndex((item) => item.product_id === selectedProduct.id);
    const currentQtyInCart = existingIndex !== -1 ? cart[existingIndex].quantity : 0;
    const totalRequestQty = currentQtyInCart + qtyNum;

    if (selectedProduct.stock < totalRequestQty) {
      alert(`สินค้าในสต็อกไม่พอ! (มีคงเหลือ ${selectedProduct.stock} ${selectedProduct.unit || "ชิ้น"})`);
      return;
    }

    if (existingIndex !== -1) {
      const updatedCart = [...cart];
      const updatedQty = updatedCart[existingIndex].quantity + qtyNum;
      updatedCart[existingIndex] = {
        ...updatedCart[existingIndex],
        quantity: updatedQty,
        total_price: updatedQty * Number(selectedProduct.price),
      };
      setCart(updatedCart);
    } else {
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

    setQuantity(1);
  };

  const handleRemoveFromCart = (index) => {
    const updatedCart = cart.filter((_, i) => i !== index);
    setCart(updatedCart);
  };

  const grandTotal = cart.reduce((sum, item) => sum + item.total_price, 0);

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

      const { error: salesError } = await supabase.from("sales").insert(salesData);
      if (salesError) throw salesError;

      const currentTime = new Date().toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
      });

      for (const item of cart) {
        const targetProduct = products.find((p) => p.id === item.product_id);
        if (targetProduct) {
          const newStock = targetProduct.stock - item.quantity;

          const { error: updateError } = await supabase
            .from("products")
            .update({ stock: newStock })
            .eq("id", item.product_id);

          if (updateError) throw updateError;

          const newOrderMsg =
            `🛍️ <b>มีรายการขายใหม่!</b>\n\n` +
            `- สินค้า: ${item.product_name}\n` +
            `- จำนวน: ${item.quantity} ${item.unit || "ชิ้น"}\n` +
            `- ราคารวม: ${item.total_price.toLocaleString()} บาท\n` +
            `- สต๊อกคงเหลือปัจจุบัน: ${newStock} ${item.unit || "ชิ้น"}\n` +
            `- เวลา: ${currentTime}`;

          await sendTelegramMessage(newOrderMsg);

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

      alert("บันทึกการขายสำเร็จเรียบร้อย!");
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
      <div
        className="card"
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
            className="btn"
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
            style={{
              fontSize: "1.25rem",
              padding: "0.8rem 2rem",
              backgroundColor: cart.length > 0 ? "var(--success-color, #22c55e)" : "#64748b",
              cursor: cart.length > 0 ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "กำลังบันทึก..." : "ยืนยันชำระเงิน"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "1.5rem" }}>
        <div className="card">
          <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>1. เลือกสินค้า</h2>
          <form onSubmit={handleAddToCart}>
            <div className="form-group">
              <label>รายการสินค้า</label>
              <select
                className="input"
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

            <div className="form-group">
              <label>จำนวน</label>
              <input
                type="number"
                className="input"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            {selectedProduct && (
              <div style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "var(--text-muted, #64748b)" }}>
                ราคาชิ้นละ: <strong>฿{Number(selectedProduct.price).toLocaleString()}</strong> |
                สต็อกคงเหลือ: <strong>{selectedProduct.stock} {selectedProduct.unit || "ชิ้น"}</strong>
              </div>
            )}

            <button type="submit" className="btn" style={{ width: "100%", padding: "0.6rem" }}>
              + เพิ่มเข้าตะกร้า
            </button>
          </form>
        </div>

        <div className="card">
          <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
            2. ตะกร้าสินค้า ({cart.length} รายการ)
          </h2>

          {cart.length === 0 ? (
            <p style={{ color: "var(--text-muted, #64748b)", padding: "2rem 0", textAlign: "center" }}>
              ยังไม่มีสินค้าในตะกร้า เลือกสินค้าจากด้านซ้ายเพื่อเริ่มขาย
            </p>
          ) : (
            <table className="table">
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
                        className="btn btn-danger"
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

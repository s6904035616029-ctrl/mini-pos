"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function SellPage() {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  // 1. ดึงรายการสินค้าที่มีอยู่เพื่อนำมาแสดงใน Dropdown
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
      // ตั้งค่าเริ่มต้นเลือกสินค้าชิ้นแรก (ถ้ามี)
      if (data && data.length > 0) {
        setSelectedProductId(data[0].id);
      }
    }
  };

  // ค้นหาสินค้าปัจจุบันที่เลือกอยู่ใน Dropdown
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // คำนวณราคารวมอัตโนมัติ
  const totalPrice = selectedProduct
    ? Number(selectedProduct.price) * (Number(quantity) || 0)
    : 0;

  // 2. จัดการการบันทึกการขายและตัดสต็อก
  const handleSell = async (e) => {
    e.preventDefault();

    if (!selectedProduct) {
      alert("กรุณาเลือกสินค้า");
      return;
    }

    const sellQty = Number(quantity);

    if (sellQty <= 0) {
      alert("จำนวนสินค้าต้องมากกว่า 0");
      return;
    }

    // ตรวจสอบว่าสต็อกเพียงพอหรือไม่
    if (selectedProduct.stock < sellQty) {
      alert(
        `สินค้าไม่พอขาย! (คงเหลือเพียง ${selectedProduct.stock} ${selectedProduct.unit || "ชิ้น"})`
      );
      return;
    }

    setLoading(true);

    try {
      // 2.1 บันทึกข้อมูลลงตาราง sales
      const { error: salesError } = await supabase.from("sales").insert([
        {
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          quantity: sellQty,
          total_price: totalPrice,
          sold_at: new Date().toISOString(),
        },
      ]);

      if (salesError) throw salesError;

      // 2.2 อัปเดตสต็อกในตาราง products
      const newStock = selectedProduct.stock - sellQty;
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", selectedProduct.id);

      if (updateError) throw updateError;

      alert(`ขายสำเร็จ! ตัดสต็อกเรียบร้อยแล้ว`);

      // รีเซ็ตจำนวนและดึงข้อมูลสต็อกใหม่
      setQuantity(1);
      await fetchProducts();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการทำรายการ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>ขายสินค้า (POS)</h1>

      <div class="card" style={{ maxWidth: "600px", margin: "0 auto" }}>
        <form onSubmit={handleSell}>
          {/* Dropdown เลือกสินค้า */}
          <div class="form-group">
            <label>เลือกสินค้า</label>
            {products.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                ไม่มีสินค้าในระบบ กรุณาเพิ่มสินค้าก่อน
              </p>
            ) : (
              <select
                class="input"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                {products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — ฿{Number(item.price).toLocaleString()} (คงเหลือ{" "}
                    {item.stock} {item.unit || "ชิ้น"})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* กรอกจำนวน */}
          <div class="form-group">
            <label>จำนวนที่จะขาย</label>
            <input
              type="number"
              class="input"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          {/* สรุปข้อมูลการขาย */}
          {selectedProduct && (
            <div
              style={{
                backgroundColor: "#f1f5f9",
                padding: "1rem",
                borderRadius: "6px",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <span>ราคาต่อหน่วย:</span>
                <span>฿{Number(selectedProduct.price).toLocaleString()}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <span>จำนวนคงเหลือในสต็อก:</span>
                <span
                  style={{
                    color:
                      selectedProduct.stock < Number(quantity)
                        ? "var(--danger-color)"
                        : "inherit",
                    fontWeight:
                      selectedProduct.stock < Number(quantity)
                        ? "bold"
                        : "normal",
                  }}
                >
                  {selectedProduct.stock} {selectedProduct.unit || "ชิ้น"}
                </span>
              </div>
              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid var(--border-color)",
                  margin: "0.5rem 0",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  color: "var(--primary-color)",
                }}
              >
                <span>ราคารวมทั้งหมด:</span>
                <span>฿{totalPrice.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* ปุ่มยืนยันการขาย */}
          <button
            type="submit"
            class="btn"
            style={{ width: "100%", padding: "0.75rem", fontSize: "1rem" }}
            disabled={loading || products.length === 0}
          >
            {loading ? "กำลังทำรายการ..." : "บันทึกการขาย"}
          </button>
        </form>
      </div>
    </div>
  );
}

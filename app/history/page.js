"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function HistoryPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. ดึงประวัติการขายจาก Supabase เมื่อโหลดหน้าเว็บ
  useEffect(() => {
    fetchSalesHistory();
  }, []);

  const fetchSalesHistory = async () => {
    setLoading(true);
    // ดึงข้อมูลรายการขายทั้งหมด เรียงจากล่าสุดไปเก่าสุด
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("sold_at", { ascending: false });

    if (error) {
      alert("เกิดข้อผิดพลาดในการดึงประวัติการขาย: " + error.message);
    } else {
      setSales(data || []);
    }
    setLoading(false);
  };

  // 2. คำนวณยอดขายรวมทั้งหมด (Sum of total_price)
  const grandTotal = sales.reduce(
    (sum, item) => sum + (Number(item.total_price) || 0),
    0
  );

  // ฟังก์ชันแปลงรูปแบบวันที่และเวลาให้อ่านง่าย
  const formatDate = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>ประวัติการขาย</h1>

      {/* 3. สรุปยอดขายรวมทั้งหมด */}
      <div
        class="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#eff6ff",
          borderColor: "#bfdbfe",
        }}
      >
        <div>
          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            ยอดขายรวมทั้งหมด
          </span>
          <h2 style={{ color: "var(--primary-color)", fontSize: "1.8rem" }}>
            ฿{grandTotal.toLocaleString()}
          </h2>
        </div>
        <div style={{ textAlign: "right", color: "var(--text-muted)" }}>
          <span>จำนวนรายการขายทั้งหมด: </span>
          <strong>{sales.length}</strong> รายการ
        </div>
      </div>

      {/* 4. ตารางแสดงรายการประวัติการขาย */}
      <div class="card">
        <h2 style={{ fontSize: "1.1rem" }}>รายการขายทั้งหมด</h2>
        {loading ? (
          <p style={{ marginTop: "1rem", color: "var(--text-muted)" }}>
            กำลังโหลดข้อมูล...
          </p>
        ) : sales.length === 0 ? (
          <p style={{ marginTop: "1rem", color: "var(--text-muted)" }}>
            ยังไม่มีประวัติการขาย
          </p>
        ) : (
          <table class="table">
            <thead>
              <tr>
                <th>วัน-เวลาที่ขาย</th>
                <th>ชื่อสินค้า</th>
                <th style={{ textAlign: "right" }}>จำนวน</th>
                <th style={{ textAlign: "right" }}>ยอดรวม (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((item) => (
                <tr key={item.id}>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    {formatDate(item.sold_at)}
                  </td>
                  <td style={{ fontWeight: "500" }}>{item.product_name}</td>
                  <td style={{ textAlign: "right" }}>
                    {Number(item.quantity).toLocaleString()}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: "bold",
                      color: "var(--primary-color)",
                    }}
                  >
                    ฿{Number(item.total_price).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

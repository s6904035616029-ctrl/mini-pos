"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // State สำหรับฟอร์มเพิ่มสินค้าใหม่
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    price: "",
    stock: "",
    unit: "ชิ้น",
  });

  // State สำหรับการแก้ไขสินค้า (ถ้าเป็น null คือไม่ได้แก้ไขใครอยู่)
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // 1. ดึงข้อมูลสินค้าจาก Supabase เมื่อโหลดหน้าเว็บ
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("เกิดข้อผิดพลาดในการดึงข้อมูล: " + error.message);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  // 2. เพิ่มสินค้าใหม่
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.sku || !formData.name) {
      alert("กรุณากรอก SKU และชื่อสินค้า");
      return;
    }

    const { error } = await supabase.from("products").insert([
      {
        sku: formData.sku,
        name: formData.name,
        price: Number(formData.price) || 0,
        stock: Number(formData.stock) || 0,
        unit: formData.unit,
      },
    ]);

    if (error) {
      alert("เพิ่มสินค้าไม่สำเร็จ: " + error.message);
    } else {
      setFormData({ sku: "", name: "", price: "", stock: "", unit: "ชิ้น" });
      fetchProducts();
    }
  };

  // 3. เริ่มต้นแก้ไขแบบ Inline
  const handleStartEdit = (product) => {
    setEditingId(product.id);
    setEditFormData({ ...product });
  };

  // บันทึกการแก้ไขสินค้า
  const handleUpdate = async (id) => {
    const { error } = await supabase
      .from("products")
      .update({
        sku: editFormData.sku,
        name: editFormData.name,
        price: Number(editFormData.price) || 0,
        stock: Number(editFormData.stock) || 0,
        unit: editFormData.unit,
      })
      .eq("id", id);

    if (error) {
      alert("แก้ไขข้อมูลไม่สำเร็จ: " + error.message);
    } else {
      setEditingId(null);
      fetchProducts();
    }
  };

  // 4. ลบสินค้า
  const handleDelete = async (id) => {
    if (!confirm("คุณต้องการลบสินค้านี้ใช่หรือไม่?")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      alert("ลบสินค้าไม่สำเร็จ: " + error.message);
    } else {
      fetchProducts();
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>จัดการรายการสินค้า</h1>

      {/* ฟอร์มเพิ่มสินค้าใหม่ */}
      <div class="card">
        <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>เพิ่มสินค้าใหม่</h2>
        <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", alignItems: "end" }}>
          <div class="form-group" style={{ marginBottom: 0 }}>
            <label>SKU</label>
            <input
              class="input"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="เช่น DRY-SKIN-500"
              required
            />
          </div>
          <div class="form-group" style={{ marginBottom: 0 }}>
            <label>ชื่อสินค้า</label>
            <input
              class="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ชื่อสินค้า"
              required
            />
          </div>
          <div class="form-group" style={{ marginBottom: 0 }}>
            <label>ราคา</label>
            <input
              type="number"
              class="input"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div class="form-group" style={{ marginBottom: 0 }}>
            <label>จำนวนคงเหลือ</label>
            <input
              type="number"
              class="input"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              placeholder="0"
            />
          </div>
          <div class="form-group" style={{ marginBottom: 0 }}>
            <label>หน่วย</label>
            <input
              class="input"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="เช่น ชิ้น, ถุง, ซอง"
            />
          </div>
          <button type="submit" class="btn" style={{ height: "40px" }}>
            + เพิ่มสินค้า
          </button>
        </form>
      </div>

      {/* ตารางแสดงรายการสินค้า */}
      <div class="card">
        <h2 style={{ fontSize: "1.1rem" }}>รายการสินค้าในสต็อก</h2>
        {loading ? (
          <p style={{ marginTop: "1rem", color: "var(--text-muted)" }}>กำลังโหลดข้อมูล...</p>
        ) : products.length === 0 ? (
          <p style={{ marginTop: "1rem", color: "var(--text-muted)" }}>ยังไม่มีรายการสินค้า</p>
        ) : (
          <table class="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>ชื่อสินค้า</th>
                <th>ราคา (บาท)</th>
                <th>คงเหลือ</th>
                <th>หน่วย</th>
                <th style={{ textAlign: "center" }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {products.map((item) => {
                const isEditing = editingId === item.id;
                return (
                  <tr key={item.id}>
                    <td>
                      {isEditing ? (
                        <input
                          class="input"
                          value={editFormData.sku}
                          onChange={(e) => setEditFormData({ ...editFormData, sku: e.target.value })}
                        />
                      ) : (
                        item.sku
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          class="input"
                          value={editFormData.name}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        />
                      ) : (
                        item.name
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          class="input"
                          value={editFormData.price}
                          onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                        />
                      ) : (
                        Number(item.price).toLocaleString()
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          class="input"
                          value={editFormData.stock}
                          onChange={(e) => setEditFormData({ ...editFormData, stock: e.target.value })}
                        />
                      ) : (
                        item.stock
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          class="input"
                          value={editFormData.unit}
                          onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
                        />
                      ) : (
                        item.unit
                      )}
                    </td>
                    <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                      {isEditing ? (
                        <>
                          <button class="btn" style={{ marginRight: "0.5rem" }} onClick={() => handleUpdate(item.id)}>
                            บันทึก
                          </button>
                          <button class="btn btn-danger" onClick={() => setEditingId(null)}>
                            ยกเลิก
                          </button>
                        </>
                      ) : (
                        <>
                          <button class="btn" style={{ marginRight: "0.5rem" }} onClick={() => handleStartEdit(item)}>
                            แก้ไข
                          </button>
                          <button class="btn btn-danger" onClick={() => handleDelete(item.id)}>
                            ลบ
                          </button>
                        </>
                      ) }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Mini POS',
  description: 'ระบบจัดการร้านค้าและขายหน้าร้านอย่างง่าย',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <header class="navbar">
          <div class="logo">Mini POS</div>
          <nav>
            <Link href="/">สินค้า</Link>
            <Link href="/sell">ขายสินค้า</Link>
            <Link href="/history">ประวัติการขาย</Link>
          </nav>
        </header>
        <main class="container">
          {children}
        </main>
      </body>
    </html>
  );
}

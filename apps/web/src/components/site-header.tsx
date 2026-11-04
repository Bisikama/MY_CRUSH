import Link from 'next/link';
export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="logo" href="/">
        <span className="logo-mark">D</span>DuoQuest<span className="logo-dot">•</span>
      </Link>
      <nav aria-label="Điều hướng chính">
        <Link href="/">Chơi</Link>
        <Link href="/packs">Bộ câu hỏi</Link>
        <Link href="/shop">Shop</Link>
        <Link href="/profile">Hồ sơ</Link>
      </nav>
      <span className="lan-badge">
        <i /> LOCAL / LAN
      </span>
    </header>
  );
}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, Compass, House, MapPin, UserRound } from 'lucide-react';

const tabs = [
  { href: '/', label: 'Beranda', icon: House },
  { href: '/wisata', label: 'Jelajah', icon: Compass },
  { href: '/peta', label: 'Peta', icon: MapPin },
  { href: '/favorit', label: 'Favorit', icon: Bookmark },
  { href: '/penjual/masuk', label: 'Akun', icon: UserRound },
];

export default function PublicTabBar() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin') || pathname.startsWith('/penjual')) return null;
  return (
    <nav className="ios-global-tabbar" aria-label="Navigasi utama">
      {tabs.map(({ href, label, icon: Icon }) => {
        const exploreRoutes = ['/wisata', '/kuliner', '/penginapan', '/produk', '/usaha', '/cari'];
        const active = href === '/' ? pathname === '/' : href === '/wisata' ? exploreRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`)) : pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} href={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}><Icon size={19} strokeWidth={active ? 2.25 : 1.8}/><span>{label}</span></Link>;
      })}
    </nav>
  );
}

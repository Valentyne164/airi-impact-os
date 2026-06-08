"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  badge?: number;
}

interface Props {
  items: NavItem[];
}

export default function NavLinks({ items }: Props) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    // exact match OR sub-path (e.g. /grants active when on /grants/abc)
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="flex flex-col gap-1 overflow-y-auto">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-lime text-green font-semibold"
                : "text-[#c5dccf] hover:bg-white/10 hover:text-white"
            }`}
          >
            <span>{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                active ? "bg-green text-lime" : "bg-amber-500 text-white"
              }`}>
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/config/services";

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-40 bg-white/95 backdrop-blur">
        <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link href="/" className="shrink-0">
            <span className="text-lg font-bold tracking-tight text-ink">
              Muel
            </span>
          </Link>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 md:flex">
            {navigationItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                aria-current={item.href === pathname ? "page" : undefined}
                className={`text-sm font-semibold transition hover:text-ink ${item.href === pathname ? "text-ink" : "text-ink/55"}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center md:hidden"
            aria-label="메뉴 열기"
          >
            <span className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-5 bg-ink" />
              <span className="block h-0.5 w-5 bg-ink" />
              <span className="block h-0.5 w-5 bg-ink" />
            </span>
          </button>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-50 bg-white transition duration-200 md:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex h-16 items-center justify-end px-5">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 items-center justify-center"
            aria-label="메뉴 닫기"
          >
            <span className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-5 bg-ink" />
              <span className="block h-0.5 w-5 bg-ink" />
              <span className="block h-0.5 w-5 bg-ink" />
            </span>
          </button>
        </div>

        <nav className="flex flex-col px-5 pt-4">
          {navigationItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={item.href === pathname ? "page" : undefined}
              className={`py-3 text-2xl font-bold text-ink transition hover:text-ink/40 ${item.href === pathname ? "underline underline-offset-4" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}

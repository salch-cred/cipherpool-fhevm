"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon, Cancel01Icon, Github01Icon } from "@hugeicons/core-free-icons";
import { motion, AnimatePresence } from "framer-motion";

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#architecture", label: "Architecture" },
  { href: "/#comparison", label: "Research" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-gray-900">
          <span className="flex h-7 w-7 items-center justify-center bg-primary text-[11px] font-bold text-white">
            CT
          </span>
          CipherTrust
        </a>

        <nav className="hidden items-center gap-8 font-mono text-[11px] uppercase tracking-[0.1em] text-gray-500 md:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="relative transition hover:text-gray-900">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/salch-cred/cipherpool-fhevm"
            className="btn-secondary hidden items-center gap-2 rounded-lg px-4 py-2 text-xs sm:inline-flex"
          >
            <HugeiconsIcon icon={Github01Icon} size={14} />
            View on GitHub
          </a>
          <a href="/dashboard" className="btn-primary px-4 py-2.5 text-xs">
            Interactive DApp
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            className="flex h-9 w-9 items-center justify-center border border-border text-gray-700 md:hidden"
          >
            <HugeiconsIcon icon={open ? Cancel01Icon : Menu01Icon} size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-t border-border font-mono text-xs uppercase tracking-wide text-gray-600 md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="py-2 transition hover:text-gray-900"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

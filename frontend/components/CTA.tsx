"use client";

import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon } from "@hugeicons/core-free-icons";

export default function CTA() {
  return (
    <section className="mx-auto max-w-4xl px-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
        className="card rounded-3xl px-8 py-14 text-center"
      >
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Read the docs, then follow along on Sepolia.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-gray-600">
          The contracts, architecture notes, and competitive research log are all public.
          Deployment addresses will be added here once verified on Sepolia.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="https://github.com/salch-cred/cipherpool-fhevm"
            className="btn-primary group gap-2 px-6 py-3 text-sm"
          >
            View the repository
            <HugeiconsIcon
              icon={ArrowRight02Icon}
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </a>
          <a
            href="https://www.zama.org/post/zama-developer-program-mainnet-season-3-composable-privacy-is-the-key"
            className="btn-secondary rounded-lg px-6 py-3 text-sm"
          >
            Zama Season 3 details
          </a>
        </div>
      </motion.div>
    </section>
  );
}

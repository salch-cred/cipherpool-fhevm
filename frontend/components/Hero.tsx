"use client";

import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon, CheckmarkBadge03Icon } from "@hugeicons/core-free-icons";

const BADGES = ["Zama fhEVM", "Sepolia testnet", "ERC-8004-inspired identity", "Soulbound reputation"];

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-20 text-center sm:pt-28">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="eyebrow card mx-auto mb-6 inline-flex items-center rounded-full px-4 py-1.5 text-gray-600"
        >
          <HugeiconsIcon icon={CheckmarkBadge03Icon} size={13} className="text-primary" />
          Built for the Zama Developer Program — Mainnet Season 3
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="text-4xl font-semibold leading-[1.1] tracking-tight text-gray-900 sm:text-6xl"
        >
          Confidential underwriting for the
          <span className="gradient-text"> autonomous agent economy</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto mt-6 max-w-2xl text-balance text-lg text-gray-600"
        >
          CipherTrust prices collateral and insurance for AI trading bots, delivery robots, and
          drone fleets — computing an on-chain trust score and required bond entirely under Fully
          Homomorphic Encryption, so raw performance telemetry never touches plaintext.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <a
            href="https://github.com/salch-cred/cipherpool-fhevm/blob/main/docs/ARCHITECTURE.md"
            className="btn-primary group gap-2 px-6 py-3 text-sm"
          >
            Read the architecture
            <HugeiconsIcon
              icon={ArrowRight02Icon}
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </a>
          <a
            href="https://github.com/salch-cred/cipherpool-fhevm"
            className="btn-secondary rounded-lg px-6 py-3 text-sm"
          >
            View source on GitHub
          </a>
        </motion.div>
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
        }}
        className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {BADGES.map((label) => (
          <motion.div
            key={label}
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.4 }}
            className="card rounded-xl px-4 py-3 font-mono text-[11px] uppercase tracking-wide text-gray-600"
          >
            {label}
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";

const ROWS = [
  { project: "Pendex (Dec 2025 winner)", domain: "FHE dark-pool leveraged trading" },
  {
    project: "Confidential Derivatives (Season 2 winner)",
    domain: "Encrypted perpetuals, options, order book",
  },
  { project: "MARC Protocol (Season 1 winner)", domain: "Encrypted agent payment infrastructure" },
  { project: "CipherMint (Season 1 winner)", domain: "Confidential universal basic income" },
  { project: "x402fhe (Zama reference app)", domain: "Agent payments & payment-based reputation" },
  {
    project: "CipherTrust",
    domain: "Confidential underwriting for autonomous agents & robots",
    highlight: true,
  },
];

export default function CompetitiveEdge() {
  return (
    <section id="comparison" className="mx-auto max-w-5xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow justify-center text-primary">Prior art</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Why this hasn't been built
        </h2>
        <p className="mt-4 text-gray-600">
          Every reviewed FHE project scores or hides human-directed financial positions or
          payments. None price collateral for the operational reliability of autonomous agents
          and robots. See{" "}
          <a
            className="text-accent underline underline-offset-2"
            href="https://github.com/salch-cred/cipherpool-fhevm/blob/main/docs/COMPETITIVE_ANALYSIS.md"
          >
            the full research log
          </a>
          .
        </p>
      </div>
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        className="card mt-10 overflow-hidden rounded-2xl"
      >
        {ROWS.map((row) => (
          <motion.div
            key={row.project}
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
            className={`flex flex-col justify-between gap-1 border-b border-border px-6 py-4 last:border-b-0 sm:flex-row sm:items-center ${
              row.highlight ? "bg-primary-light" : ""
            }`}
          >
            <span
              className={`flex items-center gap-2 text-sm font-medium ${
                row.highlight ? "text-primary" : "text-gray-800"
              }`}
            >
              {row.highlight && <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} />}
              {row.project}
            </span>
            <span className="text-sm text-gray-500">{row.domain}</span>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

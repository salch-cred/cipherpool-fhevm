"use client";

import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Activity01Icon,
  Shield01Icon,
  Satellite01Icon,
  Alert02Icon,
  ViewIcon,
  Medal01Icon,
  Coins01Icon,
  PassportIcon,
} from "@hugeicons/core-free-icons";

const FEATURES = [
  {
    icon: Activity01Icon,
    title: "Encrypted trust scoring",
    description:
      "Completion rate, uptime, latency, and error rate are submitted as ciphertexts and blended into a rolling score entirely under FHE — never decrypted on-chain.",
  },
  {
    icon: Shield01Icon,
    title: "Confidential bond tiers",
    description:
      "An FHE.select decision-tree derives the required collateral bond from the encrypted score, so the thresholds an agent crossed are never public.",
  },
  {
    icon: Satellite01Icon,
    title: "Multi-oracle quorum",
    description:
      "Telemetry only affects an agent's score once N independent oracles agree within a round, reducing single-oracle trust assumptions.",
  },
  {
    icon: Alert02Icon,
    title: "Async confidential slashing",
    description:
      "SLA breaches are checked as an encrypted flag, revealed only through async public-decrypt + signature-verification flow, before any penalty is applied.",
  },
  {
    icon: ViewIcon,
    title: "Selective tier disclosure",
    description:
      "Operators can opt in to reveal only a coarse trust tier — Low, Medium, or High — while the exact score stays encrypted forever.",
  },
  {
    icon: Medal01Icon,
    title: "Soulbound reputation badges",
    description:
      "A non-transferable ERC-721 badge lets any protocol check an agent's public tier with one view call, with zero exposure of raw telemetry.",
  },
  {
    icon: Coins01Icon,
    title: "Composable insurance pool",
    description:
      "Liquidity providers earn a share of every slashing penalty — a transparent DeFi primitive that composes with CipherTrust's confidential core.",
  },
  {
    icon: PassportIcon,
    title: "Portable agent identity",
    description:
      "An ERC-8004-inspired identity registry gives every agent a shared, app-agnostic identity that other confidential protocols can build on.",
  },
];

export default function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow justify-center text-primary">Protocol capabilities</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Everything an underwriter needs. Nothing an attacker can use.
        </h2>
        <p className="mt-4 text-gray-600">
          A confidential risk engine purpose-built for non-human, autonomous actors.
        </p>
      </div>
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {FEATURES.map((feature) => (
          <motion.div
            key={feature.title}
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.4 }}
            whileHover={{ y: -3 }}
            className="card rounded-2xl p-6 hover:border-primary/30 hover:shadow-card-hover"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light text-primary">
              <HugeiconsIcon icon={feature.icon} size={18} />
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

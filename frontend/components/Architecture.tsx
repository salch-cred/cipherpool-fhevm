"use client";

import { motion } from "framer-motion";

export default function Architecture() {
  return (
    <section id="architecture" className="mx-auto max-w-5xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow justify-center text-primary">System design</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Contract architecture
        </h2>
        <p className="mt-4 text-gray-600">Five focused contracts, each independently auditable.</p>
      </div>
      <motion.pre
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
        className="card mt-10 overflow-x-auto rounded-2xl p-6 font-mono text-xs leading-relaxed text-gray-700 sm:text-sm"
      >
{`CipherTrust.sol             core risk engine (FHE trust score, bond tiers, slashing)
AgentIdentityRegistry.sol   ERC-8004-inspired portable identity for agents/robots
ReputationBadge.sol         soulbound ERC-721 badge for publicly revealed trust tiers
InsurancePool.sol           LP vault funded by confidential slashing penalties

Oracle ──encrypted telemetry──▶ CipherTrust ──derives──▶ encrypted bond tier
                                     │
                                     ├──opt-in reveal──▶ ReputationBadge (public tier)
                                     └──breach + decrypt──▶ InsurancePool (LP yield)`}
      </motion.pre>
    </section>
  );
}

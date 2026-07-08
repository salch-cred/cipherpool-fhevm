const FEATURES = [
  {
    title: "Encrypted trust scoring",
    description:
      "Completion rate, uptime, latency, and error rate are submitted as ciphertexts and blended into a rolling score entirely under FHE — never decrypted on-chain.",
  },
  {
    title: "Confidential bond tiers",
    description:
      "An FHE.select decision-tree derives the required collateral bond from the encrypted score, so the thresholds an agent crossed are never public.",
  },
  {
    title: "Multi-oracle quorum",
    description:
      "Telemetry only affects an agent's score once N independent oracles agree within a round, reducing single-oracle trust assumptions.",
  },
  {
    title: "Async confidential slashing",
    description:
      "SLA breaches are checked as an encrypted flag, revealed only through Zama's public-decrypt + signature-verification flow, before any penalty is applied.",
  },
  {
    title: "Selective tier disclosure",
    description:
      "Operators can opt in to reveal only a coarse trust tier — Low, Medium, or High — while the exact score stays encrypted forever.",
  },
  {
    title: "Soulbound reputation badges",
    description:
      "A non-transferable ERC-721 badge lets any protocol check an agent's public tier with one view call, with zero exposure of raw telemetry.",
  },
  {
    title: "Composable insurance pool",
    description:
      "Liquidity providers earn a share of every slashing penalty — a transparent DeFi primitive that composes with CipherTrust's confidential core.",
  },
  {
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
      <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="card card-hover rounded-2xl p-6">
            <h3 className="text-base font-semibold text-gray-900">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

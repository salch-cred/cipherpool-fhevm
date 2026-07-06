export default function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-24 text-center">
      <div className="mx-auto max-w-3xl">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
          Built for the Zama Developer Program — Mainnet Season 3
        </div>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Confidential underwriting for the
          <span className="gradient-text"> autonomous agent economy</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-white/60">
          CipherTrust prices collateral and insurance for AI trading bots, delivery robots, and
          drone fleets — computing an on-chain trust score and required bond entirely under Fully
          Homomorphic Encryption, so raw performance telemetry never touches plaintext.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="https://github.com/salch-cred/cipherpool-fhevm/blob/main/docs/ARCHITECTURE.md"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-background transition hover:bg-brand-cyan"
          >
            Read the architecture
          </a>
          <a
            href="https://github.com/salch-cred/cipherpool-fhevm"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-brand-purple hover:text-brand-purple"
          >
            View source on GitHub
          </a>
        </div>
      </div>

      <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-3 text-xs text-white/50 sm:grid-cols-4">
        {["Zama fhEVM", "Sepolia testnet", "ERC-8004-inspired identity", "Soulbound reputation"].map((label) => (
          <div key={label} className="glass-card rounded-xl px-4 py-3">
            {label}
          </div>
        ))}
      </div>
    </section>
  );
}

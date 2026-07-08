export default function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-20 text-center sm:pt-28">
      <div className="mx-auto max-w-3xl">
        <div className="eyebrow card mx-auto mb-6 inline-flex rounded-full px-4 py-1.5 text-gray-600">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Built for the Zama Developer Program — Mainnet Season 3
        </div>

        <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-gray-900 sm:text-6xl">
          Confidential underwriting for the
          <span className="gradient-text"> autonomous agent economy</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-gray-600">
          CipherTrust prices collateral and insurance for AI trading bots, delivery robots, and
          drone fleets — computing an on-chain trust score and required bond entirely under Fully
          Homomorphic Encryption, so raw performance telemetry never touches plaintext.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="https://github.com/salch-cred/cipherpool-fhevm/blob/main/docs/ARCHITECTURE.md"
            className="btn-primary px-6 py-3 text-sm"
          >
            Read the architecture
          </a>
          <a
            href="https://github.com/salch-cred/cipherpool-fhevm"
            className="btn-secondary rounded-lg px-6 py-3 text-sm"
          >
            View source on GitHub
          </a>
        </div>
      </div>

      <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
        {["Zama fhEVM", "Sepolia testnet", "ERC-8004-inspired identity", "Soulbound reputation"].map(
          (label) => (
            <div
              key={label}
              className="card rounded-xl px-4 py-3 font-mono text-[11px] uppercase tracking-wide text-gray-600"
            >
              {label}
            </div>
          )
        )}
      </div>
    </section>
  );
}

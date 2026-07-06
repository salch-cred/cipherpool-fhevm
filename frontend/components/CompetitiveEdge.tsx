const ROWS = [
  { project: "Pendex (Dec 2025 winner)", domain: "FHE dark-pool leveraged trading" },
  { project: "Confidential Derivatives (Season 2 winner)", domain: "Encrypted perpetuals, options, order book" },
  { project: "MARC Protocol (Season 1 winner)", domain: "Encrypted agent payment infrastructure" },
  { project: "CipherMint (Season 1 winner)", domain: "Confidential universal basic income" },
  { project: "x402fhe (Zama reference app)", domain: "Agent payments & payment-based reputation" },
  { project: "CipherTrust", domain: "Confidential underwriting for autonomous agents & robots", highlight: true },
];

export default function CompetitiveEdge() {
  return (
    <section id="comparison" className="mx-auto max-w-5xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Why this hasn't been built</h2>
        <p className="mt-4 text-white/60">
          Every reviewed FHE project scores or hides human-directed financial positions or payments.
          None price collateral for the operational reliability of autonomous agents and robots.
          See <a className="text-brand-cyan underline" href="https://github.com/salch-cred/cipherpool-fhevm/blob/main/docs/COMPETITIVE_ANALYSIS.md">the full research log</a>.
        </p>
      </div>
      <div className="mt-10 overflow-hidden rounded-2xl border border-white/10">
        {ROWS.map((row) => (
          <div
            key={row.project}
            className={`flex flex-col justify-between gap-1 border-b border-white/5 px-6 py-4 last:border-b-0 sm:flex-row sm:items-center ${
              row.highlight ? "bg-brand-purple/10" : "bg-white/[0.02]"
            }`}
          >
            <span className={`text-sm font-medium ${row.highlight ? "text-brand-cyan" : "text-white/80"}`}>{row.project}</span>
            <span className="text-sm text-white/50">{row.domain}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

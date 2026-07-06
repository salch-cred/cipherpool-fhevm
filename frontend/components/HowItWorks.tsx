const STEPS = [
  {
    step: "01",
    title: "Register the agent",
    description: "An operator registers an autonomous agent or robot, optionally linked to a portable on-chain identity.",
  },
  {
    step: "02",
    title: "Oracles submit encrypted telemetry",
    description: "Authorized attestors submit completion, uptime, latency, and error signals as ciphertexts after each task.",
  },
  {
    step: "03",
    title: "Quorum blends the score",
    description: "Once enough independent oracles agree within a round, the encrypted trust score updates under FHE.",
  },
  {
    step: "04",
    title: "Bond tier updates confidentially",
    description: "An FHE decision-tree re-derives the required collateral bond — the exact thresholds stay private.",
  },
  {
    step: "05",
    title: "Breach, slash, or reveal",
    description: "An SLA breach can trigger confidential slashing; an operator can opt in to reveal only a coarse trust tier.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-24">
      <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
      <div className="mt-14 space-y-6">
        {STEPS.map((item) => (
          <div key={item.step} className="glass-card flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center">
            <div className="text-2xl font-bold text-brand-cyan/70">{item.step}</div>
            <div>
              <h3 className="text-base font-semibold text-white">{item.title}</h3>
              <p className="mt-1 text-sm text-white/55">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

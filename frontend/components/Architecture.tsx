export default function Architecture() {
  return (
    <section id="architecture" className="mx-auto max-w-5xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Contract architecture</h2>
        <p className="mt-4 text-white/60">Five focused contracts, each independently auditable.</p>
      </div>
      <pre className="glass-card mt-10 overflow-x-auto rounded-2xl p-6 text-xs leading-relaxed text-white/70 sm:text-sm">
{`CipherTrust.sol            core risk engine (FHE trust score, bond tiers, slashing)
AgentIdentityRegistry.sol  ERC-8004-inspired portable identity for agents/robots
ReputationBadge.sol        soulbound ERC-721 badge for publicly revealed trust tiers
InsurancePool.sol          LP vault funded by confidential slashing penalties

Oracle ──encrypted telemetry──▶ CipherTrust ──derives──▶ encrypted bond tier
                                     │
                                     ├──opt-in reveal──▶ ReputationBadge (public tier)
                                     └──breach + decrypt──▶ InsurancePool (LP yield)`}
      </pre>
    </section>
  );
}

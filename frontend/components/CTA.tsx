export default function CTA() {
  return (
    <section className="mx-auto max-w-4xl px-6 pb-24">
      <div className="glass-card rounded-3xl px-8 py-14 text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Read the docs, then follow along on Sepolia.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-white/60">
          The contracts, architecture notes, and competitive research log are all public. Deployment
          addresses will be added here once verified on Sepolia.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="https://github.com/salch-cred/cipherpool-fhevm"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-background transition hover:bg-brand-cyan"
          >
            View the repository
          </a>
          <a
            href="https://www.zama.org/post/zama-developer-program-mainnet-season-3-composable-privacy-is-the-key"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-brand-purple hover:text-brand-purple"
          >
            Zama Season 3 details
          </a>
        </div>
      </div>
    </section>
  );
}

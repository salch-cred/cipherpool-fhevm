export default function CTA() {
  return (
    <section className="mx-auto max-w-4xl px-6 pb-24">
      <div className="card rounded-3xl px-8 py-14 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Read the docs, then follow along on Sepolia.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-gray-600">
          The contracts, architecture notes, and competitive research log are all public.
          Deployment addresses will be added here once verified on Sepolia.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="https://github.com/salch-cred/cipherpool-fhevm"
            className="btn-primary px-6 py-3 text-sm"
          >
            View the repository
          </a>
          <a
            href="https://www.zama.org/post/zama-developer-program-mainnet-season-3-composable-privacy-is-the-key"
            className="btn-secondary rounded-lg px-6 py-3 text-sm"
          >
            Zama Season 3 details
          </a>
        </div>
      </div>
    </section>
  );
}

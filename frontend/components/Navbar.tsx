export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-gray-900">
          <span className="flex h-7 w-7 items-center justify-center bg-primary text-[11px] font-bold text-white">
            CT
          </span>
          CipherTrust
        </a>

        <nav className="hidden items-center gap-8 font-mono text-[11px] uppercase tracking-[0.1em] text-gray-500 md:flex">
          <a href="/#features" className="transition hover:text-gray-900">
            Features
          </a>
          <a href="/#how-it-works" className="transition hover:text-gray-900">
            How it works
          </a>
          <a href="/#architecture" className="transition hover:text-gray-900">
            Architecture
          </a>
          <a href="/#comparison" className="transition hover:text-gray-900">
            Research
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/salch-cred/cipherpool-fhevm"
            className="btn-secondary hidden rounded-lg px-4 py-2 text-xs sm:inline-flex"
          >
            View on GitHub
          </a>
          <a href="/dashboard" className="btn-primary px-4 py-2.5 text-xs">
            Interactive DApp
          </a>
        </div>
      </div>
    </header>
  );
}

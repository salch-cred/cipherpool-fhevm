export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-cyan shadow-[0_0_12px_2px_rgba(34,211,238,0.7)]" />
          CipherTrust
        </a>
        <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#how-it-works" className="hover:text-white">How it works</a>
          <a href="#architecture" className="hover:text-white">Architecture</a>
          <a href="#comparison" className="hover:text-white">Why it's different</a>
        </nav>
        <a
          href="https://github.com/salch-cred/cipherpool-fhevm"
          className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:border-brand-cyan/70 hover:text-brand-cyan"
        >
          View on GitHub
        </a>
      </div>
    </header>
  );
}

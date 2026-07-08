import { HugeiconsIcon } from "@hugeicons/react";
import { Github01Icon } from "@hugeicons/core-free-icons";

export default function Footer() {
  return (
    <footer className="border-t border-border px-6 py-10 text-center font-mono text-xs text-gray-500">
      <a
        href="https://github.com/salch-cred/cipherpool-fhevm"
        className="mb-3 inline-flex items-center gap-2 text-gray-600 transition hover:text-gray-900"
      >
        <HugeiconsIcon icon={Github01Icon} size={14} />
        salch-cred/cipherpool-fhevm
      </a>
      <p>CipherTrust — Confidential risk underwriting engine for autonomous agents. MIT licensed.</p>
    </footer>
  );
}

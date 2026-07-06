import type { Metadata } from "next";
import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "CipherTrust — Confidential Underwriting for Autonomous Agents & Robots",
  description:
    "CipherTrust prices collateral and insurance for autonomous AI agents and robots entirely under Fully Homomorphic Encryption, built on Zama's fhEVM for the Zama Developer Program Season 3.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background bg-grid-glow bg-no-repeat antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}

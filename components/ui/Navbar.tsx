import Link from "next/link";
import React from "react";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5"><img src="/logo-icon.svg" alt="SourceTruth logo" className="w-8 h-8" />
            <span className="font-bold text-lg text-ink">SourceTruth</span>
          </Link>
        </div>
        <div className="hidden md:flex items-center gap-6 text-body-sm text-body">
          <a href="#how-it-works" className="hover:text-ink transition-colors">
            How it works
          </a>
          <a href="#features" className="hover:text-ink transition-colors">
            Features
          </a>
          <a href="#pricing" className="hover:text-ink transition-colors">
            Pricing
          </a>
          <a href="#faq" className="hover:text-ink transition-colors">
            FAQ
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="text-body-sm text-body hover:text-ink transition-colors px-3 py-2"
          >
            Sign in
          </Link>
          <Link href="/auth/login" className="btn-primary text-body-sm">
            Start free →
          </Link>
        </div>
      </div>
    </nav>
  );
}

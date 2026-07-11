'use client';

import { Github, Linkedin } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full border-t border-border/40 py-8">
      <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 lg:flex-row lg:px-6">
        <div className="flex flex-col items-center gap-2 text-center lg:items-start">
          <p className="text-sm font-semibold">
            Created and Designed by: Marco Serrano
          </p>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Demo Drive Hub. All rights reserved.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium footer-links">
          <Link href="/about" prefetch={false}>
            About
          </Link>
          <Link href="/contact" prefetch={false}>
            Contact
          </Link>
          <Link href="/privacy" prefetch={false}>
            Privacy
          </Link>
          <Link href="/terms" prefetch={false}>
            Terms
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="https://github.com/marcoserrano21"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            <Github className="h-5 w-5" />
            <span className="sr-only">GitHub</span>
          </Link>
          <Link
            href="https://www.linkedin.com/in/marco-serrano25/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            <Linkedin className="h-5 w-5" />
            <span className="sr-only">LinkedIn</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}

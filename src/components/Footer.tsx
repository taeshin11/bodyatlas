import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/60 bg-white/50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate-500">
            <Link href="/about" className="hover:text-indigo-500 transition-colors">About</Link>
            <Link href="/how-to-use" className="hover:text-indigo-500 transition-colors">How to Use</Link>
            <Link href="/privacy" className="hover:text-indigo-500 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-indigo-500 transition-colors">Terms of Service</Link>
            <a href="mailto:taeshinkim11@gmail.com" className="hover:text-indigo-500 transition-colors">Contact</a>
          </nav>

          {/* Copyright */}
          <div className="text-xs text-slate-400 text-center sm:text-right">
            <span>&copy; {new Date().getFullYear()} BodyAtlas by{' '}
              <a href="http://www.spinai.net" target="_blank" rel="noopener noreferrer" aria-label="SPINAI website (opens in new tab)" className="hover:text-indigo-500 transition-colors">
                SPINAI
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

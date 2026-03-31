import Link from 'next/link';
import { Brain } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] px-4">
      <Brain className="w-16 h-16 text-indigo-500 mb-4" />
      <h1 className="text-2xl font-bold text-slate-900 mb-2">404</h1>
      <p className="text-slate-600 mb-6">Page not found</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors"
      >
        Back to BrainAxis
      </Link>
    </div>
  );
}

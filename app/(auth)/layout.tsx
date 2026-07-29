import Link from "next/link";
import { SCHOOL_NAME, SCHOOL_SHORT, APP_NAME } from "@/lib/branding";

// Shared shell for all auth screens: a centered card on a subtle brand background.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-slate-100 px-4 py-10">
      <Link href="/" className="mb-6 flex flex-col items-center gap-2 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-sm font-bold text-white">
          {SCHOOL_SHORT}
        </span>
        <span className="text-lg font-semibold text-slate-800">{SCHOOL_NAME}</span>
        <span className="-mt-1 text-sm text-slate-500">{APP_NAME}</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-6 text-xs text-slate-400">© {SCHOOL_NAME}</p>
    </div>
  );
}

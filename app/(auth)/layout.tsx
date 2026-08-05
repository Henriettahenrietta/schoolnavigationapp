import Link from "next/link";
import { SCHOOL_NAME, buildingBackground } from "@/lib/branding";
import { BrandStack } from "@/components/brand-logo";

// Shared shell for all auth screens: a centered card over the school building, washed back
// far enough that form text stays legible. Falls back to a sky gradient if the photo is absent.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-10"
      style={{ background: buildingBackground("panel") }}
    >
      <Link href="/" className="mb-6 flex flex-col items-center gap-2 text-center">
        <BrandStack />
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-6 text-xs text-slate-500">© {SCHOOL_NAME}</p>
    </div>
  );
}

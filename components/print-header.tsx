import { SCHOOL_NAME, APP_NAME } from "@/lib/branding";
import { BrandLogo } from "./brand-logo";

// School-branded header shown on printed/PDF exports (hidden on screen): crest,
// school name, session/semester and generated-on date.
export function PrintHeader({
  title,
  session,
  generatedOn,
}: {
  title: string;
  session?: string;
  generatedOn?: string;
}) {
  return (
    <div className="mb-4 hidden items-center gap-3 border-b border-slate-300 pb-3 print:flex">
      <BrandLogo size={52} />
      <div>
        <p className="text-lg font-bold text-slate-900">{SCHOOL_NAME}</p>
        <p className="text-sm text-slate-600">
          {APP_NAME} · {title}
          {session ? ` · ${session}` : ""}
        </p>
        {generatedOn && <p className="text-xs text-slate-400">Generated on {generatedOn}</p>}
      </div>
    </div>
  );
}

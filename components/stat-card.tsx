import { Card } from "./ui";

// A labelled statistic tile for the dashboards.
export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "brand",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  accent?: "brand" | "green" | "amber" | "red" | "slate";
}) {
  const accents: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        {icon && (
          <span className={`grid h-10 w-10 place-items-center rounded-lg ${accents[accent]}`}>
            {icon}
          </span>
        )}
      </div>
    </Card>
  );
}

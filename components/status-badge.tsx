import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<string, string> = {
  pending: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  calling: "border-blue-400/25 bg-blue-400/10 text-blue-300 animate-pulse",
  completed: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  failed: "border-red-400/25 bg-red-400/10 text-red-300",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize", STATUS_CLASS[status])}>
      {status}
    </Badge>
  );
}

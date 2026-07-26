import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import type { Person } from "@db/tables";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  people: Person[];
  onSelect: (person: Person) => void;
  className?: string;
};

/** بحث سريع داخل المخطط — يركّز على الشخص فور الاختيار */
export default function ChartPersonSearch({ people, onSelect, className }: Props) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const query = q.trim();
    if (query.length < 1) return [];
    return people
      .filter((p) =>
        [p.givenName, p.fatherName, p.kunya, p.laqab]
          .filter(Boolean)
          .some((s) => s!.includes(query) || s!.toLowerCase().includes(query.toLowerCase())),
      )
      .slice(0, 8);
  }, [people, q]);

  return (
    <div className={cn("relative w-full max-w-xs", className)}>
      <Search className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // تأخير بسيط ليسمح بالنقر على النتيجة
          window.setTimeout(() => setOpen(false), 150);
        }}
        placeholder={t("chart.searchInTree")}
        className="h-8 pe-8 text-sm"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border bg-card py-1 shadow-lg">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(p);
                  setQ("");
                  setOpen(false);
                }}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] text-white",
                    p.gender === "female" ? "bg-pink-500" : "bg-sky-600",
                  )}
                >
                  {p.photoUrl ? (
                    <img src={p.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    p.givenName.slice(0, 1)
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.givenName}</span>
                  {p.fatherName && (
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {p.fatherName}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

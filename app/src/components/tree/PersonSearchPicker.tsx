import { useMemo, useState } from "react";
import type { Person } from "@db/schema";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { personMatchesQuery } from "@/lib/personDisplay";

type Props = {
  people: Person[];
  value: string;
  onChange: (personId: string) => void;
  placeholder?: string;
  excludeId?: number;
  unlinkedIds?: Set<number>;
  disabled?: boolean;
};

export default function PersonSearchPicker({
  people,
  value,
  onChange,
  placeholder,
  excludeId,
  unlinkedIds,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const options = useMemo(
    () => people.filter((p) => p.id !== excludeId),
    [people, excludeId],
  );

  const selected = useMemo(
    () => options.find((p) => p.id.toString() === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    return options.filter((p) => personMatchesQuery(p, query));
  }, [options, query]);

  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of options) {
      counts.set(p.givenName, (counts.get(p.givenName) ?? 0) + 1);
    }
    return counts;
  }, [options]);

  const labelFor = (p: Person) => {
    const dupes = (duplicateNames.get(p.givenName) ?? 0) > 1;
    const notInChart = unlinkedIds?.has(p.id) ?? false;
    let text = p.givenName;
    if (p.fatherName?.trim()) text += ` (${p.fatherName.trim()})`;
    if (p.kunya?.trim()) text += ` · ${p.kunya.trim()}`;
    if (dupes) text += ` #${p.id}`;
    return { text, notInChart, dupes };
  };

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="h-11 w-full justify-between font-normal"
          >
            <span className="truncate text-start">
              {selected
                ? labelFor(selected).text
                : (placeholder ?? t("relation.otherPh"))}
            </span>
            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t("relation.searchPh")}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>{t("relation.searchEmpty")}</CommandEmpty>
              <CommandGroup>
                {filtered.map((p) => {
                  const { text, notInChart, dupes } = labelFor(p);
                  return (
                    <CommandItem
                      key={p.id}
                      value={p.id.toString()}
                      onSelect={() => {
                        onChange(p.id.toString());
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value === p.id.toString() ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate">{text}</span>
                        {(notInChart || dupes) && (
                          <span className="text-xs text-muted-foreground">
                            {[
                              notInChart ? t("relation.notInChart") : null,
                              dupes ? t("relation.duplicateHint") : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {duplicateNames.size > 0 &&
        [...duplicateNames.values()].some((c) => c > 1) && (
          <p className="text-xs text-amber-700">{t("relation.duplicatesNote")}</p>
        )}
    </div>
  );
}

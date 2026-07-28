import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/schema";
import type { TreeBranch } from "@db/tables";
import type { FemaleDisplay } from "@contracts/constants";
import type { PrintScope, PrintNameMode, PrintPaperSize } from "@/lib/printFilter";
import { PRINT_PAPER_SIZES } from "@/lib/printFilter";
import {
  personDisplayName,
  personDisplayNameWithTwin,
  assignGenerationsStable,
  displayGenerationNumber,
} from "@/lib/printData";
import { twinMarkWord } from "@/lib/twins";
import { personMatchesQuery } from "@/lib/personDisplay";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  scope: PrintScope;
  onChange: (patch: Partial<PrintScope>) => void;
  people: Person[];
  rels: Relationship[];
  branches: TreeBranch[];
  treeFemaleDisplay: FemaleDisplay;
};

export default function PrintScopePanel({
  scope,
  onChange,
  people,
  rels,
  branches,
  treeFemaleDisplay,
}: Props) {
  const { t, i18n } = useTranslation();
  const twinWord = twinMarkWord(i18n.language);
  const [rootOpen, setRootOpen] = useState(false);
  const [rootQuery, setRootQuery] = useState("");

  const levels = useMemo(
    () => assignGenerationsStable(people, rels),
    [people, rels],
  );

  const rootCandidates = useMemo(() => {
    return [...people].sort((a, b) => {
      const ga = levels.get(a.id) ?? 0;
      const gb = levels.get(b.id) ?? 0;
      if (ga !== gb) return ga - gb;
      return personDisplayName(a).localeCompare(personDisplayName(b), "ar");
    });
  }, [people, levels]);

  const selectedRoot = useMemo(
    () =>
      scope.rootPersonId != null
        ? (people.find((p) => p.id === scope.rootPersonId) ?? null)
        : null,
    [people, scope.rootPersonId],
  );

  const filteredRoots = useMemo(() => {
    if (!rootQuery.trim()) return rootCandidates;
    return rootCandidates.filter((p) => personMatchesQuery(p, rootQuery));
  }, [rootCandidates, rootQuery]);

  const rootTriggerLabel = selectedRoot
    ? (() => {
        const gen = displayGenerationNumber(levels.get(selectedRoot.id) ?? 0);
        const name = personDisplayNameWithTwin(selectedRoot, people, twinWord);
        const laqab = selectedRoot.laqab?.trim();
        return laqab ? `${name} ${t("common.emDash")} ${laqab}` : name;
      })()
    : t("printPage.scopeRootAuto");

  const selectedRootGen =
    selectedRoot != null
      ? displayGenerationNumber(levels.get(selectedRoot.id) ?? 0)
      : null;

  return (
    <Card className="no-print mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t("printPage.scopeTitle")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("printPage.scopeHint")}</p>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("printPage.scopeBranchLabel")}</Label>
          <Select
            value={scope.branchId?.toString() ?? "all"}
            onValueChange={(v) =>
              onChange({
                branchId: v === "all" ? null : parseInt(v, 10),
                rootPersonId: null,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("printPage.scopeAllBranches")}</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("printPage.scopeRootLabel")}</Label>
          <Popover
            open={rootOpen}
            onOpenChange={(o) => {
              setRootOpen(o);
              if (!o) setRootQuery("");
            }}
          >
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={rootOpen}
                className="h-10 w-full justify-between font-normal"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2 text-start">
                  <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{rootTriggerLabel}</span>
                  {selectedRootGen != null && (
                    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                      {t("printPage.generationLabel", { n: selectedRootGen })}
                    </span>
                  )}
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
                  placeholder={t("printPage.scopeRootSearchPh")}
                  value={rootQuery}
                  onValueChange={setRootQuery}
                />
                <CommandList>
                  <CommandEmpty>{t("printPage.scopeRootSearchEmpty")}</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="auto"
                      onSelect={() => {
                        onChange({ rootPersonId: null });
                        setRootOpen(false);
                        setRootQuery("");
                      }}
                    >
                      <Check
                        className={cn(
                          "me-2 h-4 w-4 shrink-0",
                          scope.rootPersonId == null ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="flex-1 truncate">
                        {t("printPage.scopeRootAuto")}
                      </span>
                    </CommandItem>
                    {filteredRoots.map((p) => {
                      const gen = displayGenerationNumber(levels.get(p.id) ?? 0);
                      const name = personDisplayNameWithTwin(p, people, twinWord);
                      const laqab = p.laqab?.trim();
                      const selected = scope.rootPersonId === p.id;
                      return (
                        <CommandItem
                          key={p.id}
                          value={`${p.id}-${name}`}
                          onSelect={() => {
                            onChange({ rootPersonId: p.id });
                            setRootOpen(false);
                            setRootQuery("");
                          }}
                        >
                          <Check
                            className={cn(
                              "me-2 h-4 w-4 shrink-0",
                              selected ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {name}
                            {laqab ? (
                              <span className="text-muted-foreground">
                                {" "}
                                {t("common.emDash")} {laqab}
                              </span>
                            ) : null}
                          </span>
                          <span className="ms-2 shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                            {t("printPage.generationLabel", { n: gen })}
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            {t("printPage.scopeRootSearchHint")}
          </p>
        </div>

        <div className="space-y-3 sm:col-span-2">
          <div className="flex justify-between items-center">
            <Label>{t("printPage.scopeGenerationsLabel")}</Label>
            <span className="text-sm font-medium tabular-nums">{scope.generationsDown}</span>
          </div>
          <Slider
            value={[scope.generationsDown]}
            min={1}
            max={16}
            step={1}
            onValueChange={([v]) => onChange({ generationsDown: v ?? 10 })}
          />
          <p className="text-xs text-muted-foreground">{t("printPage.scopeGenerationsHint")}</p>
        </div>

        <div className="space-y-2">
          <Label>{t("printPage.scopeNameModeLabel")}</Label>
          <Select
            value={scope.nameMode}
            onValueChange={(v) => onChange({ nameMode: v as PrintNameMode })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">{t("printPage.nameModeFull")}</SelectItem>
              <SelectItem value="firstOnly">{t("printPage.nameModeFirstOnly")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t("printPage.scopeNameModeHint")}</p>
        </div>

        <div className="space-y-2">
          <Label>{t("printPage.scopePaperLabel")}</Label>
          <Select
            value={scope.paperSize}
            onValueChange={(v) => onChange({ paperSize: v as PrintPaperSize })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PRINT_PAPER_SIZES) as PrintPaperSize[]).map((id) => (
                <SelectItem key={id} value={id}>
                  {t(PRINT_PAPER_SIZES[id].labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t("printPage.scopePaperHint")}</p>
        </div>

        <div className="space-y-2">
          <Label>{t("printPage.scopeFemaleLabel")}</Label>
          <Select
            value={scope.femaleDisplay}
            onValueChange={(v) => onChange({ femaleDisplay: v as FemaleDisplay })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">{t("femaleDisplay.full")}</SelectItem>
              <SelectItem value="firstOnly">{t("femaleDisplay.firstOnly")}</SelectItem>
              <SelectItem value="hidden">{t("femaleDisplay.hidden")}</SelectItem>
            </SelectContent>
          </Select>
          {scope.femaleDisplay !== treeFemaleDisplay && (
            <p className="text-xs text-amber-700">{t("printPage.scopeFemaleOverride")}</p>
          )}
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{t("printPage.scopeIncludeParents")}</p>
              <p className="text-xs text-muted-foreground">{t("printPage.scopeIncludeParentsHint")}</p>
            </div>
            <Switch
              checked={scope.includeParents}
              onCheckedChange={(c) => onChange({ includeParents: c })}
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{t("printPage.scopeIncludeSpouses")}</p>
              <p className="text-xs text-muted-foreground">{t("printPage.scopeIncludeSpousesHint")}</p>
            </div>
            <Switch
              checked={scope.includeSpouses}
              onCheckedChange={(c) =>
                onChange({
                  includeSpouses: c,
                  includeSpouseLineage: c ? scope.includeSpouseLineage : false,
                })
              }
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{t("printPage.scopeSpouseFamilies")}</p>
              <p className="text-xs text-muted-foreground">{t("printPage.scopeSpouseFamiliesHint")}</p>
            </div>
            <Switch
              checked={scope.includeSpouseLineage}
              disabled={!scope.includeSpouses}
              onCheckedChange={(c) => onChange({ includeSpouseLineage: c })}
            />
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

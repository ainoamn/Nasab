import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/schema";
import type { TreeBranch } from "@db/tables";
import type { FemaleDisplay } from "@contracts/constants";
import type { PrintScope } from "@/lib/printFilter";
import { personDisplayName, assignGenerationsStable } from "@/lib/printData";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";

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
  const { t } = useTranslation();

  const rootCandidates = useMemo(() => {
    const levels = assignGenerationsStable(people, rels);
    return [...people].sort((a, b) => {
      const ga = levels.get(a.id) ?? 0;
      const gb = levels.get(b.id) ?? 0;
      if (ga !== gb) return ga - gb;
      return personDisplayName(a).localeCompare(personDisplayName(b), "ar");
    });
  }, [people, rels]);

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
          <Select
            value={scope.rootPersonId?.toString() ?? "auto"}
            onValueChange={(v) =>
              onChange({ rootPersonId: v === "auto" ? null : parseInt(v, 10) })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">{t("printPage.scopeRootAuto")}</SelectItem>
              {rootCandidates.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {personDisplayName(p)}
                  {p.laqab ? ` — ${p.laqab}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 sm:col-span-2">
          <div className="flex justify-between items-center">
            <Label>{t("printPage.scopeGenerationsLabel")}</Label>
            <span className="text-sm font-medium tabular-nums">{scope.generationsDown}</span>
          </div>
          <Slider
            value={[scope.generationsDown]}
            min={1}
            max={12}
            step={1}
            onValueChange={([v]) => onChange({ generationsDown: v ?? 6 })}
          />
          <p className="text-xs text-muted-foreground">{t("printPage.scopeGenerationsHint")}</p>
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

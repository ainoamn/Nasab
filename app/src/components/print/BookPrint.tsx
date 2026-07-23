import { useTranslation } from "react-i18next";
import PrintFamilyChart from "./PrintFamilyChart";
import { sortPeopleByGeneration, personDisplayName } from "@/lib/printData";
import { PrintMetaFooter, PrintMetaHeader } from "./shared";
import type { PrintTemplateProps } from "./types";

function BookCover({ tree, accent }: { tree: PrintTemplateProps["tree"]; accent: string }) {
  const { t } = useTranslation();
  return (
    <div
      className="relative mx-auto mb-10 max-w-lg rounded-r-2xl rounded-l-md shadow-2xl overflow-hidden print:break-after-page"
      style={{
        background: `linear-gradient(135deg, ${accent} 0%, #3d2518 100%)`,
        boxShadow: "8px 8px 24px rgba(0,0,0,0.35), inset -4px 0 12px rgba(0,0,0,0.2)",
      }}
    >
      <div className="absolute inset-y-0 start-0 w-6 bg-gradient-to-r from-black/30 to-transparent" />
      <div className="px-10 py-16 text-center text-amber-50">
        <div
          className="mx-auto mb-6 h-24 w-24 rounded-full border-4 flex items-center justify-center text-4xl"
          style={{ borderColor: "#D4AF37" }}
        >
          📖
        </div>
        <h2 className="font-display text-3xl sm:text-4xl font-bold mb-2">{tree.name}</h2>
        <p className="text-amber-100/80 font-display text-lg">
          {[tree.tribe, tree.region].filter(Boolean).join(" — ")}
        </p>
        <div
          className="mx-auto mt-8 h-px w-32"
          style={{ background: "linear-gradient(90deg, transparent, #D4AF37, transparent)" }}
        />
        <p className="mt-4 text-sm text-amber-100/60">{t("printPage.bookCoverSubtitle")}</p>
      </div>
    </div>
  );
}

function BookPage({
  person,
  accent,
  pageNum,
}: {
  person: PrintTemplateProps["people"][0];
  accent: string;
  pageNum: number;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="mb-8 rounded-xl border bg-white/90 p-6 shadow-sm print:break-inside-avoid"
      style={{ borderColor: `${accent}44` }}
    >
      <div className="flex items-start gap-4">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white font-bold text-lg"
          style={{
            backgroundColor: person.gender === "female" ? "#db2777" : "#2563eb",
          }}
        >
          {person.photoUrl ? (
            <img src={person.photoUrl} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            pageNum
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl font-bold" style={{ color: accent }}>
            {personDisplayName(person)}
          </h3>
          {person.fatherName && (
            <p className="text-sm text-stone-500 font-display">{person.fatherName}</p>
          )}
          {(person.laqab || person.clan) && (
            <p className="text-xs text-stone-400 mt-1">
              {[person.laqab, person.clan].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>
      {person.notes ? (
        <p className="mt-4 text-sm text-stone-700 leading-relaxed border-t pt-4">{person.notes}</p>
      ) : (
        <p className="mt-4 text-sm text-stone-400 italic border-t pt-4">{t("printPage.noStory")}</p>
      )}
    </div>
  );
}

export default function BookPrint(props: PrintTemplateProps) {
  const { tree, people, rels, levels, rootPersonId, scopeSummary, accent, designName, today } = props;
  const { t } = useTranslation();

  const sortedPeople = sortPeopleByGeneration(people, levels);

  return (
    <div>
      <BookCover tree={tree} accent={accent} />

      <PrintMetaHeader
        designName={designName}
        tree={tree}
        people={people}
        rels={rels}
        levels={levels}
        today={today}
        accent={accent}
        scopeSummary={scopeSummary}
        className="mb-6 text-center border-b border-stone-300 pb-4"
      />

      <h2 className="font-display text-xl font-bold text-center mb-6" style={{ color: accent }}>
        {t("printPage.bookChapters")}
      </h2>

      <div className="columns-1 sm:columns-2 gap-6">
        {sortedPeople.map((p, i) => (
          <BookPage key={p.id} person={p} accent={accent} pageNum={i + 1} />
        ))}
      </div>

      <h2
        className="font-display text-xl font-bold text-center mb-4 mt-10 print:break-before-page"
        style={{ color: accent }}
      >
        {t("printPage.bookTree")}
      </h2>
      <div className="rounded-xl border p-4" style={{ borderColor: `${accent}44` }}>
        <PrintFamilyChart people={people} rels={rels} rootPersonId={rootPersonId} levels={levels} />
      </div>

      <PrintMetaFooter designName={designName} accent={accent} people={people} rels={rels} levels={levels} today={today} />
    </div>
  );
}

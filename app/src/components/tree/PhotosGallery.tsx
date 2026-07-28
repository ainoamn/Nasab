import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import { Image as ImageIcon, Star, House } from "lucide-react";
import { cn } from "@/lib/utils";
import { relationToFocus } from "@/lib/relationshipLabel";
import { isTwin, twinGroupSize, twinOrderInGroup } from "@/lib/twins";
import TwinBadge from "@/components/tree/TwinBadge";

type Props = {
  people: Person[];
  rels?: Relationship[];
  onPersonClick?: (person: Person) => void;
  homePersonId?: number | null;
  favoriteIds?: number[];
  recentIds?: number[];
  kinshipFocusId?: number | null;
};

/** معرض صور أفراد الشجرة — ترتيب شخصي + شارة قرابة */
export default function PhotosGallery({
  people,
  rels = [],
  onPersonClick,
  homePersonId = null,
  favoriteIds = [],
  recentIds = [],
  kinshipFocusId = null,
}: Props) {
  const { t } = useTranslation();
  const favSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const recentIndex = useMemo(() => {
    const m = new Map<number, number>();
    recentIds.forEach((id, i) => m.set(id, i));
    return m;
  }, [recentIds]);
  const kinId = kinshipFocusId ?? homePersonId;

  const withPhotos = useMemo(() => {
    return people
      .filter((p) => !!p.photoUrl)
      .sort((a, b) => {
        const rank = (p: Person) => {
          if (homePersonId != null && p.id === homePersonId) return 0;
          if (favSet.has(p.id)) return 1;
          if (recentIndex.has(p.id)) return 10 + (recentIndex.get(p.id) ?? 0);
          return 100;
        };
        const ra = rank(a);
        const rb = rank(b);
        if (ra !== rb) return ra - rb;
        return a.givenName.localeCompare(b.givenName, "ar");
      });
  }, [people, homePersonId, favSet, recentIndex]);

  if (withPhotos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card py-20 text-center">
        <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="font-medium">{t("tree.photosEmpty")}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {t("tree.photosEmptyHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("tree.photosCount", { count: withPhotos.length })}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {withPhotos.map((p) => {
          const rel =
            kinId != null && rels.length > 0
              ? t(`tree.rel.${relationToFocus(kinId, p.id, people, rels)}`)
              : null;
          const isHome = homePersonId === p.id;
          const isFav = favSet.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPersonClick?.(p)}
              className={cn(
                "group overflow-hidden rounded-2xl border bg-card text-start shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
              )}
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={p.photoUrl!}
                  alt={p.givenName}
                  className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                />
                {(isHome || isFav) && (
                  <span className="absolute start-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 shadow-sm">
                    {isHome ? (
                      <House className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                    )}
                  </span>
                )}
              </div>
              <div className="px-2.5 py-2">
                <p className="flex items-center gap-1 truncate text-sm font-semibold">
                  {p.givenName}
                  {isTwin(p, people) ? (
                    <TwinBadge
                      compact
                      order={twinOrderInGroup(p, people)}
                      total={twinGroupSize(p, people)}
                    />
                  ) : null}
                </p>
                {rel ? (
                  <p className="truncate text-[11px] font-medium text-sky-800">
                    {rel}
                  </p>
                ) : (
                  p.fatherName && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {p.fatherName}
                    </p>
                  )
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person } from "@db/tables";
import { Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  people: Person[];
  onPersonClick?: (person: Person) => void;
};

/** معرض صور أفراد الشجرة */
export default function PhotosGallery({ people, onPersonClick }: Props) {
  const { t } = useTranslation();
  const withPhotos = useMemo(
    () => people.filter((p) => !!p.photoUrl),
    [people],
  );

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
        {withPhotos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPersonClick?.(p)}
            className={cn(
              "group overflow-hidden rounded-2xl border bg-card text-start shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
            )}
          >
            <div className="aspect-square overflow-hidden bg-muted">
              <img
                src={p.photoUrl!}
                alt={p.givenName}
                className="h-full w-full object-cover transition group-hover:scale-[1.03]"
              />
            </div>
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-semibold">{p.givenName}</p>
              {p.fatherName && (
                <p className="truncate text-[11px] text-muted-foreground">
                  {p.fatherName}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

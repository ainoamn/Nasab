import { useTranslation } from "react-i18next";
import type {
  TreeRole,
  PersonPrivacy,
  TreeVisibility,
  FemaleDisplay,
} from "@contracts/constants";
import { localeTag } from "@/i18n";

/**
 * Hook يرجع خرائط التسميات بلغة الواجهة الحالية + دالة تنسيق السنوات.
 * الاستخدام: const L = useLabels(); ثم L.roles[role]
 */
export function useLabels() {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;

  const roles: Record<TreeRole, string> = {
    owner: t("roles.owner"),
    admin: t("roles.admin"),
    editor: t("roles.editor"),
    viewer: t("roles.viewer"),
  };

  const roleDescriptions: Record<TreeRole, string> = {
    owner: t("roles.desc.owner"),
    admin: t("roles.desc.admin"),
    editor: t("roles.desc.editor"),
    viewer: t("roles.desc.viewer"),
  };

  const privacy: Record<PersonPrivacy, string> = {
    private: t("privacyLevels.private"),
    family: t("privacyLevels.family"),
    linked: t("privacyLevels.linked"),
    public: t("privacyLevels.public"),
  };

  const privacyDescriptions: Record<PersonPrivacy, string> = {
    private: t("privacyLevels.desc.private"),
    family: t("privacyLevels.desc.family"),
    linked: t("privacyLevels.desc.linked"),
    public: t("privacyLevels.desc.public"),
  };

  const visibility: Record<TreeVisibility, string> = {
    private: t("visibility.private"),
    unlisted: t("visibility.unlisted"),
    public: t("visibility.public"),
  };

  const visibilityDescriptions: Record<TreeVisibility, string> = {
    private: t("visibility.desc.private"),
    unlisted: t("visibility.desc.unlisted"),
    public: t("visibility.desc.public"),
  };

  const femaleDisplay: Record<FemaleDisplay, string> = {
    full: t("femaleDisplay.full"),
    firstOnly: t("femaleDisplay.firstOnly"),
    hidden: t("femaleDisplay.hidden"),
  };

  const actionLabel = (action: string): string =>
    t(`actions.${action}`, { defaultValue: action });

  const formatYears = (
    birthYear: number | null,
    deathYear: number | null,
    isLiving: boolean,
  ): string => {
    const parts: string[] = [];
    if (birthYear) parts.push(`${t("common.born")} ${birthYear}`);
    if (!isLiving && deathYear) parts.push(`${t("common.died")} ${deathYear}`);
    return parts.join(" — ");
  };

  const personCount = (n: number): string =>
    n === 1 ? t("common.personCountOne", { count: n }) : t("common.personCount", { count: n });

  const formatDate = (d: Date | string): string =>
    new Date(d).toLocaleString(localeTag(lng));

  const formatDateOnly = (d: Date | string): string =>
    new Date(d).toLocaleDateString(localeTag(lng));

  return {
    roles,
    roleDescriptions,
    privacy,
    privacyDescriptions,
    visibility,
    visibilityDescriptions,
    femaleDisplay,
    actionLabel,
    formatYears,
    personCount,
    formatDate,
    formatDateOnly,
    t,
    lng,
  };
}

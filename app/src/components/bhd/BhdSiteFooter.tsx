import { useTranslation } from "react-i18next";
import { BHD_APPS } from "@/lib/bhd/apps";
import { BhdAppIcon } from "@/components/bhd/BhdAppIcon";
import "@/bhd-footer.css";

const PORTAL = "https://www.bhd-om.com";

const COMPANY_LINKS = [
  { href: `${PORTAL}/about`, key: "about" },
  { href: `${PORTAL}/brand`, key: "brand" },
  { href: `${PORTAL}/apps`, key: "apps" },
  { href: `${PORTAL}/privacy`, key: "privacy" },
  { href: `${PORTAL}/terms`, key: "terms" },
  { href: `${PORTAL}/security`, key: "security" },
] as const;

/** فوتر المجموعة — الدليل المرجعي القسم 0.5 */
export function BhdSiteFooter() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith("ar") !== false;
  const programs = BHD_APPS.filter(
    (app) => app.enabled && app.id !== "account",
  );

  return (
    <footer className="bhd-site-footer no-print">
      <div className="bhd-footer-inner">
        <div className="bhd-footer-programs-head">
          <p>{t("bhdFooter.programs")}</p>
          <a href={`${PORTAL}/apps`}>{t("bhdFooter.allApps")}</a>
        </div>
        <div className="bhd-footer-programs-grid">
          {programs.map((app) => {
            const href =
              app.mode === "sso" && app.startUrl
                ? app.startUrl
                : app.origin
                  ? `${app.origin.replace(/\/$/, "")}/`
                  : `${PORTAL}/apps`;
            return (
              <a
                key={app.id}
                href={href}
                className="bhd-footer-program"
                title={isAr ? app.nameAr : app.nameEn}
              >
                <BhdAppIcon id={app.id} title={isAr ? app.nameAr : app.nameEn} />
                <span>{isAr ? app.nameAr : app.nameEn}</span>
              </a>
            );
          })}
        </div>

        <div className="bhd-footer-links">
          {COMPANY_LINKS.map((link) => (
            <a key={link.key} href={link.href}>
              {t(`bhdFooter.${link.key}`)}
            </a>
          ))}
          <a href="/api/auth/admin-entry">{t("footerAdminEntry")}</a>
        </div>

        <p className="bhd-footer-copy">{t("bhdFooter.rights")}</p>
      </div>
    </footer>
  );
}

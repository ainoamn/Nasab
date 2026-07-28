import { useEffect, useState } from "react";

const GITHUB_MAIN_SHA =
  "https://api.github.com/repos/ainoamn/Nasab/commits/main";

export type BuildBehindState = {
  liveBuild: string | null;
  mainSha: string | null;
  buildBehind: boolean;
  dbConfigured: boolean | null;
  loading: boolean;
};

/** مقارنة بصمة البناء الحي مع آخر commit على GitHub main */
export function useBuildBehind(): BuildBehindState {
  const [liveBuild, setLiveBuild] = useState<string | null>(null);
  const [mainSha, setMainSha] = useState<string | null>(null);
  const [dbConfigured, setDbConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/diag")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { build?: string | null; dbConfigured?: boolean } | null) => {
        if (cancelled) return;
        if (d?.build) setLiveBuild(d.build);
        if (d && typeof d.dbConfigured === "boolean") {
          setDbConfigured(d.dbConfigured);
        }
      })
      .catch(() => {
        /* optional */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch(GITHUB_MAIN_SHA, {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { sha?: string } | null) => {
        if (!cancelled && d?.sha) setMainSha(d.sha.slice(0, 7));
      })
      .catch(() => {
        /* optional */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    liveBuild,
    mainSha,
    buildBehind: Boolean(liveBuild && mainSha && liveBuild !== mainSha),
    dbConfigured,
    loading,
  };
}

import { createRouter, publicQuery } from "./middleware";
import { getCompanyBranding } from "./lib/companySettings";
import { ensurePlatformDefaults } from "./seedDefaults";

export const platformRouter = createRouter({
  getBranding: publicQuery.query(async () => {
    await ensurePlatformDefaults();
    return getCompanyBranding();
  }),
});

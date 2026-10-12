import type { RvtiItemBase } from "./rvtiTypes";

import { rvtiItemsDomainSex } from "./items/rvtiItemsDomainSex";
import { rvtiItemsDomainFinance } from "./items/rvtiItemsDomainFinance";
import { rvtiItemsDomainAutonomy } from "./items/rvtiItemsDomainAutonomy";
import { rvtiItemsDomainChildren } from "./items/rvtiItemsDomainChildren";

/**
 * ACTIVE DOMAINS
 * These are the domains currently implemented and safe to load.
 */
const activeDomainBanks: RvtiItemBase[][] = [
  rvtiItemsDomainSex,
  rvtiItemsDomainFinance,
  rvtiItemsDomainAutonomy,
  rvtiItemsDomainChildren,
];

/**
 * FULL ACTIVE ITEM BANK
 * This is the complete RVTI bank for currently implemented domains.
 */
export const rvtiItemBank: RvtiItemBase[] = activeDomainBanks.flat();

/**
 * DEV ITEM BANK
 * The dashboard now presents by domain card, so a grouped bank is cleaner
 * than heavy item-level interleaving.
 */
export const rvtiDevItemBank: RvtiItemBase[] = [
  ...rvtiItemsDomainSex,
  ...rvtiItemsDomainFinance,
  ...rvtiItemsDomainAutonomy,
  ...rvtiItemsDomainChildren,
];

/**
 * FUTURE DOMAIN PLAN (not active yet)
 *
 * These are the planned domains for future RVTI expansion.
 * Do not import or spread them into the live banks until:
 * 1. the item file exists
 * 2. rvtiTypes.ts includes the domain id
 * 3. rvtiScoring.ts includes the scoring function
 * 4. the dashboard title/intro mapping is ready
 *
 * Planned IDs:
 *
 * RVTI_PWR  = Power & Control Distribution
 * RVTI_SPI  = Spiritual / Meaning Framework
 * RVTI_MOR  = Moral Integrity & Honesty
 * RVTI_CON  = Conflict Philosophy
 * RVTI_GEN  = Gender Role Expectations
 * RVTI_AMB  = Ambition & Life Direction
 * RVTI_EXT  = Extended Family Boundaries
 * RVTI_PRI  = Privacy & Transparency Expectations
 * RVTI_SOC  = Social & Lifestyle Compatibility
 * RVTI_HEA  = Health & Self-Care Philosophy
 *
 * Future activation pattern:
 *
 * import { rvtiItemsDomainPower } from "./items/rvtiItemsDomainPower";
 * activeDomainBanks.push(rvtiItemsDomainPower);
 *
 * Or add directly:
 * const activeDomainBanks: RvtiItemBase[][] = [
 *   rvtiItemsDomainSex,
 *   rvtiItemsDomainFinance,
 *   rvtiItemsDomainAutonomy,
 *   rvtiItemsDomainChildren,
 *   rvtiItemsDomainPower,
 * ];
 */
import type { PublicContentV2, PublicContentV4, PublicContentV5 } from '@smd/content-contracts/contracts';
import type { SelectedPublicPageState } from '../composables/useSelectedCategoryPage.ts';
import type { CurriculumOperationalState } from '../data/curriculum-r1-types.ts';
import { validPublishedKakaoUrl } from '../data/home-r2-navigation.ts';
export function resolveCurriculumOperationalState(c: PublicContentV2 | PublicContentV4 | PublicContentV5 | null,
  s: SelectedPublicPageState | null, path: string): CurriculumOperationalState | null {
  if (path !== '/curriculum' || !c || !s || s.path !== path || s.selected.mode !== 'legacy' ||
      s.selected.pageId !== 'curriculum' || s.publicationId !== c.publication.id || s.publicationDigest !== c.publication.digest) return null;
  return { publicationKey: c.publication.id+':'+c.publication.digest,
    consultationUrl: validPublishedKakaoUrl(c.navigation.kakaoUrl),
    afterTeach:c.pageSlots.curriculum.afterTeach??[],afterLearningPath:c.pageSlots.curriculum.afterLearningPath??[],beforeCta:c.pageSlots.curriculum.beforeCta??[] };
}

import type { PublicContentV2 } from '@smd/content-contracts/contracts';
export const useSiteContent = () => useState<PublicContentV2 | null>('smd-public-content', () => null);

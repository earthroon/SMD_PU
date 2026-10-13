import { coreRequest, coreBindingAvailable } from '../utils/public-core';
import seed from '@smd/content-contracts/seed-content.json';
import type { PublicContentV2 } from '@smd/content-contracts/contracts';
import { publicSlots } from '@smd/content-contracts/page-slot-contracts';
import pages from '../../fixtures/page-copy.source.json';

export default defineEventHandler(async (event):Promise<PublicContentV2> => {
  if (import.meta.dev && process.env.SMD_DEV_FIXTURE_ONLY==='1' && !coreBindingAvailable(event)) {
    setHeader(event,'x-content-authority','DEV_FIXTURE_ONLY');
    return {...seed,pages,pageSlots:publicSlots(pages),publication:{id:'DEV_FIXTURE_ONLY',revision:0,at:'1970-01-01T00:00:00.000Z',digest:'DEV_FIXTURE_NOT_PUBLISHED'}} as PublicContentV2;
  }
  return await coreRequest<PublicContentV2>(event,'/v2/content');
});

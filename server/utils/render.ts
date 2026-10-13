import {LEGACY_CANONICAL_PATHS} from '@smd/content-contracts/category-page-contracts';
import type {RenderResponseV3,PublicRenderedPageV3} from '@smd/content-contracts/contracts';
const record=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const meta=(x:unknown):x is {id:string;revision:number;digest:string;at:string}=>record(x)&&
  typeof x.id==='string'&&typeof x.digest==='string'&&typeof x.at==='string'&&
  Number.isSafeInteger(x.revision);
export function validateRenderResponse(x:unknown,requestedPath:string):RenderResponseV3 {
  if(!record(x)||x.requestedPath!==requestedPath||x.resolvedPath!==requestedPath||
    !meta(x.publication)||!record(x.shared)||!meta(x.shared.publication)||!record(x.selected))
    throw createError({statusCode:503,statusMessage:'CMS_RENDER_CONTRACT_INVALID'});
  const p=x.publication,s=x.shared.publication;
  if(p.id!==s.id||p.digest!==s.digest||p.revision!==s.revision||!record(x.shared.pageSlots)||
    !record(x.shared.pages)||!record(x.shared.navigation)||!record(x.shared.archive)||
    !record(x.shared.promotion)||typeof x.selected.pageId!=='string'||
    !record(x.selected.seo)||typeof x.selected.seo.title!=='string'||
    typeof x.selected.seo.description!=='string'||typeof x.selected.seo.noindex!=='boolean')
    throw createError({statusCode:503,statusMessage:'CMS_RENDER_CONTRACT_INVALID'});
  const selected=x.selected as PublicRenderedPageV3;
  switch(selected.mode){
    case 'legacy':
      if(typeof selected.templateKind!=='string'||!selected.templateKind.startsWith('legacy-')||
        LEGACY_CANONICAL_PATHS[selected.pageId]!==requestedPath||!record(selected.slots))throw createError({statusCode:503,statusMessage:'CMS_RENDER_CONTRACT_INVALID'});
      break;
    case 'category':
      if(!['archive-category-v1','category-standard-v1'].includes(selected.templateKind)||
        Object.values(LEGACY_CANONICAL_PATHS).includes(requestedPath as (typeof LEGACY_CANONICAL_PATHS)[keyof typeof LEGACY_CANONICAL_PATHS])||
        typeof selected.categoryId!=='string'||!record(selected.hero)||!record(selected.slots)||
        (selected.templateKind==='archive-category-v1'&&!Array.isArray(selected.archiveItems)))
        throw createError({statusCode:503,statusMessage:'CMS_RENDER_CONTRACT_INVALID'});
      break;
    default:throw createError({statusCode:503,statusMessage:'CMS_RENDER_CONTRACT_INVALID'});
  }
  return x as RenderResponseV3;
}

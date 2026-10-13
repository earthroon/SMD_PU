<script setup lang="ts">
import type {RenderResponseV3} from '@smd/content-contracts/contracts';
const route=useRoute();
const isStatic=computed(()=>route.path==='/privacy');
const content=useSiteContent();
const selected=useSelectedCategoryPage();
const requestKey=computed(()=>isStatic.value?`smd-static:${route.path}`:`smd-render:${route.path}`);
type RootResult = {mode:'static';path:string}|{mode:'public';path:string;render:RenderResponseV3}|
 {mode:'redirect';path:string;to:string};
const {data,error,pending}=await useAsyncData<RootResult>(requestKey,async(_app,{signal})=>{
  const path=route.path;
  if(path==='/admin'||path.startsWith('/admin/'))throw createError({statusCode:404,statusMessage:'PUBLIC_ADMIN_ROUTE_NOT_FOUND'});
  if(path==='/privacy')return {mode:'static',path};
  const response=await $fetch.raw<RenderResponseV3>('/api/render',{
    query:{path},signal,redirect:'manual',ignoreResponseError:true});
  if(response.status===308){
    const to=response.headers.get('location');
    if(!to||!/^\/[a-z0-9/-]+$/.test(to)||to.includes('//'))
      throw createError({statusCode:503,statusMessage:'CMS_RENDER_REDIRECT_INVALID'});
    return {mode:'redirect',path,to};
  }
  if(response.status!==200 || !response._data){
    const detail=response._data as unknown as {error?:string}|undefined;
    throw createError({statusCode:[400,404,503].includes(response.status)?response.status:503,
      statusMessage:detail?.error||'CMS_RENDER_FAILED'});
  }
  return {mode:'public',path,render:response._data};
},{dedupe:'cancel'});
/** Route identity must match before the shared and selected projections are accepted. */
watch([data,()=>route.path],([result,path])=>{
  if(result?.mode==='public'&&result.path===path&&
    result.render.requestedPath===path&&result.render.shared.publication.id===result.render.publication.id&&
    result.render.shared.publication.digest===result.render.publication.digest){
    selected.value={path,publicationId:result.render.publication.id,
      publicationDigest:result.render.publication.digest,selected:result.render.selected};
    content.value=result.render.shared;
  }else{
    selected.value=null;
    content.value=null;
  }
},{immediate:true,flush:'sync'});
const toPublicError=(failure:{statusCode?:number;statusMessage?:string})=>{
  const code=Number(failure.statusCode);
  return createError({statusCode:[400,404,503].includes(code)?code:503,
    statusMessage:failure.statusMessage||'공개 콘텐츠를 불러오지 못했습니다.',fatal:true});
};
if(!isStatic.value&&error.value)throw toPublicError(error.value);
if(data.value?.mode==='redirect'&&data.value.path===route.path){
  await navigateTo(data.value.to,{redirectCode:308,replace:true});
}
if(import.meta.client)watch(data,(result)=>{
  if(result?.mode==='redirect'&&result.path===route.path)
    void navigateTo(result.to,{replace:true,redirectCode:308});
});
if(import.meta.client)watch(error,(failure)=>{
  if(!isStatic.value&&failure)showError(toPublicError(failure));
});
const current=computed(()=>isStatic.value||Boolean(content.value&&selected.value&&
  selected.value.path===route.path&&content.value.publication.id===selected.value.publicationId&&
  content.value.publication.digest===selected.value.publicationDigest));
</script>
<template>
  <NuxtLayout>
    <NuxtPage v-if="current" />
    <section v-else class="container-x min-h-screen pt-40 pb-20" role="status">
      <h1 class="font-heading text-2xl">{{ pending ? '콘텐츠를 불러오는 중입니다.' : '콘텐츠를 불러오지 못했습니다.' }}</h1>
      <p v-if="!pending" class="mt-4 text-foreground-600">{{ error?.statusMessage || '공개 콘텐츠의 발행 상태를 확인해 주세요.' }}</p>
    </section>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { useSiteContent } from '~/composables/useSiteContent';
import { useHomeR2Published } from '~/composables/useHomeR2Published';
import { useSelectedCategoryPage } from '~/composables/useSelectedCategoryPage';
import {
  admitHomeScaffold, resolveHomeScaffoldPath, scaffoldAdmissionCurrent, homeR2PublishedFromRender,
  type PublicRenderResult, type ScaffoldAdmission,
} from '~/utils/homeR2ScaffoldAdmission';

const route = useRoute();
const requestEvent = import.meta.server ? useRequestEvent() : undefined;
const isStatic = computed(() => route.path === '/privacy');
const content = useSiteContent();
const homePublished = useHomeR2Published();
const selected = useSelectedCategoryPage();
const requestKey = computed(() => {
  switch (true) {
    case isStatic.value: return `smd-static:${route.path}`;
    case resolveHomeScaffoldPath(route.path) !== null: return `smd-scaffold:${route.path}`;
    default: return `smd-render:${route.path}`;
  }
});
type RootResult =
  | { mode: 'static'; path: string }
  | { mode: 'public'; path: string; render: PublicRenderResult }
  | { mode: 'redirect'; path: string; to: string }
  | ScaffoldAdmission;

const { data, error, pending } = await useAsyncData<RootResult>(requestKey, async (_app, { signal }) => {
  const path = route.path;
  if (path === '/admin' || path.startsWith('/admin/'))
    throw createError({ statusCode: 404, statusMessage: 'PUBLIC_ADMIN_ROUTE_NOT_FOUND' });
  if (path === '/privacy') return { mode: 'static', path };

  const scaffold = resolveHomeScaffoldPath(path);
  // A scaffold never fabricates a selected CMS page: its shared data is the *real* home publication.
  const sourcePath = scaffold === null ? path : '/';
  const target = `/api/render?path=${encodeURIComponent(sourcePath)}`;
  let response: Response;
  if (import.meta.server) {
    if (!requestEvent) throw createError({ statusCode: 503, statusMessage: 'PUBLIC_SSR_EVENT_UNAVAILABLE' });
    response = await requestEvent.fetch(target, { signal, redirect: 'manual' });
  } else {
    response = await fetch(target, { signal, redirect: 'manual' });
  }
  if (response.status === 308) {
    if (scaffold !== null) throw createError({ statusCode: 503, statusMessage: 'SMD_HOME_R2_SCAFFOLD_SOURCE_UNAVAILABLE' });
    const to = response.headers.get('location');
    if (!to || !/^\/[a-z0-9/-]+$/.test(to) || to.includes('//'))
      throw createError({ statusCode: 503, statusMessage: 'CMS_RENDER_REDIRECT_INVALID' });
    return { mode: 'redirect', path, to };
  }
  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw createError({ statusCode: 503, statusMessage: scaffold === null ? 'CMS_RENDER_RESPONSE_INVALID' : 'SMD_HOME_R2_SCAFFOLD_SOURCE_UNAVAILABLE' }); }

  if (response.status !== 200 || !payload || typeof payload !== 'object') {
    const detail = payload && typeof payload === 'object' && 'error' in payload &&
      typeof payload.error === 'string' ? payload.error : 'CMS_RENDER_FAILED';
    if (scaffold !== null) {
      throw createError({ statusCode: 503, statusMessage: 'SMD_HOME_R2_SCAFFOLD_SOURCE_UNAVAILABLE', data: { sourceCode: detail } });
    }
    throw createError({ statusCode: [400, 404, 503].includes(response.status) ? response.status : 503, statusMessage: detail });
  }
  if (scaffold !== null) {
    try { return admitHomeScaffold(path, payload); }
    catch { throw createError({ statusCode: 503, statusMessage: 'SMD_HOME_R2_SCAFFOLD_SOURCE_IDENTITY_DRIFT' }); }
  }
  return { mode: 'public', path, render: payload as PublicRenderResult };
}, { dedupe: 'cancel' });

/** Route identity must match before shared or selected projections are accepted. */
watch([data, () => route.path], ([result, path]) => {
  switch (result?.mode) {
    case 'public': {
      const r = result.render;
      if (result.path === path && r.requestedPath === path &&
          r.shared.publication.id === r.publication.id &&
          r.shared.publication.digest === r.publication.digest) {
        selected.value = { path, publicationId: r.publication.id,
          publicationDigest: r.publication.digest, selected: r.selected };
        content.value = r.shared;
        homePublished.value = homeR2PublishedFromRender(r);
        return;
      }
      break;
    }
    case 'scaffold':
      if (scaffoldAdmissionCurrent(result, path)) {
        selected.value = null; // A scaffold is not a CMS category or selected home page.
        content.value = result.render.shared;
        homePublished.value = homeR2PublishedFromRender(result.render);
        return;
      }
      break;
    default:
      break;
  }
  selected.value = null;
  content.value = null;
  homePublished.value = null;
}, { immediate: true, flush: 'sync' });

const toPublicError = (failure: { statusCode?: number; statusMessage?: string }) => {
  const code = Number(failure.statusCode);
  return createError({ statusCode: [400, 404, 503].includes(code) ? code : 503,
    statusMessage: failure.statusMessage || '공개 콘텐츠를 불러오지 못했습니다.', fatal: true });
};
if (!isStatic.value && error.value) throw toPublicError(error.value);
if (data.value?.mode === 'redirect' && data.value.path === route.path)
  await navigateTo(data.value.to, { redirectCode: 308, replace: true });
if (import.meta.client) watch(data, result => {
  if (result?.mode === 'redirect' && result.path === route.path)
    void navigateTo(result.to, { replace: true, redirectCode: 308 });
});
if (import.meta.client) watch(error, failure => {
  if (!isStatic.value && failure) showError(toPublicError(failure));
});

const current = computed(() => {
  if (isStatic.value) return true;
  const r = data.value;
  switch (r?.mode) {
    case 'public':
      return Boolean(content.value && selected.value &&
        r.path === route.path && selected.value.path === route.path &&
        content.value.publication.id === selected.value.publicationId &&
        content.value.publication.digest === selected.value.publicationDigest);
    case 'scaffold':
      return scaffoldAdmissionCurrent(r, route.path) && Boolean(content.value &&
        content.value.publication.id === r.render.publication.id &&
        content.value.publication.digest === r.render.publication.digest &&
        content.value.publication.revision === r.render.publication.revision && selected.value === null);
    default: return false;
  }
});
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

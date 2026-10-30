<script setup lang="ts">
import { useSiteContent } from '~/composables/useSiteContent';
import { homeFigmaText } from '~/data/home-r2-copy';
import { homeHeaderNavigationV2, assertHomeHeaderNavigationV2, validPublishedKakaoUrl } from '~/data/home-r2-navigation';
import HeaderBrandSymbol from './HeaderBrandSymbol.vue';

assertHomeHeaderNavigationV2();
const content = useSiteContent();
const route = useRoute();
const scrolled = ref(false);
const open = ref(false);
const toggle = ref<HTMLButtonElement | null>(null);
const nav = homeHeaderNavigationV2.items; // Same owner for both desktop and compact navigation.
const isHome = computed(() => route.path === '/');
const active = (to: string) => route.path === to;
const ctaHref = computed(() => validPublishedKakaoUrl(content.value?.navigation.kakaoUrl));
const brand = homeFigmaText['node-1:11'].characters;

let oldBodyOverflow: string | null = null;
function releaseDrawerLock() {
  if (!import.meta.client || oldBodyOverflow === null) return;
  document.body.style.overflow = oldBodyOverflow;
  oldBodyOverflow = null;
}
function setDrawerLock(enabled: boolean) {
  if (!import.meta.client) return;
  if (enabled) {
    if (oldBodyOverflow === null) {
      oldBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
  } else releaseDrawerLock();
}
function closeDrawer(restoreFocus = false) {
  open.value = false;
  if (restoreFocus && import.meta.client) nextTick(() => toggle.value?.focus());
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) closeDrawer(true);
}
function onScroll() { scrolled.value = window.scrollY > 16; }
watch(open, setDrawerLock, { flush: 'sync' });
watch(() => route.path, () => closeDrawer());
onMounted(() => {
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('keydown', onKeydown);
});
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('keydown', onKeydown);
  releaseDrawerLock();
});
</script>
<template>
  <header
    :class="['smd-site-header', { 'smd-site-header--home': isHome, 'smd-site-header--scrolled': scrolled || open }]"
    data-header-contract="SMD_HOME_HEADER_NAV_V2"
    data-figma-node="node-1:6"
  >
    <div class="smd-site-header__inner">
      <NuxtLink to="/" class="smd-site-header__brand" aria-label="SMD 아카데미 홈으로" @click="closeDrawer()">
        <span class="smd-site-header__symbol"><HeaderBrandSymbol /></span>
        <span class="smd-site-header__brand-label">{{ brand }}</span>
      </NuxtLink>

      <nav class="smd-site-header__desktop-nav" aria-label="주 메뉴">
        <NuxtLink
          v-for="item in nav" :key="item.id" :to="item.to"
          :data-header-item="item.id" :data-figma-node="item.sourceNodeKey"
          :aria-current="active(item.to) ? 'page' : undefined"
          class="smd-site-header__nav-link"
        >{{ item.label }}</NuxtLink>
      </nav>

      <a v-if="ctaHref" :href="ctaHref" target="_blank" rel="noopener noreferrer"
        class="smd-site-header__cta smd-site-header__desktop-cta" data-figma-node="node-1:19"
      >{{ homeHeaderNavigationV2.cta.label }}</a>
      <span v-else class="smd-site-header__cta-unavailable smd-site-header__desktop-cta" role="status">상담 연결 불가</span>

      <button ref="toggle" type="button" class="smd-site-header__toggle"
        :aria-expanded="open" aria-controls="smd-header-menu-drawer"
        :aria-label="open ? '메뉴 닫기' : '메뉴 열기'"
        @click="open ? closeDrawer(true) : (open = true)"
      ><i :class="['text-2xl', open ? 'ri-close-line' : 'ri-menu-line']" aria-hidden="true" /></button>
    </div>
    <div id="smd-header-menu-drawer" class="smd-site-header__drawer" :class="{ 'smd-site-header__drawer--open': open }" :inert="!open">
      <nav class="smd-site-header__drawer-nav" aria-label="모바일 메뉴">
        <NuxtLink v-for="item in nav" :key="item.id" :to="item.to"
          class="smd-site-header__drawer-link" :aria-current="active(item.to) ? 'page' : undefined"
          :data-header-item="item.id" @click="closeDrawer()"
        >{{ item.label }}</NuxtLink>
        <a v-if="ctaHref" :href="ctaHref" target="_blank" rel="noopener noreferrer"
          class="smd-site-header__drawer-cta" @click="closeDrawer()"
        >{{ homeHeaderNavigationV2.cta.label }}</a>
        <p v-else class="smd-site-header__drawer-unavailable" role="status">상담 연결을 사용할 수 없습니다.</p>
      </nav>
    </div>
  </header>
</template>
<style src="~/assets/css/home-r2-header.css"></style>

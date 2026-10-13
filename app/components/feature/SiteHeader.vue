<script setup lang="ts">
const content = useSiteContent();
const route = useRoute();
const scrolled = ref(false);
const open = ref(false);
const nav = computed(() => [
  ...(content.value?.navigation.leftNav ?? []),
  ...(content.value?.navigation.rightNav ?? []),
]);
const isActive = (to: string) => route.path === to;

// The mobile drawer owns only the overflow lock it acquired.
let bodyOverflowBeforeDrawer: string | null = null;
function releaseDrawerLock() {
  if (bodyOverflowBeforeDrawer === null || !import.meta.client) return;
  document.body.style.overflow = bodyOverflowBeforeDrawer;
  bodyOverflowBeforeDrawer = null;
}
function setDrawerLock(enabled: boolean) {
  if (!import.meta.client) return;
  if (enabled) {
    if (bodyOverflowBeforeDrawer === null) {
      bodyOverflowBeforeDrawer = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    return;
  }
  releaseDrawerLock();
}
function onScroll() {
  scrolled.value = window.scrollY > 16;
}
watch(open, setDrawerLock, { flush: 'sync' });
watch(() => route.path, () => { open.value = false; });
onMounted(() => {
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
});
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
  releaseDrawerLock();
});
</script>

<template>
  <header :class="[
    'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
    scrolled || open
      ? 'border-b border-background-200 bg-background-50/95 backdrop-blur-md'
      : 'border-b border-transparent bg-background-50/70 backdrop-blur-sm',
  ]">
    <div class="w-full px-5 md:px-8">
      <div class="grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-20">
        <div class="flex items-center gap-6">
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-md text-foreground-950 transition-colors hover:bg-background-100 lg:hidden"
            :aria-expanded="open"
            aria-label="메뉴 열기"
            @click="open = !open"
          >
            <i :class="['text-xl', open ? 'ri-close-line' : 'ri-menu-line']"></i>
          </button>
          <nav class="hidden items-center gap-7 lg:flex">
            <NuxtLink
              v-for="item in content?.navigation.leftNav"
              :key="item.to"
              :to="item.to"
              :class="[
                'whitespace-nowrap text-sm font-label transition-colors duration-300 hover:text-primary-600',
                isActive(item.to) ? 'text-primary-600' : 'text-foreground-800',
              ]"
            >{{ item.label }}</NuxtLink>
          </nav>
        </div>

        <div class="justify-self-center">
          <NuxtLink to="/" class="flex items-center gap-2.5 cursor-pointer" aria-label="SMD 아카데미 홈으로">
            <span class="grid h-8 w-8 place-items-center rounded-md bg-foreground-950 font-heading text-sm font-semibold text-background-50">S</span>
            <span class="font-heading text-[15px] font-semibold tracking-[0.02em] text-foreground-950">SMD ACADEMY</span>
          </NuxtLink>
        </div>

        <div class="flex items-center justify-end gap-6">
          <nav class="hidden items-center gap-7 lg:flex">
            <NuxtLink
              v-for="item in content?.navigation.rightNav"
              :key="item.to"
              :to="item.to"
              :class="[
                'whitespace-nowrap text-sm font-label transition-colors duration-300 hover:text-primary-600',
                isActive(item.to) ? 'text-primary-600' : 'text-foreground-800',
              ]"
            >{{ item.label }}</NuxtLink>
          </nav>
          <a :href="content?.navigation.kakaoUrl" target="_blank" rel="noopener noreferrer" class="btn-primary">상담 신청</a>
        </div>
      </div>
    </div>

    <div :class="[
      'overflow-hidden border-t border-background-200 bg-background-50 transition-[max-height] duration-500 lg:hidden',
      open ? 'max-h-[420px]' : 'max-h-0 border-t-transparent',
    ]">
      <nav class="flex flex-col px-5 py-3">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          :class="[
            'border-b border-background-200/70 py-3.5 text-sm font-label transition-colors hover:text-primary-600',
            isActive(item.to) ? 'text-primary-600' : 'text-foreground-800',
          ]"
        >{{ item.label }}</NuxtLink>
        <a
          :href="content?.navigation.kakaoUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-4 inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-primary-500 px-4 py-2.5 font-label text-sm text-background-50"
        >카카오톡 상담 신청</a>
      </nav>
    </div>
  </header>
</template>

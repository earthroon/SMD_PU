<script setup lang="ts">
import {ARCHIVE_YOUTUBE_ID} from '@smd/content-contracts/archive-contracts';
const props=defineProps<{youtubeId:string;title:string;posterKey:string|null}>();
const playing=ref(false);
const valid=computed(()=>ARCHIVE_YOUTUBE_ID.test(props.youtubeId));
const originalUrl=computed(()=>`https://www.youtube.com/watch?v=${props.youtubeId}`);
const embedUrl=computed(()=>`https://www.youtube.com/embed/${props.youtubeId}`);
const poster=computed(()=>props.posterKey?`/api/archive/media/${props.posterKey.slice(8)}`:
  `https://i.ytimg.com/vi/${props.youtubeId}/hqdefault.jpg`);
</script>
<template>
  <div class="relative aspect-[4/3] overflow-hidden rounded-lg bg-foreground-900">
    <template v-if="valid">
      <iframe v-if="playing" class="h-full w-full" :src="embedUrl" :title="`${title} YouTube 영상`"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin" allowfullscreen />
      <button v-else type="button" class="relative block h-full w-full cursor-pointer"
        :aria-label="`${title} 영상 재생`" @click="playing=true">
        <img :src="poster" :alt="`${title} 영상 미리보기`" loading="lazy" class="h-full w-full object-cover" />
        <span class="absolute inset-0 grid place-items-center bg-black/10 transition-colors hover:bg-black/25">
          <span class="grid h-14 w-14 place-items-center rounded-full bg-background-50/95 text-foreground-950 shadow-md">
            <i aria-hidden="true" class="ri-play-fill text-3xl" />
          </span>
        </span>
      </button>
      <a :href="originalUrl" target="_blank" rel="noopener noreferrer"
         class="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-[11px] text-white">YouTube에서 보기 ↗</a>
    </template>
    <span v-else class="grid h-full place-items-center text-sm text-white">영상 주소가 올바르지 않습니다.</span>
  </div>
</template>

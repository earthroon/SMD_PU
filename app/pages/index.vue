<script setup lang="ts">
import CmsSlot from '~/components/cms/CmsSlot.vue';
import HeroSection from '~/components/home/HeroSection.vue';
import StatementSection from '~/components/home/StatementSection.vue';
import TeachSection from '~/components/home/TeachSection.vue';
import PracticeBlock from '~/components/feature/PracticeBlock.vue';
import ArchiveGallery from '~/components/feature/ArchiveGallery.vue';
import CtaBand from '~/components/feature/CtaBand.vue';
const content=useSiteContent();
useSeoMeta({title:'SMD 아카데미 | 인테리어필름 시공 실무 교육'});
</script>
<template><HeroSection /><CmsSlot :nodes="content?.pageSlots.home.afterHero??[]" /><StatementSection /><CmsSlot :nodes="content?.pageSlots.home.afterStatement??[]" /><TeachSection /><CmsSlot :nodes="content?.pageSlots.home.afterTeach??[]" /><PracticeBlock /><CmsSlot :nodes="content?.pageSlots.home.afterPractice??[]" /><ArchiveGallery /><CmsSlot :nodes="content?.pageSlots.home.beforeCta??[]" /><CtaBand :title="content?.promotion.ctaTitle??'상담 신청하기'" :link-label="content?.pages.promotion.ctaLinkLabel" external /></template>

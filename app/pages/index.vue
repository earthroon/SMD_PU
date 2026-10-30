<script setup lang="ts">
import { useSiteContent } from '~/composables/useSiteContent';
import { assertHomeBodyPlan } from '~/data/home-r2-composition';
import { examineHomeLegacySlots } from '~/utils/homeR2Admission';
import HeroSection from '~/components/home/HeroSection.vue';
import HomeInfoBar from '~/components/home/HomeInfoBar.vue';
import StatementSection from '~/components/home/StatementSection.vue';
import TeachSection from '~/components/home/TeachSection.vue';
import HomeBenefits from '~/components/home/HomeBenefits.vue';
import HomeMethods from '~/components/home/HomeMethods.vue';
import HomeLocation from '~/components/home/HomeLocation.vue';
import HomeFaq from '~/components/home/HomeFaq.vue';
import HomeConsultationCta from '~/components/home/HomeConsultationCta.vue';

assertHomeBodyPlan();
const content = useSiteContent();
const legacyAdmission = computed(() => content.value ? examineHomeLegacySlots(content.value.pageSlots.home) : null);
// Historical CMS inserts are not silently dropped or assigned to arbitrary Figma sections.
const rejectLegacySlots = (status: typeof legacyAdmission.value) => {
  if (status?.kind !== 'conflict') return;
  const error = createError({ statusCode: 503, statusMessage: status.code, fatal: true });
  if (import.meta.server) throw error;
  showError(error);
};
rejectLegacySlots(legacyAdmission.value);
if (import.meta.client) watch(legacyAdmission, rejectLegacySlots, { flush: 'sync' });
useSeoMeta({ title: 'SMD 아카데미 | 인테리어필름 시공 실무 교육' });
</script>
<template>
  <!-- The default layout is the sole Header/Footer owner. Source/paint order is not changed. -->
  <div v-if="legacyAdmission?.kind === 'empty'" class="smd-home" data-home-layout-contract="SMD-HOME-R2-CF3">
    <HeroSection />
    <HomeInfoBar />
    <StatementSection />
    <TeachSection />
    <HomeBenefits />
    <HomeMethods />
    <HomeLocation />
    <HomeFaq />
    <HomeConsultationCta />
  </div>
</template>

<style src="~/assets/css/home-r2.css"></style>

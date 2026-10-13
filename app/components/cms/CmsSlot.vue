<script setup lang="ts">
import type { CmsRootNode } from '@smd/content-contracts/page-slot-contracts';
import { cmsComponent } from './cms-component-registry';
defineProps<{nodes:readonly CmsRootNode[]}>();
</script>
<!-- No wrapper: empty slot produces no HTML element. -->
<template><component v-for="node in nodes" :key="node.id" :is="cmsComponent(node)" :node="node" /></template>

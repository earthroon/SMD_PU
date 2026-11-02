import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import {
  HOME_INTRO_DESKTOP_MEDIA,
  HOME_INTRO_MIN_RELEASE_MS,
  HOME_INTRO_REVEAL_COMPLETE_MS,
  HOME_INTRO_TIMING,
  barProgress,
  canReleaseIntro,
  iconProgress,
  introTargetScrollY,
} from '~/utils/homeIntroTimeline';

export type HomeIntroPhase = 'disabled' | 'idle' | 'revealing' | 'settling' | 'released';
type ReleaseReason =
  | 'completed' | 'viewport-changed' | 'media-changed' | 'page-hidden'
  | 'keyboard-scroll' | 'unmounted';

/** Home-only, single-owner wheel and RAF coordinator. Does not mutate Header or Figma source. */
export function useHomeIntroReveal(stageRef: Ref<HTMLElement | null>) {
  const phase = ref<HomeIntroPhase>('disabled');
  const admitted = ref(false);
  const admissionReason = ref('NOT_MOUNTED');
  const releaseReason = ref<ReleaseReason | null>(null);
  const ignoredWheelEvents = ref(0);
  const animationStarts = ref(0);

  let media: MediaQueryList | null = null;
  let rafId: number | null = null;
  let startedAt = 0;
  let lastWheelAt = 0;
  let startScrollY = 0;
  let targetScrollY = 0;
  let wheelInstalled = false;
  let mounted = false;
  let scrollingElement: HTMLElement | null = null;
  let originalScrollBehavior: { value: string; priority: string } | null = null;

  const setVar = (name: string, value: number, unit = '') => {
    stageRef.value?.style.setProperty(name, `${value.toFixed(6)}${unit}`);
  };

  function present(elapsedMs: number, updateScroll: boolean): void {
    const bar = barProgress(elapsedMs);
    setVar('--smd-intro-bar-opacity', bar);
    setVar('--smd-intro-bar-y', HOME_INTRO_TIMING.barEntryOffsetPx * (1 - bar), 'px');
    for (let i = 0; i < HOME_INTRO_TIMING.iconCount; i++) {
      const p = iconProgress(elapsedMs, i);
      setVar(`--smd-intro-icon-${i}-opacity`, p);
      setVar(`--smd-intro-icon-${i}-y`, HOME_INTRO_TIMING.iconEntryOffsetPx * (1 - p), 'px');
    }
    if (updateScroll) {
      // 'auto' is explicitly installed on the scrolling element before this call.
      const current = startScrollY + (targetScrollY - startScrollY) * bar;
      window.scrollTo({ top: current, behavior: 'auto' });
    }
  }

  function ownScrollBehavior(): void {
    const element = document.scrollingElement;
    if (!(element instanceof HTMLElement)) {
      throw new Error('SMD_INTRO_SCROLLING_ELEMENT_UNAVAILABLE');
    }
    scrollingElement = element;
    originalScrollBehavior = {
      value: element.style.getPropertyValue('scroll-behavior'),
      priority: element.style.getPropertyPriority('scroll-behavior'),
    };
    element.style.setProperty('scroll-behavior', 'auto', 'important');
  }

  function restoreScrollBehavior(): void {
    const el = scrollingElement;
    const original = originalScrollBehavior;
    scrollingElement = null;
    originalScrollBehavior = null;
    if (!el || !original) return;
    if (el.style.getPropertyValue('scroll-behavior') !== 'auto'
        || el.style.getPropertyPriority('scroll-behavior') !== 'important') return;
    if (original.value) el.style.setProperty('scroll-behavior', original.value, original.priority);
    else el.style.removeProperty('scroll-behavior');
  }

  function removeWheel(): void {
    if (!wheelInstalled) return;
    window.removeEventListener('wheel', onWheel, true);
    wheelInstalled = false;
  }

  function onIdleScroll(): void {
    // Browser restoration, scrollbar drag, and non-wheel scrolling must not be reinterpreted as an intro.
    if (phase.value !== 'idle' || window.scrollY <= 2) return;
    admissionReason.value = 'RESTORED_OR_EXTERNAL_SCROLL';
    removeWheel();
    phase.value = 'released';
  }

  function release(reason: ReleaseReason, completeVisual: boolean, snapToTarget: boolean): void {
    if (rafId !== null) window.cancelAnimationFrame(rafId);
    rafId = null;
    if (completeVisual) present(HOME_INTRO_REVEAL_COMPLETE_MS, false);
    // Never replay suppressed wheel deltas. Snap only for a completed or interrupted intro.
    if (snapToTarget && originalScrollBehavior !== null) {
      window.scrollTo({ top: targetScrollY, behavior: 'auto' });
    }
    restoreScrollBehavior();
    removeWheel();
    window.removeEventListener('scroll', onIdleScroll);
    releaseReason.value = reason;
    phase.value = 'released';
  }

  function tick(now: number): void {
    rafId = null;
    if (!mounted || phase.value === 'released' || phase.value === 'disabled') return;
    const elapsed = Math.max(0, now - startedAt);
    present(elapsed, true);
    if (elapsed >= HOME_INTRO_REVEAL_COMPLETE_MS && phase.value === 'revealing') {
      phase.value = 'settling';
    }
    if (canReleaseIntro(elapsed, now - lastWheelAt)) {
      release('completed', true, true);
      return;
    }
    rafId = window.requestAnimationFrame(tick);
  }

  function startFirstWheel(now: number): void {
    const stage = stageRef.value;
    if (!stage) throw new Error('SMD_INTRO_STAGE_MISSING');
    const info = stage.querySelector<HTMLElement>('.smd-figma-scene-section--info-bar');
    if (!info) throw new Error('SMD_INTRO_INFO_BAR_MISSING');
    startScrollY = window.scrollY;
    targetScrollY = introTargetScrollY(
      stage.getBoundingClientRect().bottom + startScrollY,
      window.innerHeight,
    );
    if (targetScrollY <= startScrollY + 1 || info.getBoundingClientRect().height <= 0) {
      throw new Error('SMD_INTRO_TARGET_GEOMETRY_INVALID');
    }
    ownScrollBehavior();
    animationStarts.value += 1;
    startedAt = now;
    lastWheelAt = now;
    phase.value = 'revealing';
    present(0, false);
    rafId = window.requestAnimationFrame(tick);
  }

  function onWheel(event: WheelEvent): void {
    if (!admitted.value || event.ctrlKey) return;
    switch (phase.value) {
      case 'idle': {
        if (event.deltaY <= 0 || !event.cancelable || window.scrollY > 2) return;
        // Header interactions retain their owner; the intro only listens to page input.
        if (event.target instanceof Element && event.target.closest('.smd-site-header')) return;
        event.preventDefault();
        try {
          startFirstWheel(performance.now());
        } catch (error) {
          release('viewport-changed', true, false);
          console.error('SMD_INTRO_FIRST_WHEEL_FAILED', error);
        }
        break;
      }
      case 'revealing':
      case 'settling': {
        // One burst is not the second scroll. No accumulation or delayed replay.
        if (event.cancelable) event.preventDefault();
        ignoredWheelEvents.value += 1;
        lastWheelAt = performance.now();
        break;
      }
      default:
        break;
    }
  }

  function validDesktop(): string | null {
    const stage = stageRef.value;
    if (!stage || !stage.isConnected) return 'INTRO_NOT_CURRENT';
    if (!media?.matches) return 'NON_DESKTOP_VIEWPORT_OR_REDUCED_MOTION';
    if (navigator.maxTouchPoints > 0) return 'TOUCH_CAPABLE_DEVICE';
    const heroSvg = stage.querySelector<SVGSVGElement>('.smd-figma-scene-section--hero svg');
    const info = stage.querySelector<HTMLElement>('.smd-figma-scene-section--info-bar');
    if (!heroSvg || !info || info.getBoundingClientRect().height <= 0) return 'GEOMETRY_UNAVAILABLE';
    if (heroSvg.getBoundingClientRect().height > window.innerHeight) return 'HERO_EXCEEDS_AVAILABLE_VIEWPORT';
    return null;
  }

  function onEnvironmentChange(): void {
    if (!mounted) return;
    const invalid = validDesktop();
    if (!invalid) return;
    admissionReason.value = invalid;
    switch (phase.value) {
      case 'revealing':
      case 'settling':
        release('media-changed', true, true);
        break;
      case 'idle':
        removeWheel();
        window.removeEventListener('scroll', onIdleScroll);
        phase.value = 'disabled';
        break;
      default:
        break;
    }
    admitted.value = false;
  }

  function onResize(): void {
    onEnvironmentChange();
    if (phase.value !== 'revealing' && phase.value !== 'settling') return;
    // A resize changes the exact destination. Finish using the new DOM boundary; never use stale Y.
    const stage = stageRef.value;
    if (stage) {
      try {
        targetScrollY = introTargetScrollY(
          stage.getBoundingClientRect().bottom + window.scrollY, window.innerHeight,
        );
      } catch (error) {
        console.error('SMD_INTRO_RESIZE_GEOMETRY_FAILED', error);
        release('viewport-changed', true, false);
        return;
      }
    }
    release('viewport-changed', true, true);
  }

  function onVisibilityChange(): void {
    if (document.visibilityState !== 'hidden') return;
    switch (phase.value) {
      case 'revealing':
      case 'settling':
        release('page-hidden', true, true);
        break;
      default:
        break;
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (!['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(event.key)) return;
    if (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable]')) return;
    switch (phase.value) {
      case 'revealing':
      case 'settling':
        // Explicit keyboard navigation completes the intro and then remains native.
        release('keyboard-scroll', true, true);
        break;
      default:
        break;
    }
  }

  onMounted(() => {
    mounted = true;
    media = window.matchMedia(HOME_INTRO_DESKTOP_MEDIA);
    const reason = validDesktop()
      ?? (window.scrollY > 2 ? 'RESTORED_SCROLL_POSITION' : null);
    if (reason) {
      admissionReason.value = reason;
      phase.value = 'disabled';
      return;
    }
    admitted.value = true;
    admissionReason.value = 'ADMITTED';
    phase.value = 'idle';
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    wheelInstalled = true;
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onIdleScroll);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('keydown', onKeyDown, true);
    media.addEventListener('change', onEnvironmentChange);
  });

  onBeforeUnmount(() => {
    mounted = false;
    if (phase.value === 'revealing' || phase.value === 'settling') {
      release('unmounted', false, false);
    }
    if (rafId !== null) window.cancelAnimationFrame(rafId);
    removeWheel();
    restoreScrollBehavior();
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', onIdleScroll);
    window.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    media?.removeEventListener('change', onEnvironmentChange);
    media = null;
  });

  return { phase, admitted, admissionReason, releaseReason, ignoredWheelEvents, animationStarts };
}

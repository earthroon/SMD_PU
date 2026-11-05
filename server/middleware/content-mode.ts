/** Disconnected APIs remain present for future CMS binding; never contact Core. */
export default defineEventHandler((event) => {
  const mode = useRuntimeConfig(event).public.contentMode;
  if (mode !== 'standalone' && mode !== 'cms')
    throw createError({ statusCode: 503, statusMessage: 'SMD_CONTENT_MODE_INVALID' });
  if (mode === 'standalone' && getRequestURL(event).pathname.startsWith('/api/'))
    throw createError({ statusCode: 503, statusMessage: 'SMD_CMS_DISCONNECTED' });
});

import { coreRequest, sameOrigin } from '../utils/public-core';
export default defineEventHandler(async (event) => {
  sameOrigin(event);
  return await coreRequest(event,'/v1/inquiries','POST',await readBody(event));
});

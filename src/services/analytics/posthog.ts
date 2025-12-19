import { getPosthogApiKey, getPosthogHost } from '../../utils/getEnv';

export const posthogApiKey = getPosthogApiKey();
export const posthogHost = getPosthogHost();
export const isPosthogEnabled = Boolean(posthogApiKey);



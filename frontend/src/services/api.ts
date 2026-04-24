// Compatibility wrapper. Some screens import `api` from `src/services/api`
// while the canonical client lives at `src/api/client`. Re-export both shapes
// so existing imports keep working.
import apiClient, { setAuthToken } from '../api/client';

export const api = apiClient;
export { apiClient, setAuthToken };
export default apiClient;

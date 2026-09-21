import { getApiUrl } from '../../config';
import { getStoredToken } from '../storage'; // Fix import path

/**
 * Check if the admin API is accessible and returning valid responses
 */
export async function checkAdminApiHealth(): Promise<{
  isAccessible: boolean;
  hasAuth: boolean;
  error?: string;
}> {
  try {
    const token = await getStoredToken();

    if (!token) {
      return {
        isAccessible: false,
        hasAuth: false,
        error: 'No authentication token found',
      };
    }

    console.log('[API Debug] Testing API connection...');
    console.log('[API Debug] Has token:', !!token);

    // Try a simple endpoint
    const url = getApiUrl('/admin/GET/existing-admins');
    console.log('[API Debug] Testing URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('[API Debug] Response status:', response.status);
    console.log(
      '[API Debug] Content-Type:',
      response.headers.get('content-type'),
    );

    if (response.status === 401 || response.status === 403) {
      return {
        isAccessible: true,
        hasAuth: false,
        error: 'Authentication failed. Token may be invalid or expired.',
      };
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      console.error('[API Debug] Non-JSON response:', text.substring(0, 500));
      return {
        isAccessible: false,
        hasAuth: true,
        error: `API returned HTML instead of JSON. This usually means the endpoint doesn't exist or there's a server error.`,
      };
    }

    return {
      isAccessible: true,
      hasAuth: true,
    };
  } catch (error) {
    console.error('[API Debug] Error:', error);
    return {
      isAccessible: false,
      hasAuth: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

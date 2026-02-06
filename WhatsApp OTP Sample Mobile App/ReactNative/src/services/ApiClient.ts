import {Platform} from 'react-native';

const API_BASE_URL = __DEV__
  ? Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://127.0.0.1:3000'
  : 'http://localhost:3000';

export interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function get(endpoint: string): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json().catch(() => null);
      return {success: true, data};
    }

    return {
      success: false,
      error: `Request failed with status ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function post(
  endpoint: string,
  payload: object,
): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json().catch(() => null);
      return {success: true, data};
    }

    let errorMessage = `Request failed with status ${response.status}`;
    if (response.status === 400) {
      errorMessage = 'No code provided';
    } else if (response.status === 401) {
      errorMessage = 'Invalid or expired code';
    } else if (response.status === 404) {
      errorMessage = 'No active code for this phone number';
    }

    return {success: false, error: errorMessage};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

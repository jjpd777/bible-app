import { API_BASE_URL } from '../constants/ApiConfig';
import { UserProfile } from '../types/profile';

export class ProfileService {
  static async createUserProfile(firebaseUid: string, email: string, username?: string): Promise<UserProfile | null> {
    try {
      console.log('=== ProfileService.createUserProfile START ===');
      console.log('Input parameters:');
      console.log('  - firebaseUid:', firebaseUid);
      console.log('  - email:', email);
      console.log('  - username:', username);
      console.log('  - API_BASE_URL:', API_BASE_URL);
      
      if (!firebaseUid || !email) {
        console.error('❌ Missing required parameters');
        throw new Error('Firebase UID and email are required');
      }
      
      const body: any = {
        firebase_uid: firebaseUid,
        email: email,
      };
      
      // Only include username if provided, otherwise let backend handle it
      if (username) {
        body.username = username;
      }
      
      const url = `${API_BASE_URL}/users/register`;
      console.log('🚀 Making POST request to:', url);
      console.log('📦 Request body:', JSON.stringify(body, null, 2));
      
      console.log('⏳ Sending fetch request...');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log('📡 Response received!');
      console.log('  - Status:', response.status);
      console.log('  - Status Text:', response.statusText);
      console.log('  - Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        console.error('❌ Response not OK');
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseText = await response.text();
      console.log('📄 Raw response text:', responseText);
      
      if (!responseText) {
        console.error('❌ Empty response body');
        throw new Error('Empty response from server');
      }

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('✅ Parsed response data:', data);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError);
        console.error('Raw response was:', responseText);
        throw new Error('Invalid JSON response from server');
      }
      
      console.log('✅ ProfileService.createUserProfile SUCCESS');
      return data;
      
    } catch (error) {
      console.error('=== ProfileService.createUserProfile ERROR ===');
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Re-throw the error so the calling function can handle it
      throw error;
    }
  }

  static async fetchUserProfile(firebaseUid: string): Promise<UserProfile | null> {
    try {
      console.log('=== ProfileService.fetchUserProfile DEBUG ===');
      console.log('Firebase UID:', firebaseUid);
      console.log('API_BASE_URL:', API_BASE_URL);
      
      const url = `${API_BASE_URL}/users/${firebaseUid}`;
      console.log('Full URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });
      
      console.log('Response status:', response.status);
      
      if (response.status === 404) {
        console.log('User not found in backend database');
        return null;
      }
      
      if (!response.ok) {
        console.error('Response not ok:', {
          status: response.status,
          statusText: response.statusText
        });
        return null;
      }
      
      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      
      if (!responseText) {
        console.log('Empty response body');
        return null;
      }
      
      // Check if response looks like HTML (error page)
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        console.error('Received HTML instead of JSON - likely an error page');
        return null;
      }
      
      const data = JSON.parse(responseText);
      console.log('Parsed response data:', data);
      return data;
    } catch (error) {
      console.error('=== ProfileService.fetchUserProfile ERROR ===');
      console.error('Error details:', error);
      return null;
    }
  }

  static async updateBiography(userId: string, biography: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ biography: biography.trim() })
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating biography:', error);
      return false;
    }
  }

  static async updateUsername(userId: string, username: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/username`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true };
      } else if (response.status === 422) {
        return { success: false, error: 'Username was just taken by someone else' };
      } else {
        return { success: false, error: data.error || 'Failed to update username' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update username' };
    }
  }

  static async checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/username/${username.trim()}/available`);
      return await response.json();
    } catch (error) {
      return { available: false };
    }
  }
} 
import { API_BASE_URL } from '../constants/ApiConfig';
import { UserProfile } from '../types/profile';

export class ProfileService {
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
      console.log('Response ok:', response.ok);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        console.error('Response not ok:', {
          status: response.status,
          statusText: response.statusText
        });
        
        // Try to get error details
        try {
          const errorText = await response.text();
          console.error('Error response body:', errorText);
        } catch (e) {
          console.error('Could not read error response body');
        }
        
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
        console.error('HTML content:', responseText.substring(0, 200) + '...');
        return null;
      }
      
      const data = JSON.parse(responseText);
      console.log('Parsed response data:', data);
      console.log('Data type:', typeof data);
      console.log('Data keys:', Object.keys(data || {}));
      
      return data;
    } catch (error) {
      console.error('=== ProfileService.fetchUserProfile ERROR ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
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
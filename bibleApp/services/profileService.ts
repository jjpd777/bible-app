import { API_BASE_URL } from '../constants/ApiConfig';
import { UserProfile } from '../types/profile';

export class ProfileService {
  static async fetchUserProfile(firebaseUid: string): Promise<UserProfile | null> {
    try {
      console.log('Fetching profile for Firebase UID:', firebaseUid);
      const response = await fetch(`${API_BASE_URL}/users/${firebaseUid}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Profile API response:', data);
        
        if (data.user) {
          return data.user;
        }
      } else if (response.status === 404) {
        console.log('User not found in backend, will be created on first profile update');
        return null;
      } else {
        console.error('Failed to fetch user profile:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
    
    return null;
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
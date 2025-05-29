export type AuthTab = 'signin' | 'signup';

export interface UsernameAvailability {
  isValid: boolean;
  isAvailable: boolean | null;
  message: string;
}

export interface UserProfile {
  id?: string;
  username?: string;
  biography?: string;
  avatar_url?: string;
  is_admin?: boolean;
} 
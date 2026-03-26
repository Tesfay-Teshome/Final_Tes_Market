import { User } from '@/types/user';

export const getFullName = (user: User | null): string => {
  if (!user) return '';
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown User';
};

export const getUserInitials = (user: User | null): string => {
  if (!user) return '';
  const fullName = getFullName(user);
  const names = fullName.split(' ');
  return names.map(name => name.charAt(0).toUpperCase()).join('');
};

export const getAvatarUrl = (user: User | null): string => {
  if (!user) return '';
  return user.profile_image || '';
};

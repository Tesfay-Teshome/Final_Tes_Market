import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { User } from '@/types/user';

export const useUser = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  return { user };
};

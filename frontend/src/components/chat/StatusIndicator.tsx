import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  isOnline?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ isOnline }) => {
  return (
    <span className="flex items-center gap-1">
      <span
        className={
          isOnline
            ? 'inline-block h-2 w-2 rounded-full bg-green-500'
            : 'inline-block h-2 w-2 rounded-full bg-gray-400'
        }
        title={isOnline ? 'online' : 'offline'}
      />
      <span className={isOnline ? 'text-green-500 text-xs' : 'text-gray-500 text-xs'}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </span>
  );
};

export default StatusIndicator;

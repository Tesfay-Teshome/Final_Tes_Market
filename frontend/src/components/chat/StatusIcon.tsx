import React from 'react';
import { FiClock, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import { Check, Clock, X, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type Status = 'sending' | 'sent' | 'delivered' | 'read' | 'error' | 'failed';

interface StatusIconProps {
  status?: Status;
  size?: number;
  className?: string;
  showTooltip?: boolean;
  timestamp?: string | Date;
}

const statusLabels: Record<Status, string> = {
  sending: 'Sending...',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  error: 'Failed to send',
  failed: 'Failed to send',
};

export default function StatusIcon({ 
  status = 'sent', 
  size = 14, 
  className, 
  showTooltip = true,
  timestamp 
}: StatusIconProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <Clock size={size} className={cn('text-white/60 animate-pulse', className)} />;
      case 'sent':
        return <Check size={size} className={cn('text-white/70', className)} />;
      case 'delivered':
        return (
          <div className="relative" style={{ width: size, height: size }}>
            <CheckCheck size={size} className={cn('text-emerald-200', className)} />
          </div>
        );
      case 'read':
        return (
          <div className="relative" style={{ width: size, height: size }}>
            <CheckCheck size={size} className={cn('text-white', className)} />
          </div>
        );
      case 'error':
      case 'failed':
        return <X size={size} className={cn('text-red-300', className)} />;
      default:
        return <Check size={size} className={cn('text-white/70', className)} />;
    }
  };

  const getStatusText = () => {
    let text = statusLabels[status] || 'Sent';
    
    if (timestamp) {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        text += ` at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
    }
    
    return text;
  };

  const icon = getStatusIcon();
  
  if (!showTooltip) {
    return icon;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            {icon}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {getStatusText()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

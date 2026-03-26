import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
}

const variantStyles = {
  default: "bg-white border-gray-200",
  primary: "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200",
  success: "bg-gradient-to-br from-green-50 to-green-100 border-green-200",
  warning: "bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200",
  danger: "bg-gradient-to-br from-red-50 to-red-100 border-red-200"
}

const iconStyles = {
  default: "text-gray-600",
  primary: "text-blue-600",
  success: "text-green-600", 
  warning: "text-yellow-600",
  danger: "text-red-600"
}

const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  ({ 
    className, 
    title, 
    value, 
    description, 
    icon: Icon, 
    trend, 
    variant = 'default',
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border p-6 shadow-sm transition-all duration-200 hover:shadow-md",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {trend && (
                <span className={cn(
                  "text-xs font-medium px-2 py-1 rounded-full",
                  trend.isPositive 
                    ? "bg-green-100 text-green-700" 
                    : "bg-red-100 text-red-700"
                )}>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
          </div>
          {Icon && (
            <div className={cn(
              "p-3 rounded-lg bg-white/50",
              iconStyles[variant]
            )}>
              <Icon className="h-6 w-6" />
            </div>
          )}
        </div>
      </div>
    )
  }
)
StatsCard.displayName = "StatsCard"

export { StatsCard }

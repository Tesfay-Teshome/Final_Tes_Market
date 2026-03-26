import * as React from "react"
import { cn } from "@/lib/utils"

interface GradientCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  children: React.ReactNode
}

const gradientVariants = {
  primary: "bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200",
  secondary: "bg-gradient-to-br from-gray-50 to-slate-100 border-gray-200", 
  success: "bg-gradient-to-br from-green-50 to-emerald-100 border-green-200",
  warning: "bg-gradient-to-br from-yellow-50 to-orange-100 border-yellow-200",
  danger: "bg-gradient-to-br from-red-50 to-rose-100 border-red-200"
}

const GradientCard = React.forwardRef<HTMLDivElement, GradientCardProps>(
  ({ className, variant = 'secondary', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md",
          gradientVariants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
GradientCard.displayName = "GradientCard"

export { GradientCard }

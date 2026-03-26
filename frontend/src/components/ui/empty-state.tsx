import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary'
  }
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: {
    container: "py-8",
    icon: "h-8 w-8",
    title: "text-lg",
    description: "text-sm"
  },
  md: {
    container: "py-12",
    icon: "h-12 w-12", 
    title: "text-xl",
    description: "text-base"
  },
  lg: {
    container: "py-16",
    icon: "h-16 w-16",
    title: "text-2xl", 
    description: "text-lg"
  }
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ 
    className, 
    icon: Icon, 
    title, 
    description, 
    action, 
    size = 'md',
    ...props 
  }, ref) => {
    const styles = sizeStyles[size]
    
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center text-center",
          styles.container,
          className
        )}
        {...props}
      >
        {Icon && (
          <div className="mb-4 p-3 bg-gray-100 rounded-full">
            <Icon className={cn(styles.icon, "text-gray-400")} />
          </div>
        )}
        
        <h3 className={cn("font-semibold text-gray-900 mb-2", styles.title)}>
          {title}
        </h3>
        
        {description && (
          <p className={cn("text-gray-500 mb-6 max-w-md", styles.description)}>
            {description}
          </p>
        )}
        
        {action && (
          <Button
            variant={action.variant || 'default'}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
    )
  }
)
EmptyState.displayName = "EmptyState"

export { EmptyState }

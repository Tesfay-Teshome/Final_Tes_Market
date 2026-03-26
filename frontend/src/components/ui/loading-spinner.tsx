import * as React from "react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'primary' | 'secondary' | 'white'
  text?: string
}

const sizeStyles = {
  sm: "h-4 w-4",
  md: "h-6 w-6", 
  lg: "h-8 w-8",
  xl: "h-12 w-12"
}

const variantStyles = {
  primary: "border-primary border-t-transparent",
  secondary: "border-gray-300 border-t-transparent",
  white: "border-white border-t-transparent"
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size = 'md', variant = 'primary', text, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center justify-center gap-3", className)}
        {...props}
      >
        <div
          className={cn(
            "animate-spin rounded-full border-2",
            sizeStyles[size],
            variantStyles[variant]
          )}
        />
        {text && (
          <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
        )}
      </div>
    )
  }
)
LoadingSpinner.displayName = "LoadingSpinner"

interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  isVisible: boolean
  text?: string
}

const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ className, isVisible, text = "Loading...", ...props }, ref) => {
    if (!isVisible) return null

    return (
      <div
        ref={ref}
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm",
          className
        )}
        {...props}
      >
        <div className="bg-white rounded-lg p-6 shadow-xl">
          <LoadingSpinner size="lg" text={text} />
        </div>
      </div>
    )
  }
)
LoadingOverlay.displayName = "LoadingOverlay"

export { LoadingSpinner, LoadingOverlay }

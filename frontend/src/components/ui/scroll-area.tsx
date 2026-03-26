import * as React from "react"

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  children: React.ReactNode
}

export function ScrollArea({ className, children, ...props }: ScrollAreaProps) {
  return (
    <div 
      className={`overflow-auto ${className || ''}`} 
      style={{ scrollBehavior: 'smooth' }}
      {...props}
    >
      {children}
    </div>
  )
}

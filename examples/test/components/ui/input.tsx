import * as React from 'react'

import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, invalid = false, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-primary/85 focus-visible:outline-none focus-visible:ring-2 ring-offset-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
        {
          'border-red-400 ring-2 ring-red-300 focus-visible:border-red-400 focus-visible:ring-red-300': invalid,
        },
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }

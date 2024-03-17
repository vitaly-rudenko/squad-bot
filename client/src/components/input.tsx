import * as React from "react"

import { cn } from "@/utils/cn"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
    focusOnEnd?: boolean
  }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, focusOnEnd, ...props }, ref) => {
    return (
      <input
        onKeyDown={(event) => {
          if (event.code === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
            return false
          }
        }}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        onFocus={focusOnEnd ? (event) => {
          setTimeout(() => {
            event.target.setSelectionRange(
              event.target.value.length,
              event.target.value.length,
            )
          }, 0)
        } : undefined}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

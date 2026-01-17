// src/renderer/src/components/ResponseViewer.tsx
import { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

interface ResponseViewerProps extends ComponentProps<'textarea'> {
  value: string
}

export function ResponseViewer({ value, className, ...props }: ResponseViewerProps) {
  return (
    <textarea
      readOnly
      value={value}
      className={twMerge(
        // kluczowe: h-full + min-h-0
        'h-full min-h-0 w-full bg-slate-950 border border-slate-800 rounded p-3 font-mono text-xs resize-none overflow-auto',
        className
      )}
      {...props}
    />
  )
}

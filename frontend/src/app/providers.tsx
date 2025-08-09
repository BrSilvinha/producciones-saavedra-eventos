'use client'

import { ReactNode } from 'react'

// ✅ SIMPLIFICADO - Sin React Query para evitar errores
export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
    </>
  )
}
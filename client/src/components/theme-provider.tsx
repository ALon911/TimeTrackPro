import { ThemeProvider as ThemeProviderInternal } from "@/hooks/use-theme"

export function ThemeProvider({ 
  children,
}: { 
  children: React.ReactNode
}) {
  return (
    <ThemeProviderInternal defaultTheme="dark">
      {children}
    </ThemeProviderInternal>
  )
}
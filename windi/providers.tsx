'use client';

import { ThemeProvider } from 'next-themes';
import { LanguageProvider } from './language-mode';
import { AuthProvider } from './auth-context';
import { ToolboxProvider } from './toolbox-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
      <LanguageProvider>
        <AuthProvider>
          <ToolboxProvider>{children}</ToolboxProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

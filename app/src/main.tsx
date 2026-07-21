import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import '@/i18n'
import { TRPCProvider } from "@/providers/trpc"
import App from './App.tsx'
import AppErrorBoundary from "@/components/AppErrorBoundary"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <TRPCProvider>
          <App />
        </TRPCProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>,
)

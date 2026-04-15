import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AuthProvider from './providers/AuthProvider.tsx'
import { SocketProvider } from './contexts/SocketContext.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={publishableKey ?? ''}>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SocketProvider>
              <App />
            </SocketProvider>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)
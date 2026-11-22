import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { PrivacyProvider } from './context/PrivacyContext.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { DialogHost } from './components/DialogHost.jsx'
import { ToastHost } from './components/ToastHost.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <PrivacyProvider>
          <App />
          <DialogHost />
          <ToastHost />
        </PrivacyProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)

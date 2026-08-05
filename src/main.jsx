import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import VistaPublicaJugador from './components/VistaPublicaJugador.jsx'
import { StoreProvider } from './store'

// Página pública de reserva, sin nav/sidebar del panel de administración.
const isPublicBookingPage = window.location.pathname.startsWith('/reserva')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreProvider>
      {isPublicBookingPage ? <VistaPublicaJugador /> : <App />}
    </StoreProvider>
  </StrictMode>,
)

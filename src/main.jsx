import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import VistaPublicaJugador from './components/VistaPublicaJugador.jsx'
import RecuperarPassword from './components/RecuperarPassword.jsx'
import AuthProvider from './auth/AuthProvider.jsx'
import { ThemeProvider } from './theme/ThemeProvider.jsx'

// Ruteo por pathname, sin router: son tres pantallas y ninguna navega a la otra
// desde adentro de React.
//
//   /reserva/<slug>  página pública de reserva. No tiene sesión ni store: habla
//                    con la Edge Function `public-reserva`. Que el navegador de
//                    un desconocido NO tenga acceso a la base es el punto.
//   /recuperar       destino del mail de recuperación de contraseña.
//   /                el panel, detrás de Supabase Auth.
const path = window.location.pathname

const slugPublico = path.startsWith('/reserva')
  ? decodeURIComponent(path.replace(/^\/reserva\/?/, '').split('/')[0])
  : null

function Raiz() {
  // El tema es transversal a las tres pantallas — incluida la reserva pública,
  // que ve un desconocido sin sesión — así que envuelve todo, no solo el panel.
  return (
    <ThemeProvider>
      {path.startsWith('/reserva') ? (
        <VistaPublicaJugador slug={slugPublico} />
      ) : path.startsWith('/recuperar') ? (
        <RecuperarPassword />
      ) : (
        <AuthProvider>
          <App />
        </AuthProvider>
      )}
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Raiz />
  </StrictMode>,
)

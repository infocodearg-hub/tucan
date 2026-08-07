/**
 * ThemeProvider.jsx — claro (celeste Set&gol) u oscuro (el "Deep Pitch" de
 * siempre), guardado como preferencia de interfaz, no como dato de cuenta.
 *
 * Todo el trabajo real de pintar cada tema vive en `src/index.css`
 * (`@theme` para claro, `:root[data-theme="dark"]` para oscuro). Este
 * archivo solo decide CUÁL de los dos está activo y lo refleja en el
 * atributo `data-theme` de `<html>`, que es lo que la hoja de estilos mira.
 *
 * `index.html` ya aplica el tema guardado ANTES de este componente (un
 * script mínimo, sin React, para no flashear el tema por defecto al cargar)
 * — acá se retoma esa misma clave de localStorage para que las dos partes
 * nunca queden desincronizadas.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

/**
 * Mismo prefijo `tucan:ui:` que usa `Sidebar.jsx` para "colapsada": es
 * preferencia de interfaz, sobrevive al logout a propósito —
 * `purgarCacheLocal()` solo borra `tucan:cache:*` y `tucan:state:*`.
 */
const CLAVE = 'tucan:ui:theme';

function leerPreferencia() {
  try {
    return localStorage.getItem(CLAVE) === 'dark' ? 'dark' : 'light';
  } catch {
    // Safari en modo privado tira al tocar localStorage. Sin persistencia
    // el tema sigue funcionando en esta sesión, solo no se recuerda.
    return 'light';
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(leerPreferencia);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(CLAVE, theme);
    } catch {
      /* sin persistencia, pero el tema sigue andando en esta sesión */
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() se usa adentro de <ThemeProvider>.');
  return ctx;
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque/standard.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource/rubik-doodle-shadow'
import '@fontsource/ms-madi'
import { App } from './App'
import './styles.css'
import './motion.css'
import './zine.css'
import './home.css'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)

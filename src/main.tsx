import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { colors } from './config'
import { runOverflowAudit, outlineOverflowFindings } from './dev/overflowAudit'
import './App.css'

// Mirror the colour tokens onto :root as CSS custom properties, so
// TypeScript (config.ts, driven by runtime/build env vars) and CSS share one
// source instead of two hand-kept copies. Note this only covers colours -
// SVG presentation attributes can't read var(), so the chart bars and stat
// tiles select a colour via a `.band--<name>` class instead (see config.ts).
const root = document.documentElement.style
root.setProperty('--c-bg', colors.background)
root.setProperty('--c-text', colors.text)
root.setProperty('--c-green', colors.green)
root.setProperty('--c-blue', colors.blue)
root.setProperty('--c-yellow', colors.yellow)
root.setProperty('--c-red', colors.red)
root.setProperty('--c-orange', colors.orange)
root.setProperty('--c-gridline', colors.gridline)
root.setProperty('--c-zero-line', colors.zeroLine)
root.setProperty('--c-tomorrow-bg', colors.tomorrowBg)
root.setProperty('--c-tomorrow-label', colors.tomorrowLabel)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// The zero-scroll proof: ?audit=1 walks the DOM after layout settles and
// exposes the result on window.__overflowAudit for the Playwright viewport
// matrix (e2e/layout.spec.ts) to assert against - and outlines anything it
// finds in magenta for a manual look. Left ungated by DEV deliberately: it
// only reads layout, and re-running it against the built/nginx-served app
// is part of the verification plan.
if (new URLSearchParams(window.location.search).has('audit')) {
  window.setTimeout(() => {
    const findings = runOverflowAudit()
    window.__overflowAudit = findings
    outlineOverflowFindings(findings)
    if (findings.length > 0) {
      console.warn('Overflow audit found issues:', findings)
    }
  }, 300)
}

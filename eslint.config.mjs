// ESLint checks the code for likely bugs and React/Next.js mistakes.
// Run it with: npm run lint
// The rule set comes from Next.js ("core-web-vitals" adds performance checks).
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

export default defineConfig([
  ...nextVitals,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'node_modules/**']),
])

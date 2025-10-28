// Debug logging utility
// Only logs if --debug flag is passed or DEBUG environment variable is set

const isDebugEnabled = process.argv.includes('--debug') || process.env.DEBUG === 'true'

export const debug = {
  log: (...args: unknown[]) => {
    if (isDebugEnabled) {
      console.log(...args)
    }
  },
  warn: (...args: unknown[]) => {
    if (isDebugEnabled) {
      console.warn(...args)
    }
  },
  error: (...args: unknown[]) => {
    // Always show errors
    console.error(...args)
  }
}

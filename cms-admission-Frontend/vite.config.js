import os from 'node:os'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

function getLanAddress() {
  const addresses = Object.values(os.networkInterfaces())
    .flatMap((interfaces) => interfaces || [])
    .filter((address) => !address.internal && (address.family === 'IPv4' || address.family === 4))
    .map((address) => address.address)

  return addresses.find((address) => (
    /^10\./.test(address)
    || /^192\.168\./.test(address)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(address)
  )) || addresses[0] || 'localhost'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_ADMISSION_DEV_HOST': JSON.stringify(getLanAddress()),
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
})

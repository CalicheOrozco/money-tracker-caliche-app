import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'], // Asegúrate de incluir los recursos necesarios
      manifest: {
        name: 'Money Tracker by Caliche Orozco',
        short_name: 'Money Tracker',
        description:
          'Money Tracker by Caliche Orozco is a practical application for tracking your personal finances. It offers a simple and effective way to manage your income and expenses, helping you maintain control of your economy and easily achieve your financial goals.',
        theme_color: '#4ade80',
        icons: [
          {
            src: '/public/icon512x512.png', // Asegúrate de que la ruta al ícono es correcta
            sizes: '512x512',
            type: 'image/png'
          }
          // Puedes incluir varios tamaños de iconos aquí
        ]
      }
    })
  ]
})

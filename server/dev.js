import app from './app.js'

// macOS reserves port 5000 for AirPlay, so local development defaults to 5001.
// vite.config.js proxies /api to this same port.
const port = process.env.API_PORT || 5001

app.listen(port, () => console.log(`API running on http://localhost:${port}`))

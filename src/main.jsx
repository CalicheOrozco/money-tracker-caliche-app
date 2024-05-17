import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Login from './Routes/Login.jsx'
import Signup from './Routes/Signup.jsx'
import Guest from './Routes/Guest.jsx'
import ProtectedRoute from './Routes/ProtectedRoute.jsx'
import UserCharts from './Routes/UserCharts.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'
import GuestCharts from './Routes/GuestCharts.jsx'
import Files from './Routes/Files.jsx'
import BBVA from './Routes/BBVA.jsx'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/signup',
    element: <Signup />
  },
  {
    path: '/guest',
    element: <Guest />
  },
  {
    path: '/guest-charts',
    element: <GuestCharts />
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <App />
      },
      {
        path: '/charts',
        element: <UserCharts />
      },
      {
        path: '/files',
        element: <Files />
      },
      {
        path: '/BBVA',
        element: <BBVA />
      }
    ]
  }
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
)

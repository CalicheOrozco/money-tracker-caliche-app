import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { Navigate, Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider.jsx'
import AppLayout from './components/AppLayout.jsx'
import ErrorScreen from './components/ErrorScreen.jsx'
import { Spinner } from './components/ui.jsx'
import './index.css'
import { loadLogoConfig } from './lib/brandfetch.js'
import { registerServiceWorker } from './lib/push.js'
import Auth from './screens/Auth.jsx'
import Dashboard from './screens/Dashboard.jsx'

const Budgets = lazy(() => import('./screens/Budgets.jsx'))
const Calendar = lazy(() => import('./screens/Calendar.jsx'))
const Cards = lazy(() => import('./screens/Cards.jsx'))
const Charts = lazy(() => import('./screens/Charts.jsx'))
const Debts = lazy(() => import('./screens/Debts.jsx'))
const Goals = lazy(() => import('./screens/Goals.jsx'))
const Insights = lazy(() => import('./screens/Insights.jsx'))
const Merchants = lazy(() => import('./screens/Merchants.jsx'))
const NetWorth = lazy(() => import('./screens/NetWorth.jsx'))
const Profile = lazy(() => import('./screens/Profile.jsx'))
const Recurring = lazy(() => import('./screens/Recurring.jsx'))
const Transfers = lazy(() => import('./screens/Transfers.jsx'))
const Reports = lazy(() => import('./screens/Reports.jsx'))
const Rules = lazy(() => import('./screens/Rules.jsx'))

function Gate () {
  const { ready } = useAuth()
  return ready ? <Outlet /> : <Spinner />
}

function RequireUser () {
  const { user } = useAuth()
  return user ? <AppLayout /> : <Navigate to='/login' replace />
}

const lazyScreen = element => <Suspense fallback={<Spinner />}>{element}</Suspense>

const router = createBrowserRouter([
  {
    errorElement: <ErrorScreen />,
    element: <Gate />,
    children: [
      { path: '/login', element: <Auth mode='login' /> },
      { path: '/signup', element: <Auth mode='signup' /> },
      {
        path: '/guest',
        element: <AppLayout guest />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'insights', element: lazyScreen(<Insights />) },
          { path: 'calendar', element: lazyScreen(<Calendar />) },
          { path: 'charts', element: lazyScreen(<Charts />) },
          { path: 'reports', element: lazyScreen(<Reports />) }
        ]
      },
      { path: '/guest-charts', element: <Navigate to='/guest/charts' replace /> },
      {
        path: '/',
        element: <RequireUser />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'insights', element: lazyScreen(<Insights />) },
          { path: 'calendar', element: lazyScreen(<Calendar />) },
          { path: 'charts', element: lazyScreen(<Charts />) },
          { path: 'reports', element: lazyScreen(<Reports />) },
          { path: 'cards', element: lazyScreen(<Cards />) },
          { path: 'recurring', element: lazyScreen(<Recurring />) },
          { path: 'transfers', element: lazyScreen(<Transfers />) },
          { path: 'budgets', element: lazyScreen(<Budgets />) },
          { path: 'goals', element: lazyScreen(<Goals />) },
          { path: 'debts', element: lazyScreen(<Debts />) },
          { path: 'net-worth', element: lazyScreen(<NetWorth />) },
          { path: 'rules', element: lazyScreen(<Rules />) },
          { path: 'merchants', element: lazyScreen(<Merchants />) },
          { path: 'profile', element: lazyScreen(<Profile />) },
          { path: 'files', element: <Navigate to='/' replace /> }
        ]
      },
      { path: '*', element: <Navigate to='/' replace /> }
    ]
  }
])

registerServiceWorker()

loadLogoConfig()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
)

import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Stats from './pages/Stats'
import AppDetail from './pages/AppDetail'
import Limits from './pages/Limits'
import Categories from './pages/Categories'
import Settings from './pages/Settings'
import { useEffect } from 'react'
import { useAppStore } from './store/useAppStore'

function App() {
  const refreshAll = useAppStore(s => s.refreshAll)

  useEffect(() => {
    refreshAll()

    const interval = setInterval(() => {
      useAppStore.getState().fetchTodayStats()
      useAppStore.getState().fetchCurrentActivity()
    }, 60000)

    return () => clearInterval(interval)
  }, [refreshAll])

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/apps/:id" element={<AppDetail />} />
          <Route path="/limits" element={<Limits />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App

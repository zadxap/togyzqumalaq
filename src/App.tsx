import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import { LogoMark } from './components/Icons'
import { AuthScreen } from './screens/AuthScreen'
import { LobbyScreen } from './screens/Lobby'
import { MatchAIScreen } from './screens/MatchAI'
import { HotseatScreen } from './screens/Hotseat'
import { MatchOnlineScreen } from './screens/MatchOnline'
import { ProfileScreen } from './screens/Profile'
import { HistoryScreen } from './screens/History'

function Splash() {
  return (
    <div className="splash">
      <div className="splash-mark">
        <LogoMark size={72} />
      </div>
    </div>
  )
}

export default function App() {
  const { userId, loading } = useAuth()

  if (loading) return <Splash />

  if (!userId) {
    return (
      <Routes>
        <Route path="*" element={<AuthScreen />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<LobbyScreen />} />
      <Route path="/m/:id" element={<MatchOnlineScreen />} />
      <Route path="/ai" element={<MatchAIScreen />} />
      <Route path="/hotseat" element={<HotseatScreen />} />
      <Route path="/profile" element={<ProfileScreen />} />
      <Route path="/history" element={<HistoryScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

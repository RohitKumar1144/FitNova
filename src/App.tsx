import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import WorkoutPlanPage from './pages/WorkoutPlanPage'
import WorkoutSessionPage from './pages/WorkoutSessionPage'
import ProgressPage from './pages/ProgressPage'
import AICoachPage from './pages/AICoachPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/workout-plan" element={<WorkoutPlanPage />} />
        <Route path="/workout-session" element={<WorkoutSessionPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/ai-coach" element={<AICoachPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
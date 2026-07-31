import { Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import LiveMonitorPage from './pages/LiveMonitorPage';
import ControlPage from './pages/ControlPage';
import ResultsPage from './pages/ResultsPage';
import { useLiveMonitor } from './hooks/useLiveMonitor';

export default function App() {
  const monitor = useLiveMonitor();

  return (
    <Routes>
      <Route element={<AppShell connected={monitor.connected} />}>
        <Route index element={<LiveMonitorPage monitor={monitor} />} />
        <Route path="control" element={<ControlPage monitor={monitor} />} />
        <Route path="results" element={<ResultsPage />} />
      </Route>
    </Routes>
  );
}

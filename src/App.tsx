import { useState } from 'react';
import TabBar, { type Tab } from './components/TabBar';
import { AppProvider } from './lib/store';
import { SyncProvider } from './lib/sync';
import ExercisesScreen from './screens/ExercisesScreen';
import HistoryScreen from './screens/HistoryScreen';
import LogScreen from './screens/LogScreen';
import ProgressScreen from './screens/ProgressScreen';
import SettingsScreen from './screens/SettingsScreen';

export default function App() {
  const [tab, setTab] = useState<Tab>('log');

  return (
    <AppProvider>
      <SyncProvider>
        <div className="app">
          <main className="content">
            {tab === 'log' && <LogScreen />}
            {tab === 'history' && <HistoryScreen />}
            {tab === 'progress' && <ProgressScreen />}
            {tab === 'exercises' && <ExercisesScreen onGoToLog={() => setTab('log')} />}
            {tab === 'settings' && <SettingsScreen />}
            <div className="version-tag">v{__APP_VERSION__}</div>
          </main>
          <TabBar active={tab} onChange={setTab} />
        </div>
      </SyncProvider>
    </AppProvider>
  );
}

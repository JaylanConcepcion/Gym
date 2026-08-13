import { useState } from 'react';
import TabBar, { type Tab } from './components/TabBar';
import { AppProvider } from './lib/store';
import HistoryScreen from './screens/HistoryScreen';
import LogScreen from './screens/LogScreen';
import ProgressScreen from './screens/ProgressScreen';
import SettingsScreen from './screens/SettingsScreen';

export default function App() {
  const [tab, setTab] = useState<Tab>('log');

  return (
    <AppProvider>
      <div className="app">
        <main className="content">
          {tab === 'log' && <LogScreen />}
          {tab === 'history' && <HistoryScreen />}
          {tab === 'progress' && <ProgressScreen />}
          {tab === 'settings' && <SettingsScreen />}
        </main>
        <TabBar active={tab} onChange={setTab} />
      </div>
    </AppProvider>
  );
}

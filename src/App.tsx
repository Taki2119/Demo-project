import { AboutScreen } from './screens/AboutScreen';
import { BoardScreen } from './screens/BoardScreen';
import { ChurnScreen } from './screens/ChurnScreen';
import { HomeScreen } from './screens/HomeScreen';
import { Sidebar } from './screens/Sidebar';
import { toHash, useRoute } from './nav/route';
import { ChatDock } from './ui/ask/ChatDock';

export default function App() {
  const route = useRoute();
  return (
    <div className="app">
      <Sidebar />
      <main className="main" key={toHash(route)}>
        {route.kind === 'board' ? (
          <BoardScreen plan={route.plan} board={route.board} />
        ) : route.kind === 'churn' ? (
          <ChurnScreen />
        ) : route.kind === 'about' ? (
          <AboutScreen />
        ) : (
          <HomeScreen />
        )}
      </main>
      {/* Ask AI (demo version): button in the top-right corner, on EVERY screen. Sits OUTSIDE .main (main is rebuilt per
          route) ⇒ the window + conversation persist across page changes. */}
      <ChatDock />
    </div>
  );
}

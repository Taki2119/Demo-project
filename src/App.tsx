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
      {/* Hỏi AI (bản demo): nút góc trên bên phải, có ở MỌI màn. Nằm NGOÀI .main (main dựng lại theo
          route) ⇒ cửa sổ + hội thoại giữ nguyên khi chuyển trang. */}
      <ChatDock />
    </div>
  );
}

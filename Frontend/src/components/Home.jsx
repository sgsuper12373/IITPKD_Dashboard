import { Outlet } from 'react-router-dom';
import Header from './Header';
import './Home.css';

function Home({ user, onLogout, isGuest }) {
  return (
    <div className="home-container">
      <Header user={user} onLogout={onLogout} isGuest={isGuest} />

      {/* Main Content Area - Rendered by child routes */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Home;
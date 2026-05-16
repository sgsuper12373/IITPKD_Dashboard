import { Outlet } from 'react-router-dom';
import Header from './Header';
import Breadcrumb from './Breadcrumb';
import './Home.css';

function Home({ user, onLogout, isGuest }) {
  return (
    <div className="home-container">
      <Header user={user} onLogout={onLogout} isGuest={isGuest} />

      <main className="main-content">
        <Breadcrumb />
        <Outlet />
      </main>
    </div>
  );
}

export default Home;
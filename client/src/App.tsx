import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, createContext, useContext } from 'react';
import Login from './pages/Login';
import Welcome from './pages/Welcome';
import POS from './pages/POS';
import Storage from './pages/Storage';
import Transactions from './pages/Transactions';
import Products from './pages/Products';
import Admin from './pages/Admin';
import Layout from './components/Layout';

interface User {
  id: number;
  username: string;
  role: 'cashier' | 'admin';
}

interface AuthContextType {
  user: User | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  token: string | null;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  const login = (user: User, token: string) => {
    setUser(user);
    setToken(token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, token }}>
      <BrowserRouter>
        <Routes>
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={user ? <Navigate to="/new-sale" /> : <Login />} />
          <Route path="/" element={<Navigate to="/welcome" />} />
          <Route element={user ? <Layout /> : <Navigate to="/login" />}>
            <Route path="/new-sale" element={<POS />} />
            <Route path="/transactions" element={<Transactions />} />
            {user?.role === 'admin' && (
              <>
                <Route path="/admin" element={<Admin />} />
                <Route path="/storage" element={<Storage />} />
                <Route path="/products" element={<Products />} />
              </>
            )}
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;

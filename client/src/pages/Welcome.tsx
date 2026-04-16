import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Welcome.css';

export default function Welcome() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/new-sale');
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="welcome-container">
      <h1 className="welcome-text">Welcome to Tiba.</h1>
    </div>
  );
}

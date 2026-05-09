import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Welcome.css';

export default function Welcome() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/new-sale');
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="welcome-container">
      <h1 className="welcome-text">{t('pages.welcome.text')}</h1>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';

export default function Admin() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>{t('pages.admin.title')}</h1>
        <p>{t('pages.admin.header_text')}</p>
      </div>
      <div className="admin-cards">
        <Link to="/storage" className="admin-card storage-card">
          <div className="card-icon">📦</div>
          <div className="card-content">
            <h2>{t('pages.admin.storage_title')}</h2>
            <p>{t('pages.admin.storage_desc')}</p>
          </div>
          <div className="card-arrow">→</div>
        </Link>
        <Link to="/products" className="admin-card products-card">
          <div className="card-icon">🏷️</div>
          <div className="card-content">
            <h2>{t('pages.admin.products_title')}</h2>
            <p>{t('pages.admin.products_desc')}</p>
          </div>
          <div className="card-arrow">→</div>
        </Link>
        {user?.role === 'owner' || user?.role === 'admin' ? (
          <Link to="/users" className="admin-card users-card">
            <div className="card-icon">👥</div>
            <div className="card-content">
              <h2>{t('pages.admin.users_title')}</h2>
              <p>{t('pages.admin.users_desc')}</p>
            </div>
            <div className="card-arrow">→</div>
          </Link>
        ) : null}
         <Link to="/activity" className="admin-card activity-card">
           <div className="card-icon">📋</div>
           <div className="card-content">
             <h2>{t('pages.admin.activity_title')}</h2>
             <p>{t('pages.admin.activity_desc')}</p>
           </div>
           <div className="card-arrow">→</div>
         </Link>
         <Link to="/settings" className="admin-card settings-card">
           <div className="card-icon">🌐</div>
           <div className="card-content">
             <h2>{t('pages.settings.title', 'Server Settings')}</h2>
             <p>{t('pages.settings.desc', 'Manage server connection and URL')}</p>
           </div>
           <div className="card-arrow">→</div>
         </Link>
       </div>
     </div>
   );
 }

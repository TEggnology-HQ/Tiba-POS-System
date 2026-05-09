import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useTranslation } from 'react-i18next';

interface ActivityLog {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  table_name: string;
  record_id: number | null;
  details: Record<string, any> | null;
  created_at: string;
}

interface Filters {
  user_id: string;
  username: string;
  action: string;
  date_from: string;
  date_to: string;
}

export default function ActivityLog() {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempFilters, setTempFilters] = useState<Filters>({
    user_id: '',
    username: '',
    action: '',
    date_from: '',
    date_to: ''
  });
  const [currentFilters, setCurrentFilters] = useState<Filters>({
    user_id: '',
    username: '',
    action: '',
    date_from: '',
    date_to: ''
  });

  useEffect(() => {
    loadActivities();
    loadActions();
  }, []);

  const loadActivities = async (filters?: Filters) => {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.username) params.append('username', filters.username);
      if (filters.action) params.append('action', filters.action);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
    }
    const res = await api.get(`/activity?${params.toString()}`);
    setActivities(res.data);
  };

  const loadActions = async () => {
    try {
      const res = await api.get('/activity/actions');
      setActions(res.data);
    } catch (error) {
      console.error('Failed to load action types', error);
    }
  };

  const handleFilterApply = () => {
    setCurrentFilters(tempFilters);
    loadActivities(tempFilters);
    setShowFilterModal(false);
  };

  const handleFilterClear = () => {
    const emptyFilters = { user_id: '', username: '', action: '', date_from: '', date_to: '' };
    setTempFilters(emptyFilters);
    setCurrentFilters(emptyFilters);
    loadActivities();
    setShowFilterModal(false);
  };

  const openFilterModal = () => {
    setTempFilters(currentFilters);
    setShowFilterModal(true);
  };

  const formatDetails = (details: Record<string, any> | null) => {
    if (!details) return '-';
    try {
      return JSON.stringify(details);
    } catch {
      return '-';
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t('pages.activity.title')}</h1>
        <div className="page-actions">
          <button className="btn-filter" onClick={openFilterModal}>
            {t('common.filter')}
          </button>
        </div>
      </div>

      {(currentFilters.user_id || currentFilters.username || currentFilters.action || currentFilters.date_from || currentFilters.date_to) && (
        <div className="active-filters">
          <span>{t('pages.activity.active_filters')}</span>
          {currentFilters.user_id && <span className="filter-tag">{t('pages.activity.user_id')}: {currentFilters.user_id}</span>}
          {currentFilters.username && <span className="filter-tag">{t('pages.activity.username_label')}: {currentFilters.username}</span>}
          {currentFilters.action && <span className="filter-tag">{t('pages.activity.action')}: {currentFilters.action}</span>}
          {currentFilters.date_from && <span className="filter-tag">{t('pages.activity.date_from')}: {currentFilters.date_from}</span>}
          {currentFilters.date_to && <span className="filter-tag">{t('pages.activity.date_to')}: {currentFilters.date_to}</span>}
          <button className="btn-clear-filters" onClick={handleFilterClear}>{t('pages.activity.clear_all')}</button>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('pages.activity.date_time')}</th>
              <th>{t('pages.activity.username')}</th>
              <th>{t('pages.activity.action')}</th>
              <th>{t('pages.activity.table')}</th>
              <th>{t('pages.activity.record_id')}</th>
              <th>{t('pages.activity.details')}</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => (
              <tr key={activity.id}>
                <td>{new Date(activity.created_at).toLocaleString()}</td>
                <td>{activity.username || '-'}</td>
                <td>{activity.action}</td>
                <td>{activity.table_name}</td>
                <td>{activity.record_id || '-'}</td>
                <td className="details-cell">{formatDetails(activity.details)}</td>
              </tr>
            ))}
            {activities.length === 0 && (
              <tr>
                <td colSpan={6} className="no-data">{t('pages.activity.no_data')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showFilterModal && (
        <div className="modal" onClick={() => setShowFilterModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{t('pages.activity.filter_title')}</h2>
            
            <label>{t('pages.activity.user_id')}</label>
            <input
              type="number"
              value={tempFilters.user_id}
              onChange={(e) => setTempFilters({ ...tempFilters, user_id: e.target.value })}
              placeholder={t('common.search')}
            />
            
            <label>{t('pages.activity.username_label')}</label>
            <input
              type="text"
              value={tempFilters.username}
              onChange={(e) => setTempFilters({ ...tempFilters, username: e.target.value })}
              placeholder={t('common.search')}
            />
            
            <label>{t('pages.activity.action_type')}</label>
            <select
              value={tempFilters.action}
              onChange={(e) => setTempFilters({ ...tempFilters, action: e.target.value })}
            >
              <option value="">{t('common.all', 'All Actions')}</option>
              {actions.map((action) => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
            
            <label>{t('pages.activity.date_from')}</label>
            <input
              type="date"
              value={tempFilters.date_from}
              onChange={(e) => setTempFilters({ ...tempFilters, date_from: e.target.value })}
            />
            
            <label>{t('pages.activity.date_to')}</label>
            <input
              type="date"
              value={tempFilters.date_to}
              onChange={(e) => setTempFilters({ ...tempFilters, date_to: e.target.value })}
            />
            
            <div className="modal-actions">
              <button onClick={handleFilterApply}>{t('common.apply')}</button>
              <button onClick={handleFilterClear}>{t('common.clear')}</button>
              <button onClick={() => setShowFilterModal(false)}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

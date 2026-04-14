import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import privateApi from '../utils/axios';
import toast from 'react-hot-toast';
import './Dashboard.css';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await privateApi.get('/user/sessions');
      setSessions(res.data.sessions || []);
    } catch {
      // silent
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Log out from all devices? You will need to sign in again.')) return;
    setLoggingOutAll(true);
    try {
      await privateApi.post('/auth/logout-all');
      toast.success('Logged out from all devices');
      await logout();
    } catch {
      toast.error('Failed to logout from all devices');
      setLoggingOutAll(false);
    }
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const stats = [
    { label: 'Login Count', value: user?.loginCount || 0, icon: '🔑', color: 'indigo' },
    { label: 'Active Sessions', value: sessions.length, icon: '📡', color: 'violet' },
    { label: 'Account Role', value: user?.role || 'user', icon: '🛡️', color: 'cyan' },
    { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—', icon: '📅', color: 'emerald' },
  ];

  return (
    <div className="dashboard">
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="container">
        {/* Header */}
        <div className="dash-header animate-fade-in">
          <div className="dash-welcome">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`}
              alt={user?.name}
              className="dash-avatar"
            />
            <div>
              <h1 className="dash-title">
                Hello, <span className="dash-name">{user?.name?.split(' ')[0]}</span> 👋
              </h1>
              <p className="dash-subtitle">{user?.email}</p>
            </div>
          </div>
          <div className="dash-actions">
            <Link to="/profile" className="btn btn-secondary btn-sm">
              ✏️ Edit Profile
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`stat-card stat-${stat.color}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Main content grid */}
        <div className="dash-grid">
          {/* Token info */}
          <div className="card dash-card animate-fade-in">
            <h2 className="card-title">🔐 Two-Token System</h2>
            <p className="card-desc">How your session is secured right now</p>

            <div className="token-info-list">
              <div className="token-info-item">
                <div className="token-info-header">
                  <span className="tii-badge access">Access Token</span>
                  <span className="tii-expiry">⏱ 15 minutes</span>
                </div>
                <p className="tii-desc">Stored in React memory (NOT localStorage). Injected into every API request via Authorization header. Auto-refreshed silently when expired.</p>
              </div>

              <div className="token-info-item">
                <div className="token-info-header">
                  <span className="tii-badge refresh">Refresh Token</span>
                  <span className="tii-expiry">⏱ 7 days</span>
                </div>
                <p className="tii-desc">Stored in HttpOnly cookie (JS cannot read it). Hashed with SHA-256 before storing in MongoDB. Rotated on every use to prevent replay attacks.</p>
              </div>

              <div className="token-info-item">
                <div className="token-info-header">
                  <span className="tii-badge rotation">Token Rotation</span>
                  <span className="tii-expiry">🔄 Each refresh</span>
                </div>
                <p className="tii-desc">Every /auth/refresh call invalidates old token & issues a new pair. Reuse of old refresh token clears ALL sessions (reuse detection).</p>
              </div>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="card dash-card animate-fade-in">
            <div className="sessions-header">
              <div>
                <h2 className="card-title">📡 Active Sessions</h2>
                <p className="card-desc">Devices currently logged in</p>
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleLogoutAll}
                disabled={loggingOutAll}
              >
                {loggingOutAll ? 'Logging out...' : 'Logout All'}
              </button>
            </div>

            {loadingSessions ? (
              <div className="sessions-loading">Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <p className="sessions-empty">No active sessions found</p>
            ) : (
              <div className="sessions-list">
                {sessions.map((session, i) => (
                  <div key={i} className="session-item">
                    <div className="session-icon">💻</div>
                    <div className="session-info">
                      <div className="session-device">
                        {session.deviceInfo?.includes('Mobile') ? '📱 Mobile' :
                         session.deviceInfo?.includes('Chrome') ? '🌐 Chrome' :
                         session.deviceInfo?.includes('Firefox') ? '🦊 Firefox' :
                         session.deviceInfo?.includes('Safari') ? '🧭 Safari' :
                         '💻 Browser'}
                      </div>
                      <div className="session-time">
                        Started {timeAgo(session.createdAt)}
                      </div>
                    </div>
                    {i === 0 && <span className="session-current">Current</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Last login */}
          <div className="card dash-card animate-fade-in">
            <h2 className="card-title">📊 Account Activity</h2>
            <p className="card-desc">Your recent login activity</p>

            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-dot green" />
                <div className="activity-info">
                  <div className="activity-label">Last Login</div>
                  <div className="activity-value">
                    {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Just now'}
                  </div>
                </div>
              </div>

              <div className="activity-item">
                <div className="activity-dot indigo" />
                <div className="activity-info">
                  <div className="activity-label">Total Logins</div>
                  <div className="activity-value">{user?.loginCount || 1} sessions</div>
                </div>
              </div>

              <div className="activity-item">
                <div className="activity-dot violet" />
                <div className="activity-info">
                  <div className="activity-label">Account Created</div>
                  <div className="activity-value">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    }) : '—'}
                  </div>
                </div>
              </div>

              <div className="activity-item">
                <div className="activity-dot cyan" />
                <div className="activity-info">
                  <div className="activity-label">Email Verified</div>
                  <div className="activity-value">
                    {user?.isEmailVerified ? '✅ Verified' : '⏳ Pending verification'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

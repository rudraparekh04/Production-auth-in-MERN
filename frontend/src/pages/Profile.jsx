import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import privateApi from '../utils/axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import './Profile.css';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmNew: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [pwErrors, setPwErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const handleProfileChange = (e) => {
    setProfileForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (profileErrors[e.target.name]) setProfileErrors((err) => ({ ...err, [e.target.name]: '' }));
  };

  const handlePwChange = (e) => {
    setPwForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (pwErrors[e.target.name]) setPwErrors((err) => ({ ...err, [e.target.name]: '' }));
  };

  const validateProfile = () => {
    const errs = {};
    if (!profileForm.name.trim()) errs.name = 'Name is required';
    else if (profileForm.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (profileForm.bio && profileForm.bio.length > 250) errs.bio = 'Bio cannot exceed 250 characters';
    return errs;
  };

  const validatePw = () => {
    const errs = {};
    if (!pwForm.currentPassword) errs.currentPassword = 'Current password is required';
    if (!pwForm.newPassword) errs.newPassword = 'New password is required';
    else if (pwForm.newPassword.length < 8) errs.newPassword = 'Must be at least 8 characters';
    else if (!/[A-Z]/.test(pwForm.newPassword)) errs.newPassword = 'Must contain uppercase letter';
    else if (!/[0-9]/.test(pwForm.newPassword)) errs.newPassword = 'Must contain a number';
    if (pwForm.newPassword !== pwForm.confirmNew) errs.confirmNew = 'Passwords do not match';
    return errs;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const errs = validateProfile();
    if (Object.keys(errs).length) { setProfileErrors(errs); return; }

    setProfileLoading(true);
    try {
      const res = await privateApi.put('/user/profile', {
        name: profileForm.name.trim(),
        bio: profileForm.bio,
      });
      updateUser(res.data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    const errs = validatePw();
    if (Object.keys(errs).length) { setPwErrors(errs); return; }

    setPwLoading(true);
    try {
      await privateApi.put('/user/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success('Password changed! Please log in again.');
      await logout();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="container">
        <div className="profile-layout">
          {/* Sidebar */}
          <div className="profile-sidebar animate-fade-in">
            <div className="sidebar-user">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`}
                alt={user?.name}
                className="sidebar-avatar"
              />
              <h2 className="sidebar-name">{user?.name}</h2>
              <p className="sidebar-email">{user?.email}</p>
              <span className={`badge ${user?.role === 'admin' ? 'badge-indigo' : 'badge-emerald'}`}>
                {user?.role}
              </span>
            </div>

            <nav className="sidebar-nav">
              <button
                className={`sidebar-tab ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                👤 Edit Profile
              </button>
              <button
                className={`sidebar-tab ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                🔒 Security
              </button>
            </nav>

            <div className="sidebar-meta">
              <div className="meta-item">
                <span className="meta-label">Member since</span>
                <span className="meta-value">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    : '—'}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Total logins</span>
                <span className="meta-value">{user?.loginCount || 0}</span>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="profile-main animate-fade-in">
            {activeTab === 'profile' && (
              <div className="card profile-card">
                <h2 className="card-section-title">Edit Profile</h2>
                <p className="card-section-desc">Update your display name and bio</p>

                <form onSubmit={handleProfileSubmit} className="profile-form" noValidate>
                  <div className="form-group">
                    <label className="form-label" htmlFor="name">Full Name</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={profileForm.name}
                      onChange={handleProfileChange}
                      className={`form-input ${profileErrors.name ? 'error' : ''}`}
                      placeholder="Your full name"
                    />
                    {profileErrors.name && <span className="form-error">⚠ {profileErrors.name}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="bio">Bio</label>
                    <textarea
                      id="bio"
                      name="bio"
                      value={profileForm.bio}
                      onChange={handleProfileChange}
                      className={`form-input textarea ${profileErrors.bio ? 'error' : ''}`}
                      placeholder="Tell us a bit about yourself..."
                      rows={3}
                    />
                    <span className="char-count">{profileForm.bio.length}/250</span>
                    {profileErrors.bio && <span className="form-error">⚠ {profileErrors.bio}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email address</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="form-input"
                      title="Email cannot be changed"
                    />
                    <span className="form-hint">Email cannot be changed</span>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={profileLoading}>
                      {profileLoading ? <><LoadingSpinner size="sm" /> Saving...</> : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="card profile-card">
                <h2 className="card-section-title">Change Password</h2>
                <p className="card-section-desc">
                  Changing your password will log you out of all devices for security.
                </p>

                <div className="security-notice">
                  <span>⚠️</span>
                  <p>After changing your password, all active sessions (including this one) will be terminated. You'll need to sign in again with your new password.</p>
                </div>

                <form onSubmit={handlePwSubmit} className="profile-form" noValidate>
                  <div className="form-group">
                    <label className="form-label" htmlFor="currentPassword">Current Password</label>
                    <div className="input-wrapper">
                      <input
                        id="currentPassword"
                        name="currentPassword"
                        type={showPw ? 'text' : 'password'}
                        value={pwForm.currentPassword}
                        onChange={handlePwChange}
                        className={`form-input ${pwErrors.currentPassword ? 'error' : ''}`}
                        placeholder="Your current password"
                      />
                      <button type="button" className="input-toggle" onClick={() => setShowPw(s => !s)} tabIndex={-1}>
                        {showPw ? '🙈' : '👁'}
                      </button>
                    </div>
                    {pwErrors.currentPassword && <span className="form-error">⚠ {pwErrors.currentPassword}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="newPassword">New Password</label>
                    <input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={pwForm.newPassword}
                      onChange={handlePwChange}
                      className={`form-input ${pwErrors.newPassword ? 'error' : ''}`}
                      placeholder="Min 8 chars, uppercase, number"
                    />
                    {pwErrors.newPassword && <span className="form-error">⚠ {pwErrors.newPassword}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="confirmNew">Confirm New Password</label>
                    <input
                      id="confirmNew"
                      name="confirmNew"
                      type="password"
                      value={pwForm.confirmNew}
                      onChange={handlePwChange}
                      className={`form-input ${pwErrors.confirmNew ? 'error' : ''}`}
                      placeholder="Repeat new password"
                    />
                    {pwErrors.confirmNew && <span className="form-error">⚠ {pwErrors.confirmNew}</span>}
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-danger" disabled={pwLoading}>
                      {pwLoading ? <><LoadingSpinner size="sm" /> Changing...</> : '🔒 Change Password'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

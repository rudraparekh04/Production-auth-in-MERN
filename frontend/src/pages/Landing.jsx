import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Landing.css';

const features = [
  {
    icon: '🔐',
    title: 'Two-Token Auth',
    desc: 'Access token (15min) stored in memory + Refresh token (7d) in HttpOnly cookie — industry standard security.',
  },
  {
    icon: '🔄',
    title: 'Auto Token Refresh',
    desc: 'Silent access token rotation via Axios interceptors. Users stay logged in seamlessly without re-authentication.',
  },
  {
    icon: '🛡️',
    title: 'Token Rotation',
    desc: 'Every refresh issues a new refresh token & invalidates the old one. Prevents replay attacks automatically.',
  },
  {
    icon: '🗄️',
    title: 'MongoDB Backend',
    desc: 'Refresh tokens hashed and stored in MongoDB. Supports up to 5 concurrent sessions per user.',
  },
  {
    icon: '⚡',
    title: 'Rate Limiting',
    desc: 'Strict per-route rate limiting on auth endpoints with Helmet security headers for production safety.',
  },
  {
    icon: '📱',
    title: 'Fully Responsive',
    desc: 'Mobile-first design that works beautifully on any screen size from phone to ultrawide monitor.',
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <main className="landing">
      {/* Glow orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Hero */}
      <section className="hero container">
        <div className="hero-badge">
          <span className="badge-dot" />
          Full-Stack MERN · Two-Token Auth
        </div>

        <h1 className="hero-title">
          Secure Auth<br />
          <span className="hero-gradient">Done Right</span>
        </h1>

        <p className="hero-description">
          Production-ready MERN authentication with dual JWT tokens, automatic silent refresh,
          token rotation security, and MongoDB session management.
        </p>

        <div className="hero-actions">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary btn-lg">
              Go to Dashboard →
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary btn-lg">
                Get Started Free
              </Link>
              <Link to="/login" className="btn btn-secondary btn-lg">
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Token flow diagram */}
        <div className="token-flow">
          <div className="token-box access">
            <div className="token-icon">⚡</div>
            <div className="token-info">
              <div className="token-name">Access Token</div>
              <div className="token-detail">In Memory · 15 min</div>
            </div>
          </div>
          <div className="token-arrow">⇄</div>
          <div className="token-box server">
            <div className="token-icon">🌐</div>
            <div className="token-info">
              <div className="token-name">Express API</div>
              <div className="token-detail">Validates & Rotates</div>
            </div>
          </div>
          <div className="token-arrow">⇄</div>
          <div className="token-box refresh">
            <div className="token-icon">🍪</div>
            <div className="token-info">
              <div className="token-name">Refresh Token</div>
              <div className="token-detail">HttpOnly Cookie · 7d</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="features container">
        <div className="section-label">What's included</div>
        <h2 className="section-title">Built for production</h2>
        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section className="stack container">
        <div className="section-label">Tech Stack</div>
        <div className="stack-list">
          {['MongoDB', 'Express.js', 'React 18', 'Node.js', 'JWT', 'Bcrypt', 'Axios', 'Vite'].map((t) => (
            <div key={t} className="stack-item">{t}</div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!isAuthenticated && (
        <section className="cta-section container">
          <div className="cta-card">
            <h2 className="cta-title">Ready to explore?</h2>
            <p className="cta-desc">Create an account and see the full auth flow in action.</p>
            <Link to="/register" className="btn btn-primary btn-lg">
              Create Account →
            </Link>
          </div>
        </section>
      )}

      <footer className="landing-footer container">
        <p>Built with MERN Stack · Two-Token Auth System</p>
      </footer>
    </main>
  );
}

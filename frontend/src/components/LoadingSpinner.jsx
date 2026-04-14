import './LoadingSpinner.css';

export default function LoadingSpinner({ fullScreen = false, size = 'md', text = '' }) {
  if (fullScreen) {
    return (
      <div className="spinner-fullscreen">
        <div className="spinner-wrap">
          <div className="spinner-ring" />
          <span className="spinner-logo">⬡</span>
        </div>
        {text && <p className="spinner-text">{text}</p>}
      </div>
    );
  }

  return (
    <div className={`spinner-inline spinner-${size}`}>
      <div className="spinner-ring" />
    </div>
  );
}

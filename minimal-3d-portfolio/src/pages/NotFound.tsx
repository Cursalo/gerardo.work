import { Link } from 'react-router-dom';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f8f9fa',
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '3rem',
    marginBottom: '1rem',
    color: '#333',
  },
  subtitle: {
    fontSize: '1.5rem',
    marginBottom: '2rem',
    color: '#666',
  },
  link: {
    backgroundColor: '#4caf50',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '1rem',
    fontWeight: 'bold',
    transition: 'background-color 0.3s',
    display: 'inline-block',
    marginTop: '1rem',
  },
  image: {
    maxWidth: '300px',
    marginBottom: '2rem',
  }
};

function NotFound() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>404</h1>
      <h2 style={styles.subtitle}>Page Not Found</h2>
      <p>The page you are looking for doesn't exist or has been moved.</p>
      <Link to="/" style={styles.link}>
        Return to Home
      </Link>
    </div>
  );
}

export default NotFound; 
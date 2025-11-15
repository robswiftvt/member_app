import React, { useState } from 'react';

function App() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/test');
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setMessage(data.message || JSON.stringify(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <h1>Member App - Client</h1>
      <button onClick={fetchTest} disabled={loading}>
        {loading ? 'Loading...' : 'Fetch /api/test'}
      </button>
      {message && (
        <div className="response">
          <strong>Response:</strong> {message}
        </div>
      )}
      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}

export default App;

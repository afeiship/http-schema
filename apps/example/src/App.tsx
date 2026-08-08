import { useState } from 'react';
import api from './api';

const API_NAMES = Object.keys(api);

function App() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const callApi = async (name: string) => {
    setLoading(name);
    try {
      const fn = api[name];
      const res = await fn({ id: 1 });
      setResults((prev) => ({ ...prev, [name]: res }));
    } catch (err: any) {
      setResults((prev) => ({ ...prev, [name]: { error: err.message } }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>http-schema Example</h1>
      <p style={{ color: '#666' }}>
        Click any API function to call it. Responses are fetched from json-server
        via fetch adapter.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
        {API_NAMES.map((name) => (
          <div
            key={name}
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 16,
              width: 320,
              background: loading === name ? '#f5f5f5' : '#fff',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{name}</div>
            <button
              onClick={() => callApi(name)}
              disabled={loading === name}
              style={{
                padding: '6px 16px',
                borderRadius: 4,
                border: '1px solid #1890ff',
                background: loading === name ? '#e6f7ff' : '#1890ff',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {loading === name ? 'Loading...' : 'Call'}
            </button>

            {results[name] && (
              <pre
                style={{
                  marginTop: 8,
                  padding: 8,
                  background: '#f6f8fa',
                  borderRadius: 4,
                  fontSize: 12,
                  overflow: 'auto',
                  maxHeight: 200,
                }}
              >
                {JSON.stringify(results[name], null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
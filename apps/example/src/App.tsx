import { useState } from 'react';
import api from './api';

const API_NAMES = Object.keys(api);

// Interceptor 标签映射（硬编码，与 schema 和 interceptor 配置保持同步）
const API_BADGES: Record<string, string[]> = {
  v1_badges_top: ['paginate'],
  v1_categories_root: ['paginate', 'by-name'],
};

const TAG_COLORS: Record<string, string> = {
  paginate: 'bg-blue-100 text-blue-700',
  'by-name': 'bg-orange-100 text-orange-700',
};

function methodOf(name: string): string {
  const action = name.split('_').pop();
  switch (action) {
    case 'create': return 'POST';
    case 'update': return 'PUT';
    case 'destroy': return 'DELETE';
    default: return 'GET';
  }
}

function callArgs(name: string): any {
  const action = name.split('_').pop();
  switch (action) {
    case 'show': return { id: 1 };
    case 'create': return { name: 'New Item' };
    case 'update': return { id: 1, name: 'Updated Item' };
    case 'destroy': return { id: 1 };
    default: return undefined;
  }
}

function App() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const callApi = async (name: string) => {
    setLoading(name);
    try {
      const fn = api[name];
      const res = await fn(callArgs(name));
      setResults((prev) => ({ ...prev, [name]: res }));
    } catch (err: any) {
      setResults((prev) => ({ ...prev, [name]: { error: err.message } }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 font-sans max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">http-schema Example</h1>
      <p className="text-gray-500 text-sm mb-4">
        Click any API function to call it. Responses are fetched from json-server via fetch adapter.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {API_NAMES.map((name) => {
          const badges = API_BADGES[name] ?? [];
          const method = methodOf(name);
          const result = results[name];

          return (
            <div
              key={name}
              className={`border border-gray-200 rounded-lg p-4 ${loading === name ? 'bg-gray-50' : 'bg-white'}`}
            >
              <div className="font-semibold mb-2 text-sm flex items-center gap-2 flex-wrap">
                {name}
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-sky-500 text-white font-medium">
                  {method}
                </span>
                {badges.map((tag) => (
                  <span
                    key={tag}
                    className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${TAG_COLORS[tag] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <button
                onClick={() => callApi(name)}
                disabled={loading === name}
                className="px-4 py-1.5 rounded border border-sky-500 text-sm font-medium cursor-pointer disabled:cursor-not-allowed disabled:bg-sky-50 disabled:text-sky-300 disabled:border-sky-200 bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-700"
              >
                {loading === name ? 'Loading...' : 'Call'}
              </button>

              {result && (
                <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-48 border border-gray-100">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
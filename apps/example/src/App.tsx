import { useState } from 'react';
import api, { setType } from './api';

const API_NAMES = Object.keys(api).filter((k) => k !== 'typed');

// Interceptor 标签映射（硬编码，与 schema 和 interceptor 配置保持同步）
const API_BADGES: Record<string, string[]> = {
  v1_badges_top: ['paginate'],
  v1_categories_root: ['paginate', 'by-name'],
};

const TAG_COLORS: Record<string, string> = {
  paginate: 'bg-blue-100 text-blue-700',
  'by-name': 'bg-orange-100 text-orange-700',
};

// Typed API 列表
const TYPED_API_KEYS = ['get_user_collects', 'hot_schools'];

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
  const [currentType, setCurrentType] = useState<'graduate' | 'undergraduate'>('graduate');

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

  const callTypedApi = async (key: string) => {
    const loaderKey = `typed:${key}`;
    setLoading(loaderKey);
    try {
      // @ts-ignore
      const res = await api.typed(key)();
      setResults((prev) => ({ ...prev, [loaderKey]: res }));
    } catch (err: any) {
      setResults((prev) => ({ ...prev, [loaderKey]: { error: err.message } }));
    } finally {
      setLoading(null);
    }
  };

  const switchType = (type: 'graduate' | 'undergraduate') => {
    setCurrentType(type);
    setType(type);
  };

  return (
    <div className="p-6 font-sans max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">http-schema Example</h1>
      <p className="text-gray-500 text-sm mb-4">
        Click any API function to call it. Responses are fetched from json-server via fetch adapter.
      </p>

      {/* Typed API Section */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-2">Typed API (api.typed)</h2>
        <p className="text-gray-500 text-sm mb-3">
          Same key, different routes based on <code className="bg-gray-100 px-1 rounded">resolveType</code>.
        </p>

        {/* Type Switcher */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-medium text-gray-600">Type:</span>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => switchType('graduate')}
              className={`px-4 py-1.5 text-sm font-medium cursor-pointer transition-colors ${
                currentType === 'graduate'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              graduate
            </button>
            <button
              onClick={() => switchType('undergraduate')}
              className={`px-4 py-1.5 text-sm font-medium cursor-pointer transition-colors ${
                currentType === 'undergraduate'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              undergraduate
            </button>
          </div>
          <span className="text-xs text-gray-400 ml-1">
            (resolveType returns "{currentType}")
          </span>
        </div>

        {/* Typed API Buttons */}
        <div className="flex flex-wrap gap-3">
          {TYPED_API_KEYS.map((key) => {
            const loaderKey = `typed:${key}`;
            const result = results[loaderKey];
            const isBusy = loading === loaderKey;

            return (
              <div
                key={loaderKey}
                className={`border border-gray-200 rounded-lg p-4 ${isBusy ? 'bg-gray-50' : 'bg-white'}`}
              >
                <div className="font-semibold mb-2 text-sm flex items-center gap-2">
                  {key}
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-purple-500 text-white font-medium">
                    GET
                  </span>
                </div>

                <button
                  onClick={() => callTypedApi(key)}
                  disabled={isBusy}
                  className="px-4 py-1.5 rounded border border-indigo-500 text-sm font-medium cursor-pointer disabled:cursor-not-allowed disabled:bg-indigo-50 disabled:text-indigo-300 disabled:border-indigo-200 bg-indigo-500 text-white hover:bg-indigo-600 active:bg-indigo-700"
                >
                  {isBusy ? 'Loading...' : 'Call'}
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

      {/* Normal API Section */}
      <div>
        <h2 className="text-lg font-bold mb-2">Normal API (flat keys)</h2>
        <p className="text-gray-500 text-sm mb-3">
          Classic flat API functions generated from schema.
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
    </div>
  );
}

export default App;
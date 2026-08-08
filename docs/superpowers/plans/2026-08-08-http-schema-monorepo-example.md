# Monorepo Restructure + Example App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure http-schema into a pnpm monorepo with `packages/core/` (library) and `apps/example/` (React Vite demo with json-server).

**Architecture:** Standard pnpm workspaces monorepo. Root `package.json` is private orchestration only. Library at `packages/core/` keeps its `@jswork/http-schema` name. Example app at `apps/example/` references it via `workspace:*`.

**Tech Stack:** pnpm workspaces, TypeScript, React 18, Vite 5, json-server

---

### Task 1: Create workspace config and restructure root

**Files:**
- Create: `pnpm-workspace.yaml`
- Modify: `package.json` (root, make private orchestration)
- Modify: `.gitignore`
- Create: `packages/core/`
- Move: `src/`, `__tests__/`, `tsconfig.json`, `tsup.config.ts`, `.editorconfig`, `.ncurc.json`, `.release-it.json`, `.envrc` into `packages/core/`
- Modify: `packages/core/package.json` (keep same, no changes needed)

- [ ] **Step 1: Create pnpm-workspace.yaml**

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

- [ ] **Step 2: Update root package.json**

```json
{
  "name": "http-schema-monorepo",
  "private": true,
  "scripts": {
    "build": "pnpm --filter @jswork/http-schema build",
    "test": "pnpm --filter @jswork/http-schema test",
    "example": "pnpm --filter example dev"
  },
  "license": "MIT"
}
```

- [ ] **Step 3: Create packages/core/ directory**

```bash
mkdir -p packages/core
```

- [ ] **Step 4: Move files into packages/core/**

```bash
# Move source files
mv src packages/core/src
mv __tests__ packages/core/__tests__
mv tsconfig.json packages/core/tsconfig.json
mv tsup.config.ts packages/core/tsup.config.ts
mv .editorconfig packages/core/.editorconfig
mv .ncurc.json packages/core/.ncurc.json
mv .release-it.json packages/core/.release-it.json
mv .envrc packages/core/.envrc

# Move package.json for the sub-package
cp package.json packages/core/package.json
```

- [ ] **Step 5: Create packages/core/.gitignore**

```
node_modules
dist
coverage
.DS_Store
```

- [ ] **Step 6: Update .gitignore to remove old paths**

```bash
cat > .gitignore << 'EOF'
node_modules
dist
coverage
.DS_Store
.idea
.vscode
*.local.json
EOF
```

- [ ] **Step 7: Remove old root files that moved**

```bash
# Remove root files that were moved to packages/core/
# (src, __tests__, tsconfig.json, tsup.config.ts, etc. are already moved)
# Clean up old package.json (we already wrote a new one)
```

- [ ] **Step 8: Install dependencies and verify**

```bash
pnpm install
pnpm --filter @jswork/http-schema build
pnpm --filter @jswork/http-schema test
```

Expected: Build succeeds, all 23 tests pass.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor: restructure into pnpm monorepo with packages/core

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Create apps/example/ with React Vite

**Files:**
- Create: `apps/example/package.json`
- Create: `apps/example/index.html`
- Create: `apps/example/vite.config.ts`
- Create: `apps/example/tsconfig.json`
- Create: `apps/example/tsconfig.node.json`
- Create: `apps/example/src/main.tsx`
- Create: `apps/example/src/App.tsx`
- Create: `apps/example/src/App.css`
- Create: `apps/example/src/schema.ts`
- Create: `apps/example/src/api.ts`
- Create: `apps/example/src/components/ApiCard.tsx`
- Create: `apps/example/src/vite-env.d.ts`
- Create: `apps/example/server/db.json`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p apps/example/src/components
mkdir -p apps/example/server
```

- [ ] **Step 2: Create apps/example/package.json**

```json
{
  "name": "example",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"pnpm server\" \"pnpm client\"",
    "client": "vite",
    "server": "json-server --watch server/db.json --port 3001",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@jswork/http-schema": "workspace:*",
    "@jswork/universal-request-adapter-fetch": "^1.0.8",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "concurrently": "^8.2.2",
    "json-server": "^0.17.4",
    "typescript": "^5.5.3",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 3: Create apps/example/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>http-schema Example</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create apps/example/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
```

- [ ] **Step 5: Create apps/example/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Create apps/example/src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />
```

- [ ] **Step 7: Create apps/example/src/main.tsx**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 8: Create apps/example/src/schema.ts**

```typescript
export default {
  baseURL: '/api',
  request: ['', 'json'],
  items: [
    {
      request: ['/rails_jwt_admin', 'json'],
      items: {
        login: ['post', '/auth'],
        profile: ['get', '/me'],
      },
    },
    {
      resources: ['badges', 'posts', 'categories'],
      items: {
        badges_top: ['get', '/badges/top?limit=100'],
        categories_root: ['get', '/categories/root', { tags: ['ni2lv'] }],
      },
    },
  ],
};
```

- [ ] **Step 9: Create apps/example/src/api.ts**

```typescript
import httpSchema from '@jswork/http-schema';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';
import schema from './schema';

const api = httpSchema(schema, {
  adapter: new FetchAdapter(),
  transformResponse: (res) => res.data,
});

export default api;
```

- [ ] **Step 10: Create apps/example/src/App.tsx**

```tsx
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
```

- [ ] **Step 11: Create apps/example/server/db.json**

```json
{
  "badges": [
    { "id": 1, "name": "Gold", "icon": "🥇" },
    { "id": 2, "name": "Silver", "icon": "🥈" },
    { "id": 3, "name": "Bronze", "icon": "🥉" }
  ],
  "posts": [
    { "id": 1, "title": "Hello World", "body": "This is the first post." },
    { "id": 2, "title": "Second Post", "body": "Another post here." }
  ],
  "categories": [
    { "id": 1, "name": "Tech", "root": true },
    { "id": 2, "name": "Life", "root": false }
  ],
  "me": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

- [ ] **Step 12: Install and verify**

```bash
pnpm install
pnpm build
```

Expected: Build succeeds, library builds correctly.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: add apps/example with React Vite + json-server

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Update docs and README

**Files:**
- Modify: `README.md`
- Modify: `llms.txt`

- [ ] **Step 1: Update README.md paths**

Update the README to reflect the new monorepo structure. The installation and usage remain the same for consumers. Add a section about monorepo structure and development.

- [ ] **Step 2: Update llms.txt paths**

Update file paths in `llms.txt` from `src/` to `packages/core/src/`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: update README and llms.txt for monorepo structure

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|-----------------|------|
| pnpm-workspace.yaml | Task 1, Step 1 |
| Root package.json as private orchestration | Task 1, Step 2 |
| packages/core/ with all source | Task 1, Steps 3-7 |
| apps/example/ with React Vite | Task 2, all steps |
| json-server mock data | Task 2, Step 11 |
| Workspace reference via workspace:* | Task 2, Step 2 (package.json) |
| root scripts (build, test, example) | Task 1, Step 2 |
| README/llms.txt updates | Task 3 |
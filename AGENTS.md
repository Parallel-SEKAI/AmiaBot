# AmiaBot Developer Guide

This document provides essential information for agents and developers working on the AmiaBot codebase.

## 1. Environment & Commands

### Package Management

- Use **pnpm** for package management.

### Build & Run

- **Development:** `pnpm dev` (Runs `tsx watch src/main.ts`)
- **Build:** `pnpm build` (Cleans `dist`, builds CSS, runs `tsc`)
- **Start Production:** `pnpm start` (Runs `node dist/main.js`)

### Testing

- **Run All Tests:** `pnpm test:run` (Runs Vitest once)
- **Watch Tests:** `pnpm test`
- **Run Single Test File:** `pnpm test <filename>` (e.g., `pnpm test sleep.test.ts`)
- **Run Specific Test Case:** `pnpm test -t "test name pattern"`

### Linting & Formatting

- **Lint:** `pnpm lint` (ESLint)
- **Fix Lint Issues:** `pnpm lint:fix`
- **Check Format:** `pnpm format:check` (Prettier)
- **Format Code:** `pnpm format`

## 2. Code Structure & Architecture

### Directory Layout

- `src/features/`: Self-contained feature modules (e.g., `bilibili`, `chat`, `github`).
  - Each feature typically has an `index.ts` (exports) and `feature.ts` (logic).
- `src/components/`: React components used for rendering bot responses (images/cards).
- `src/onebot/`: OneBot protocol implementation (client, entities).
- `src/service/`: Shared services (Database, Browser, APIs).
- `src/config/`: Configuration and logger.

### Feature Module Pattern

New bot features should be added to `src/features/<feature-name>/`.

- Create a `feature.ts` for the implementation.
- Export relevant parts in `index.ts`.
- Register the feature in `src/features/index.ts` (implied by `main.ts` usage).

## 3. Coding Standards & Conventions

### Imports & Modules

- **Module System:** ES Modules (`"type": "module"`).
- **File Extensions:** **CRITICAL:** Relative imports MUST include the `.js` extension.
  - Correct: `import { initDb } from './service/db.js';`
  - Incorrect: `import { initDb } from './service/db';`
- **Style:** Group imports: external libraries first, then internal modules.

### TypeScript Config

- **Target:** `ESNext`
- **Module Resolution:** `NodeNext`
- **Strict Mode:** Enabled (`strict: true`). Avoid `any` types; use interfaces/types.
- **Floating Promises:** disallowed (`@typescript-eslint/no-floating-promises: error`). Always `await` promises or explicitly handle them (e.g., `.catch()`).

### React & UI

- React is used for generating static content/images (e.g., `VideoCard.tsx`).
- Use Tailwind CSS for styling.
- Components are located in `src/components/`.

### Logging

- **Do NOT use `console.log`**.
- Use the project logger:

  ```typescript
  import logger from '../config/logger.js';

  logger.info('Message');
  logger.error('Error occurred: %s', error);
  logger.debug('Debug info');
  ```

### Naming Conventions

- **Variables/Functions:** camelCase (e.g., `initFeatures`, `videoUrl`).
- **Files:** kebab-case for utilities/modules (e.g., `feature-manager.ts`), PascalCase for React components (e.g., `VideoCard.tsx`).
- **Classes/Interfaces:** PascalCase.

### Error Handling

- Use `try/catch` blocks for async operations, especially DB and API calls.
- Log errors using `logger.error` with descriptive messages.
- Do not let errors crash the main process; handle them gracefully at the feature level.

## 4. Database

- Uses **PostgreSQL** (`pg`).
- DB initialization logic is in `src/service/db.ts`.
- Ensure schema changes are reflected in initialization scripts or migrations.

## 5. Testing Guidelines

- Write unit tests for logic-heavy utilities and services.
- Place tests in `tests/` or alongside source files (e.g., `foo.test.ts`).
- Mock external services (API calls, Database) when testing business logic.

## IMPORTANT

- Do not execute `git commit` without an explicit user request.

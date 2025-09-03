# Snapthumb Migration Guide

This project was created from a clean Vite + React + TypeScript + Tailwind baseline.
Your previous project's source has been copied into **`src/legacy/`** to keep the current app compiling.

## How to bring code back safely

1. Move utilities to **`src/lib/`** (create it) and export them.
2. Move presentational bits to **`src/components/`**.
3. Move feature-specific logic to **`src/features/<feature-name>/`**.
4. After moving a file out of `src/legacy/`, update imports and run:
   ```bash
   npm run type-check
   ```
5. When a feature is fully migrated, **delete** its original from `src/legacy/`.

> Tip: You can keep `.jsx` files as-is (tsconfig ignores legacy), or convert to `.tsx` gradually.

# Nawi Devzone

A private, offline workspace for software projects. It has one Kanban board across projects, task details and checklists, daily recurring tasks, and nested Markdown documentation. The installed app uses a local SQLite database; no account or server is needed.

## Run and build

Requirements for Windows desktop builds: Node.js, Rust with the MSVC toolchain, Visual Studio C++ Build Tools, the Windows SDK, and WebView2. See the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

```powershell
npm install
npm run desktop:dev
```

To create the per-user NSIS installer:

```powershell
npm run desktop:build
```

The installer is written under `src-tauri/target/release/bundle/nsis/`. It creates a shortcut for double-click launch. Data is kept in Tauri's app data directory in `nawi-devzone.db`, separate from the installation directory.

For a quick interface preview in a browser, run `npm run dev` and open the displayed localhost address. Browser preview stores test data in that browser's local storage; it does **not** read or write the installed app's SQLite database.

## How to use

1. Create a project from the board empty state or **Projects** page.
2. Add tasks from the project page or a Kanban column. Every task belongs to a project. Add labeled web links in the task editor, or put plain and Markdown links in its description; the card collects them in a collapsible **Links** section.
3. Use the board's project selector to see all tasks or one project's tasks. Drag cards to reorder or change status.
4. On a project page, use **Daily recurring tasks** to create a task that repeats each day. The app creates one fresh card in **To Do** for the current local date when it opens or detects a new day while running. Each card gets its own unchecked checklist. Editing a daily task changes future cards; stopping it leaves existing cards in place. Missed days while the app was closed are not backfilled.
5. Open a project to add Markdown documentation. Pages can have child pages; use **Move under** to move a page in the tree. Edit a page and select **Save page** to persist it.
6. Archive a project to remove its tasks from the active board and pause its daily schedules. Restore it from the **Projects** page at any time.
7. Press **Ctrl+F** (or use **Search** in the sidebar or top bar) to find projects, tasks, and documentation by title or content. Select a result to open it. Use the button beside **Nawi Devzone** to collapse the sidebar; that choice is remembered on this computer.

## Technical notes

- React, TypeScript, Vite, Tailwind CSS, and shadcn/ui are used for the interface.
- Tauri 2 hosts the built web interface in a Windows app window.
- The Tauri SQL plugin opens the local SQLite file and applies versioned migrations from `src-tauri/migrations`.
- The TypeScript repository in `src/lib/repository.ts` contains all persistence calls. The browser-only local storage adapter is used for UI preview.
- The app is single-user and offline. It has no sign-in, sync, integrations, notifications, or backup feature.

## Checks

```powershell
npm run lint
npm run build
```

The desktop build additionally compiles Rust and bundles the NSIS installer. On machines with application-control rules that prevent newly compiled Cargo build scripts from running, build the installer in an approved Rust build environment.

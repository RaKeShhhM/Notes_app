# Notes App

A lightweight, responsive, browser-based note-taking app built with **vanilla HTML/CSS/JavaScript**. Notes are stored locally in the browser using `localStorage`, so you can create, edit, color, pin, search, reorder and keep notes across page reloads.

---

## 🎥 Demo Video

[![Watch the demo](https://img.youtube.com/vi/KYAkEGYMNSw/0.jpg)](https://youtu.be/KYAkEGYMNSw)

Click the image above to watch the demo of the Notes App on YouTube.



## Features

* Create, edit and delete notes
* Per-note color palette
* Auto-save while typing (debounced)
* View / Edit toggle (read-only mode)
* Live search (title + content)
* Pin important notes (pinned notes show first)
* Drag & drop reordering
* Dark / Light theme toggle (persisted)
* Notes persisted in `localStorage` (single JSON array)
* Responsive layout

---

## Quickstart

1. Clone or download the project folder.

2. Make sure the structure looks like this:

```
project/
├─ index.html
├─ styles.css
|─script.js
```

3. Open `index.html` in your browser. (No server required.)

> Or run a simple static server (recommended while developing):

```bash
# Python 3
python -m http.server 8000
# then open http://localhost:8000
```

---

## How data is stored

All notes are stored under a single key in `localStorage` (`notesApp:v2` by default). The app saves an **array of objects** with this shape:

```js
{
  id: 'unique-id',
  title: 'Note title',
  content: 'Note body...',
  color: '#FFFAE6',
  pinned: false,
  createdAt: 1600000000000
}
```

`persist()` serializes this array with `JSON.stringify()` and writes it to `localStorage`. On load, the app parses the JSON and rebuilds the UI.

---

## Main files

* `index.html` — App shell and UI root.
* `styles.css` — All layout and theme styles (responsive + dark mode).
* `script.js` — App logic: data model, persistence, rendering, events, drag & drop.

---

## Architecture & Flow (high-level)

1. On load the app reads the saved theme and the saved notes from `localStorage`.
2. Notes are kept in an in-memory array `notes` which is the single source of truth.
3. `render()` builds DOM elements for each note using `renderNoteElement()`.
4. UI actions (add, edit, pin, delete, color change) update `notes`, call `persist()` to save, and call `render()` to refresh UI.
5. Typing uses a debounced auto-save so the app does not write on every keystroke.
6. Drag & drop reorders the `notes` array and persists the new order.

---

## Customization points

* **Change storage key**: edit `STORAGE_KEY` in `script.js` if you want a separate namespace.
* **Change palette**: update `PALETTE` array in `script.js`.
* **Auto-save delay**: change the delay in the `debounce()` call (default ~600ms in the project).
* **Disable drag & drop**: remove or comment the drag event listeners inside `renderNoteElement()`.

---

## Accessibility & Usability notes

* Inputs are plain `<textarea>` elements that support keyboard navigation and selection.
* The app persists theme choice and note data across reloads.
* For keyboard-only users: add additional focus/aria attributes if needed (e.g., `role="button"` and `aria-pressed` for pin/view buttons).

---

## Troubleshooting

* **Notes disappear** — check browser devtools `Application → Local Storage` to see if `notesApp:v2` exists and contains valid JSON.
* **Typing jumps or loses cursor** — try disabling `render()` while typing. A common pattern is to avoid re-rendering the whole list on every small change (the app uses debounced saves to reduce this).
* **Search not working** — confirm `#search` exists and is visible; search is case-insensitive and matches title+content.

---




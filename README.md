# REED

A minimal static web app for reading original book lines with user-added explanations.

On every startup, REED loads the library fresh from `library.json`, kept beside the app files. For automatic loading, open the app through a local/static server or a cloud host so the browser can fetch `library.json`. If you open `index.html` directly with `file://` and your browser blocks local file fetches, REED will show an empty library instead of a starter book; use `Load File` once for that session.

## Data Workflow

Use the `Data` tab to paste a full library JSON object or one single book object. The app supports multiple books, sections, and lines.

`Load JSON` replaces only the selected book. `Load Library` replaces the whole REED library from pasted JSON. `Load File` opens a JSON file from disk, and `Save JSON File` writes or downloads `library.json` with every book, section, line, note, and progress field.

When the browser supports direct file saving, choose your real `library.json` once with `Save JSON File`; after that, REED auto-saves changes back to that file during the same session. If direct saving is blocked, the app downloads an updated `library.json` instead. Until you save, edits are only in the current page memory.

Each line can include:

- `original`
- `simpleEnglish`
- `difficultWords`
- `proof`
- `modernExample`
- `connection`
- `application`
- `checkQuestion`
- `notes`

Use `Copy AI Prompt` inside the app, paste that prompt into an AI chat with the book text, then paste the returned single-book JSON back into the `Data` tab. The prompt asks the AI to split paragraphs line by line, explain every line, and return only valid app-ready JSON for the selected book.

The JSON loader accepts common vocabulary formats such as `difficultWords`, `difficult_words`, `termsAndDefinitions`, `definitions`, `word/meaning`, `term/explanation`, and object maps like `{ "Art": "A skill or craft." }`.

Personal notes are saved on each line as `notes`. Click a line in `Read`, write in `My notes`, and the app saves automatically.

Reading progress is saved automatically. Clicking a line marks it read, and the button at the end of a section marks that section complete before moving to the next section.

Use the reset buttons in `Read` to clear progress for the selected line, current section, or current book. Use `Reset Progress` in `Data` to clear reading progress across the whole library without deleting notes or explanations.

Use `Focus Mode` in `Read` for a full-screen original-text view. Click any line to open its explanation panel, click a difficult word to open its definition, and use `Hide Info` or `Exit Focus` when you want to return to the clean reading view.

Use the circular theme icon in the top bar to switch between light mode and dark mode. The app starts from your system theme each time.

Use `Controls` in the sidebar to reveal book/section/line management buttons. Use the `Sections` dropdown to show or hide all sections for the selected book. Use the three-line menu in the top bar to reveal `AI Prompt`, `Copy JSON`, and `Paste JSON`.

The `Data` tab shows JSON for the selected book only. Loading JSON there replaces the selected book, not the whole library.

There is no built-in sample library. If `library.json` cannot be loaded, the app starts empty and waits for your permanent JSON file.

The REED logo is used as the browser icon. Search in `Library` filters books by title, author, or label, and the view switcher keeps `Read`, `Edit`, and `Data` inside a compact arrow menu.

The layout is responsive for phones and tablets. Mobile search keeps the keyboard focus while filtering, focus mode opens explanations in a translucent slide-in panel, and difficult words are large enough to tap directly.

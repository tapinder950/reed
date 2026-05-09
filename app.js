const PERMANENT_LIBRARY_FILE = "library.json";

const emptyLibrary = { version: 1, books: [] };

let state = {
  library: normalizeLibrary(clone(emptyLibrary)),
  selectedBookId: "",
  selectedSectionId: "",
  selectedLineId: "",
  view: "read",
  theme: loadTheme(),
  jsonFile: {
    handle: null,
    name: PERMANENT_LIBRARY_FILE,
    message: "Loading library.json..."
  },
  ui: {
    controlsOpen: false,
    menuOpen: false,
    sectionsOpen: true,
    viewMenuOpen: false,
    bookSearch: ""
  },
  focus: {
    open: false,
    panel: "",
    lineId: "",
    wordIndex: null
  },
  jsonText: "",
  toast: ""
};

let jsonFileSaveTimer = 0;

bootApp();

async function bootApp() {
  applyTheme();
  renderLoading();
  const result = await loadLibrary();
  state.library = result.library;
  state.jsonFile.message =
    result.source === "json-file"
      ? "Loaded fresh from library.json"
      : `Could not load ${PERMANENT_LIBRARY_FILE}; use Load File or run this folder from a local server`;
  initialiseSelection();
  render();
}

async function loadLibrary() {
  const jsonFileLibrary = await readPermanentJsonLibrary();
  return {
    library: jsonFileLibrary || normalizeLibrary(clone(emptyLibrary)),
    source: jsonFileLibrary ? "json-file" : "missing"
  };
}

function saveLibrary() {
  const snapshot = clone(state.library);
  if (state.jsonFile.handle) {
    queueJsonFileSave(snapshot);
    return;
  }
  state.jsonFile.message = `Unsaved changes - save ${PERMANENT_LIBRARY_FILE}`;
}

function queueJsonFileSave(snapshot) {
  if (!state.jsonFile.handle) return;
  window.clearTimeout(jsonFileSaveTimer);
  jsonFileSaveTimer = window.setTimeout(() => {
    writeJsonFileHandle(state.jsonFile.handle, snapshot, true);
  }, 600);
}

async function readPermanentJsonLibrary() {
  try {
    const libraryUrl = `${PERMANENT_LIBRARY_FILE}?v=${Date.now()}`;
    const response = await fetch(libraryUrl, { cache: "no-store" });
    if (!response.ok) return null;
    return normalizeLibrary(await response.json());
  } catch (error) {
    return null;
  }
}

function renderLoading() {
  const app = document.getElementById("app");
  if (!app) return;
  app.innerHTML = `
    <div class="loading-shell">
      <div>
        <h1>REED</h1>
        <p>${escapeHtml(state.jsonFile.message)}</p>
      </div>
    </div>
  `;
}

function loadTheme() {
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
    ? "dark"
    : "light";
}

function applyTheme() {
  if (!document.documentElement?.setAttribute) return;
  document.documentElement.setAttribute("data-theme", state.theme);
}

function initialiseSelection() {
  const book = state.library.books[0];
  state.selectedBookId = book?.id || "";
  const section = book?.sections?.[0];
  state.selectedSectionId = section?.id || "";
  state.selectedLineId = section?.lines?.[0]?.id || "";
  syncJsonText();
}

function selectBook(bookId) {
  state.selectedBookId = bookId || "";
  const book = getSelectedBook();
  const section = book?.sections?.[0];
  state.selectedSectionId = section?.id || "";
  state.selectedLineId = section?.lines?.[0]?.id || "";
  syncJsonText();
}

function syncJsonText() {
  state.jsonText = getSelectedBookJson();
}

function getSelectedBookJson() {
  const book = getSelectedBook();
  return JSON.stringify(book || state.library, null, 2);
}

function getFullLibraryJson() {
  return JSON.stringify(state.library, null, 2);
}

function render() {
  applyTheme();
  const app = document.getElementById("app");
  const book = getSelectedBook();
  const section = getSelectedSection();
  const line = getSelectedLine();

  app.innerHTML = `
    <div class="app-shell">
      ${renderSidebar(book, section)}
      <main class="workspace">
        <div class="topbar">
          ${renderViewMenu()}
          <div class="reader-actions">
            ${renderThemeToggle()}
            ${state.view === "read" ? `<button class="button ghost" data-action="open-focus-mode">Focus Mode</button>` : ""}
            ${renderUtilityMenu()}
          </div>
        </div>
        ${state.view === "read" ? renderReader(book, section, line) : ""}
        ${state.view === "edit" ? renderEditor(book, section, line) : ""}
        ${state.view === "data" ? renderDataPanel() : ""}
      </main>
    </div>
    ${state.focus.open ? renderFocusMode(book, section) : ""}
    ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ""}
  `;

  attachEvents();
}

function renderViewMenu() {
  const labels = { read: "Read", edit: "Edit", data: "Data" };
  return `
    <div class="view-menu-wrap">
      <button class="button view-toggle" aria-label="Change view" aria-expanded="${state.ui.viewMenuOpen ? "true" : "false"}" data-action="toggle-view-menu">
        <span>${labels[state.view] || "Read"}</span>
        <b aria-hidden="true">${state.ui.viewMenuOpen ? "^" : "v"}</b>
      </button>
      ${
        state.ui.viewMenuOpen
          ? `<div class="view-menu" role="tablist" aria-label="View">
              ${segment("read", "Read")}
              ${segment("edit", "Edit")}
              ${segment("data", "Data")}
            </div>`
          : ""
      }
    </div>
  `;
}

function renderUtilityMenu() {
  return `
    <div class="utility-menu-wrap">
      <button class="icon-button menu-toggle" aria-label="Open AI and JSON menu" aria-expanded="${state.ui.menuOpen ? "true" : "false"}" data-action="toggle-utility-menu">
        <span class="hamburger" aria-hidden="true"><i></i><i></i><i></i></span>
      </button>
      ${
        state.ui.menuOpen
          ? `<div class="utility-menu">
              <button class="button ghost" data-action="copy-prompt">AI Prompt</button>
              <button class="button ghost" data-action="copy-json">Copy JSON</button>
              <button class="button ghost" data-action="copy-library">Copy Library</button>
              <button class="button ghost" data-action="save-json-file">Save JSON File</button>
              <button class="button primary" data-view="data">Paste JSON</button>
            </div>`
          : ""
      }
    </div>
  `;
}

function renderThemeToggle() {
  const isDark = state.theme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  return `
    <button class="icon-button theme-toggle ${isDark ? "dark" : "light"}" aria-label="${label}" title="${label}" data-action="toggle-theme">
      <span class="theme-icon" aria-hidden="true"></span>
    </button>
  `;
}

function controlIcon(name) {
  const icons = {
    book: `
      <svg class="control-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5.8c0-1 .8-1.8 1.8-1.8H18v14.5H7.2c-1.2 0-2.2.6-2.2 1.5V5.8Z"></path>
        <path d="M5 20c0-.9 1-1.5 2.2-1.5H18"></path>
        <path d="M15.5 7.5v5"></path>
        <path d="M13 10h5"></path>
      </svg>
    `,
    sections: `
      <svg class="control-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 6.5h9"></path>
        <path d="M5 11.5h9"></path>
        <path d="M5 16.5h6"></path>
        <path d="M17.5 13.5v5"></path>
        <path d="M15 16h5"></path>
      </svg>
    `,
    line: `
      <svg class="control-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 7h10"></path>
        <path d="M5 12h8"></path>
        <path d="M5 17h6"></path>
        <path d="M17.5 14v5"></path>
        <path d="M15 16.5h5"></path>
      </svg>
    `,
    trash: `
      <svg class="control-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 8h8"></path>
        <path d="M10 8V6h4v2"></path>
        <path d="M9 11v6"></path>
        <path d="M15 11v6"></path>
        <path d="M7 8l1 12h8l1-12"></path>
      </svg>
    `
  };

  return icons[name] || "";
}

function renderSidebar(book, section) {
  const books = state.library.books;
  const filteredBooks = filterBooks(books);
  const sections = book?.sections || [];
  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-copy">
          <h1 class="brand-title">REED</h1>
          <p class="brand-subtitle">Read - Explore - Explain</p>
        </div>
      </div>
      <button class="button controls-toggle" aria-expanded="${state.ui.controlsOpen ? "true" : "false"}" data-action="toggle-controls">Controls</button>
      ${
        state.ui.controlsOpen
          ? `<div class="sidebar-actions">
              <button class="icon-button action-button book-action" aria-label="Add book" data-tooltip="Add a new book" data-action="add-book">${controlIcon("book")}</button>
              <button class="icon-button action-button section-action" aria-label="Add section" data-tooltip="Add a section to this book" data-action="add-section">${controlIcon("sections")}</button>
              <button class="icon-button action-button line-action" aria-label="Add line" data-tooltip="Add a paragraph or line" data-action="add-line">${controlIcon("line")}</button>
              <button class="icon-button action-button delete-action" aria-label="Delete selected book" data-tooltip="Delete the selected book" data-action="delete-book">${controlIcon("trash")}</button>
            </div>`
          : ""
      }
      <div class="sidebar-scroll">
        <div class="library-panel">
          <div class="section-label">Library</div>
          <label class="library-search">
            <span aria-hidden="true"></span>
            <input type="search" placeholder="Search books" value="${escapeAttr(state.ui.bookSearch)}" data-book-search />
          </label>
          <div class="book-list" data-book-list>
            ${renderBookList(filteredBooks, books.length)}
          </div>
        </div>
        <label class="field mobile-section-select">
          <span>Section</span>
          <select data-select-section>
            ${sections.map((item) => sectionOption(item, section)).join("")}
          </select>
        </label>
        <div class="section-panel">
          <button class="section-dropdown" aria-expanded="${state.ui.sectionsOpen ? "true" : "false"}" data-action="toggle-sections">
            <span>Sections</span>
            <small>${sections.length} total</small>
            <b aria-hidden="true">${state.ui.sectionsOpen ? "^" : "v"}</b>
          </button>
          ${
            state.ui.sectionsOpen
              ? `<div class="section-list">
                  ${
                    sections.length
                      ? sections.map((item) => renderSectionButton(item, section)).join("")
                      : `<div class="empty-state">No sections yet.</div>`
                  }
                </div>`
              : ""
          }
        </div>
      </div>
    </aside>
  `;
}

function renderBookButton(book) {
  const active = book.id === state.selectedBookId ? "active" : "";
  const sectionCount = book.sections?.length || 0;
  const lineCount = (book.sections || []).reduce(
    (total, section) => total + (section.lines?.length || 0),
    0
  );
  const progress = getBookProgress(book);
  return `
    <button class="book-button ${active}" data-book-id="${escapeAttr(book.id)}">
      <div class="book-name">${escapeHtml(book.title || "Untitled book")}</div>
      <div class="book-meta">${escapeHtml(book.author || "Unknown author")} &middot; ${sectionCount} section${sectionCount === 1 ? "" : "s"} &middot; ${lineCount} line${lineCount === 1 ? "" : "s"} &middot; ${progress.percent}% read</div>
      <div class="mini-progress" aria-hidden="true"><span style="width: ${progress.percent}%"></span></div>
    </button>
  `;
}

function renderBookList(books, totalCount = state.library.books.length) {
  if (!books.length) {
    return `<div class="empty-state">${totalCount ? "No books found." : "No books yet."}</div>`;
  }
  return books.map((item) => renderBookButton(item)).join("");
}

function filterBooks(books) {
  const query = state.ui.bookSearch.trim().toLowerCase();
  if (!query) return books;
  return books.filter((book) => {
    const title = String(book.title || "").toLowerCase();
    const author = String(book.author || "").toLowerCase();
    const label = String(book.label || "").toLowerCase();
    return title.includes(query) || author.includes(query) || label.includes(query);
  });
}

function renderSectionButton(item, selected) {
  const active = item.id === selected?.id ? "active" : "";
  const count = item.lines?.length || 0;
  const progress = getSectionProgress(item);
  const label = progress.done ? "Done" : `${progress.read}/${progress.total || count} read`;
  return `
    <button class="section-button ${active}" data-section-id="${escapeAttr(item.id)}">
      <div class="book-name">${escapeHtml(item.title || "Untitled section")}</div>
      <div class="section-meta">${count} line${count === 1 ? "" : "s"} &middot; ${label}</div>
      <div class="mini-progress" aria-hidden="true"><span style="width: ${progress.percent}%"></span></div>
    </button>
  `;
}

function sectionOption(item, selected) {
  const isSelected = item.id === selected?.id ? "selected" : "";
  return `<option value="${escapeAttr(item.id)}" ${isSelected}>${escapeHtml(item.title || "Untitled section")}</option>`;
}

function segment(view, label) {
  const active = state.view === view ? "active" : "";
  return `<button class="segment-button ${active}" data-view="${view}" role="tab">${label}</button>`;
}

function renderReader(book, section, line) {
  if (!book || !section) {
    return `
      <section class="reader-main">
        <div class="empty-state">
          <strong>No book loaded.</strong>
          <span>${escapeHtml(state.library.books.length ? "Select a section to begin." : state.jsonFile.message)}</span>
          <button class="button primary" data-view="data">Open Data</button>
        </div>
      </section>
    `;
  }

  const lines = section.lines || [];
  const sectionProgress = getSectionProgress(section);
  const bookProgress = getBookProgress(book);
  return `
    <div class="reader-grid">
      <section class="reader-main">
        <div class="reader-hero">
          <p class="eyebrow">${escapeHtml(book.author || "Unknown author")} &middot; ${escapeHtml(book.label || "")}</p>
          <h2 class="reader-title">${escapeHtml(book.title || "Untitled book")} - ${escapeHtml(section.title || "Untitled section")}</h2>
          <p class="reader-subtitle">${escapeHtml(section.summary || "No summary yet.")}</p>
          <div class="progress-overview">
            ${progressCard("Section", sectionProgress)}
            ${progressCard("Book", bookProgress)}
          </div>
          <div class="progress-actions">
            <button class="button ghost" data-action="reset-line-progress">Reset Line</button>
            <button class="button ghost" data-action="reset-section-progress">Reset Section</button>
            <button class="button ghost" data-action="reset-book-progress">Reset Book</button>
          </div>
          <div class="summary-strip">
            <div class="summary-item">
              <strong>Main idea</strong>
              <span>${escapeHtml(section.mainIdea || "Add the section's central idea.")}</span>
            </div>
            <div class="summary-item">
              <strong>Modern takeaway</strong>
              <span>${escapeHtml(section.modernTakeaway || "Add a practical takeaway.")}</span>
            </div>
          </div>
        </div>
        <div class="line-list">
          ${
            lines.length
              ? `${lines.map((item) => renderLineRow(item)).join("")}${renderSectionFooter(book, section)}`
              : `<div class="empty-state">Add a line in Edit or paste JSON in Data.</div>`
          }
        </div>
      </section>
      ${renderDetailsPane(line)}
    </div>
  `;
}

function progressCard(label, progress) {
  return `
    <div class="progress-card">
      <div class="progress-card-top">
        <span>${escapeHtml(label)}</span>
        <strong>${progress.percent}%</strong>
      </div>
      <div class="progress-bar" aria-hidden="true"><span style="width: ${progress.percent}%"></span></div>
      <p>${progress.read}/${progress.total} line${progress.total === 1 ? "" : "s"} read</p>
    </div>
  `;
}

function renderLineRow(line) {
  const active = line.id === state.selectedLineId ? "active" : "";
  const read = isLineRead(line);
  return `
    <button class="line-row ${active} ${read ? "read" : ""}" data-line-id="${escapeAttr(line.id)}">
      <div class="line-number">
        <span>Line ${escapeHtml(String(line.number || ""))}</span>
        <small>${read ? "Read" : "Open"}</small>
      </div>
      <div class="line-copy">
        <p class="line-original">${highlightText(line.original || "", line.difficultWords || [])}</p>
        <p class="line-simple">${escapeHtml(line.simpleEnglish || "")}</p>
      </div>
    </button>
  `;
}

function renderSectionFooter(book, section) {
  const progress = getSectionProgress(section);
  const nextSection = getNextSection(book, section.id);
  const label = nextSection ? "Next Section" : "Finish Book";
  const helper = progress.done
    ? "This section is complete."
    : `${progress.read}/${progress.total} lines read. Continue when you are ready.`;

  return `
    <div class="section-footer">
      <div>
        <strong>${escapeHtml(helper)}</strong>
        <span>${nextSection ? `Up next: ${escapeHtml(nextSection.title || "Untitled section")}` : "No more sections in this book."}</span>
      </div>
      <button class="button primary" data-action="next-section">${label}</button>
    </div>
  `;
}

function renderFocusMode(book, section) {
  if (!book || !section) return "";
  const lines = section.lines || [];
  const panelLine = findLineById(state.focus.lineId || state.selectedLineId);
  const progress = getSectionProgress(section);

  return `
    <div class="focus-mode" role="dialog" aria-modal="true" aria-label="Focus reading mode">
      <div class="focus-topbar">
        <div class="focus-title">
          <p>${escapeHtml(book.author || "Unknown author")}</p>
          <h2>${escapeHtml(book.title || "Untitled book")} - ${escapeHtml(section.title || "Untitled section")}</h2>
          <div class="focus-mini-progress" aria-label="${progress.percent}% read">
            <span>${progress.read}/${progress.total} read</span>
            <i><b style="width: ${progress.percent}%"></b></i>
          </div>
        </div>
        <div class="focus-controls">
          ${state.focus.panel ? `<button class="button ghost" data-action="close-focus-panel">Hide Info</button>` : ""}
          <button class="button primary" data-action="close-focus-mode">Exit Focus</button>
        </div>
      </div>
      <div class="focus-layout ${state.focus.panel ? "with-panel" : ""}">
        <main class="focus-reader" aria-label="Original text only">
          ${
            lines.length
              ? lines.map((item) => renderFocusLine(item)).join("")
              : `<div class="focus-empty">No lines in this section yet.</div>`
          }
        </main>
        ${state.focus.panel && panelLine ? `<button class="focus-backdrop" aria-label="Hide information" data-action="close-focus-panel"></button>` : ""}
        ${state.focus.panel && panelLine ? renderFocusInfoPanel(panelLine) : ""}
      </div>
    </div>
  `;
}

function renderFocusLine(line) {
  const active = line.id === state.focus.lineId ? "active" : "";
  return `
    <article class="focus-line ${active}" data-focus-line-id="${escapeAttr(line.id)}" tabindex="0">
      <span class="focus-line-number">Line ${escapeHtml(String(line.number || ""))}</span>
      <p>${highlightFocusText(line.original || "", line.difficultWords || [], line.id)}</p>
    </article>
  `;
}

function renderFocusInfoPanel(line) {
  if (state.focus.panel === "word") {
    const word = (line.difficultWords || [])[Number(state.focus.wordIndex)];
    if (word) return renderFocusWordPanel(line, word);
  }

  return `
    <aside class="focus-panel">
      <div class="focus-panel-header">
        <div>
          <span>Line ${escapeHtml(String(line.number || ""))}</span>
          <h3>${escapeHtml(line.original || "Untitled line")}</h3>
        </div>
        <button class="icon-button" title="Hide information" data-action="close-focus-panel">x</button>
      </div>
      <div class="focus-panel-body">
        ${detailBlock("Simple English", line.simpleEnglish)}
        ${wordList(line.difficultWords || [])}
        ${detailBlock("What the writer is trying to prove", line.proof)}
        ${detailBlock("Modern example", line.modernExample)}
        ${detailBlock("Connection to the previous line", line.connection)}
        ${detailBlock("Applying the same thinking", line.application)}
        ${detailBlock("Check question", line.checkQuestion)}
      </div>
    </aside>
  `;
}

function renderFocusWordPanel(line, word) {
  return `
    <aside class="focus-panel compact">
      <div class="focus-panel-header">
        <div>
          <span>Line ${escapeHtml(String(line.number || ""))} difficult word</span>
          <h3>${escapeHtml(word.term || "Term")}</h3>
        </div>
        <button class="icon-button" title="Hide information" data-action="close-focus-panel">x</button>
      </div>
      <div class="focus-panel-body">
        <section class="focus-word-card">
          <strong>${escapeHtml(word.term || "Term")}</strong>
          <p>${escapeHtml(word.definition || "No definition added yet.")}</p>
        </section>
        ${detailBlock("Original line", line.original)}
      </div>
    </aside>
  `;
}

function renderDetailsPane(line) {
  if (!line) {
    return `<aside class="details-pane"><div class="details-empty">Select a line.</div></aside>`;
  }

  return `
    <aside class="details-pane">
      <div class="details-header">
        <div class="details-kicker">Line ${escapeHtml(String(line.number || ""))}</div>
        <h2 class="details-title">${escapeHtml(line.original || "Untitled line")}</h2>
      </div>
      <div class="details-body">
        ${detailBlock("Simple English", line.simpleEnglish)}
        ${wordList(line.difficultWords || [])}
        ${detailBlock("What the writer is trying to prove", line.proof)}
        ${detailBlock("Modern example", line.modernExample)}
        ${detailBlock("Connection to the previous line", line.connection)}
        ${detailBlock("Applying the same thinking", line.application)}
        ${detailBlock("Check question", line.checkQuestion)}
        ${noteBlock(line)}
      </div>
    </aside>
  `;
}

function detailBlock(title, value) {
  return `
    <section class="detail-block">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(value || "Not added yet.")}</p>
    </section>
  `;
}

function noteBlock(line) {
  return `
    <section class="detail-block note-block">
      <div class="note-head">
        <h3>My notes</h3>
        <span data-note-status>Saved</span>
      </div>
      <textarea class="notes-box" data-line-notes placeholder="Write your own note for this paragraph...">${escapeHtml(line.notes || "")}</textarea>
    </section>
  `;
}

function wordList(words) {
  return `
    <section class="detail-block">
      <h3>Difficult words</h3>
      <div class="word-list">
        ${
          words.length
            ? words
                .map(
                  (word) => `
                    <div class="word-item">
                      <strong>${escapeHtml(word.term || "Term")}</strong>
                      <span>${escapeHtml(word.definition || "")}</span>
                    </div>
                  `
                )
                .join("")
            : `<p>No difficult words added.</p>`
        }
      </div>
    </section>
  `;
}

function renderEditor(book, section, line) {
  if (!book || !section || !line) {
    return `
      <section class="editor-main">
        <div class="empty-state">
          <strong>No editable line loaded.</strong>
          <span>${escapeHtml(state.library.books.length ? "Select a section and line first." : state.jsonFile.message)}</span>
          <button class="button primary" data-view="data">Open Data</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="editor-main">
      <div class="editor-header">
        <div>
          <h2 class="panel-title">Editor</h2>
          <p class="panel-subtitle">${escapeHtml(book.title || "Untitled book")} &middot; ${escapeHtml(section.title || "Untitled section")}</p>
        </div>
        <div class="form-actions">
          <button class="button danger" data-action="delete-book">Delete Book</button>
          <button class="button ghost" data-action="delete-line">Delete Line</button>
          <button class="button primary" data-view="read">Done</button>
        </div>
      </div>

      <div class="editor-section">
        <h3 class="editor-section-title">Book</h3>
        <div class="form-grid">
          ${field("Title", "book.title", book.title || "")}
          ${field("Author", "book.author", book.author || "")}
          ${field("Label", "book.label", book.label || "")}
        </div>
      </div>

      <div class="editor-section">
        <h3 class="editor-section-title">Section</h3>
        <div class="form-grid">
          ${field("Section title", "section.title", section.title || "")}
          ${textarea("Summary", "section.summary", section.summary || "", "wide")}
          ${textarea("Main idea", "section.mainIdea", section.mainIdea || "", "wide")}
          ${textarea("Modern takeaway", "section.modernTakeaway", section.modernTakeaway || "", "wide")}
        </div>
      </div>

      <div class="editor-section">
        <h3 class="editor-section-title">Line</h3>
        <div class="form-grid">
          ${field("Line number", "line.number", String(line.number || ""), "number")}
          ${textarea("Original line", "line.original", line.original || "", "wide")}
          ${textarea("Simple English", "line.simpleEnglish", line.simpleEnglish || "", "wide")}
          ${textarea("What the writer is trying to prove", "line.proof", line.proof || "", "wide")}
          ${textarea("Modern example", "line.modernExample", line.modernExample || "", "wide")}
          ${textarea("Connection to the previous line", "line.connection", line.connection || "", "wide")}
          ${textarea("Applying the same thinking", "line.application", line.application || "", "wide")}
          ${textarea("Check question", "line.checkQuestion", line.checkQuestion || "", "wide")}
          ${textarea("My notes", "line.notes", line.notes || "", "wide")}
        </div>
      </div>

      <div class="editor-section">
        <div class="editor-header">
          <h3 class="editor-section-title">Difficult words</h3>
          <button class="button ghost" data-action="add-word">Add Word</button>
        </div>
        <div class="words-editor">
          ${
            (line.difficultWords || []).length
              ? line.difficultWords.map((word, index) => wordEditorRow(word, index)).join("")
              : `<p class="small-muted">No difficult words yet.</p>`
          }
        </div>
      </div>
    </section>
  `;
}

function field(label, bind, value, type = "text") {
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <input type="${escapeAttr(type)}" value="${escapeAttr(value)}" data-bind="${escapeAttr(bind)}" />
    </label>
  `;
}

function textarea(label, bind, value, extraClass = "") {
  return `
    <label class="field ${extraClass}">
      <span>${escapeHtml(label)}</span>
      <textarea data-bind="${escapeAttr(bind)}">${escapeHtml(value)}</textarea>
    </label>
  `;
}

function wordEditorRow(word, index) {
  return `
    <div class="word-editor-row" data-word-index="${index}">
      <input value="${escapeAttr(word.term || "")}" data-word-field="term" aria-label="Term" />
      <textarea data-word-field="definition" aria-label="Definition">${escapeHtml(word.definition || "")}</textarea>
      <button class="icon-button" title="Remove word" data-action="remove-word" data-word-index="${index}">x</button>
    </div>
  `;
}

function renderDataPanel() {
  const book = getSelectedBook();
  return `
    <section class="data-main">
      <div class="data-header">
        <div>
          <h2 class="panel-title">Data</h2>
          <p class="panel-subtitle">${book ? `Editing JSON for ${escapeHtml(book.title || "Untitled book")}.` : "No selected book yet."}</p>
          <p class="storage-status json-file-status">
            <span aria-hidden="true"></span>
            Database file: ${escapeHtml(state.jsonFile.message)}
          </p>
        </div>
        <div class="form-actions">
          <button class="button ghost" data-action="reset-all-progress">Reset Progress</button>
          <button class="button ghost" data-action="open-library-file">Load File</button>
          <button class="button ghost" data-action="save-json-file">Save JSON File</button>
          <button class="button ghost" data-action="load-library-json">Load Library</button>
          <button class="button primary" data-action="load-json">Load JSON</button>
        </div>
      </div>
      <div class="data-toolbar">
        <button class="button ghost" data-action="format-json">Format</button>
        <button class="button ghost" data-action="copy-json">Copy JSON</button>
        <button class="button ghost" data-action="copy-library">Copy Library</button>
        <button class="button ghost" data-action="save-json-file">Save JSON File</button>
        <button class="button ghost" data-action="copy-prompt">Copy AI Prompt</button>
      </div>
      <input class="file-input" type="file" accept=".json,application/json" data-library-file />
      <textarea class="json-box" data-json-box spellcheck="false">${escapeHtml(state.jsonText)}</textarea>
      <div class="schema-note">
        <div class="schema-pill"><strong>Book</strong>title, author, label, sections</div>
        <div class="schema-pill"><strong>Section</strong>title, summary, mainIdea, modernTakeaway, lines</div>
        <div class="schema-pill"><strong>Line</strong>original, simpleEnglish, difficultWords, proof, examples</div>
      </div>
    </section>
  `;
}

function attachEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      state.ui.menuOpen = false;
      state.ui.viewMenuOpen = false;
      if (state.view === "data") {
        syncJsonText();
      }
      render();
    });
  });

  attachBookButtonEvents();

  document.querySelectorAll("[data-section-id]").forEach((button) => {
    button.addEventListener("click", () => selectSection(button.dataset.sectionId));
  });

  const sectionSelect = document.querySelector("[data-select-section]");
  if (sectionSelect) {
    sectionSelect.addEventListener("change", () => selectSection(sectionSelect.value));
  }

  const bookSearch = document.querySelector("[data-book-search]");
  if (bookSearch) {
    bookSearch.addEventListener("input", () => {
      state.ui.bookSearch = bookSearch.value;
      updateBookListOnly();
    });
  }

  document.querySelectorAll("[data-line-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedLineId = button.dataset.lineId;
      markLineRead(button.dataset.lineId);
      render();
    });
  });

  document.querySelectorAll("[data-focus-word-index]").forEach((word) => {
    word.addEventListener("click", (event) => {
      event.stopPropagation();
      openFocusWord(word.dataset.focusLineId, Number(word.dataset.focusWordIndex));
    });
    word.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        openFocusWord(word.dataset.focusLineId, Number(word.dataset.focusWordIndex));
      }
    });
  });

  document.querySelectorAll(".focus-line[data-focus-line-id]").forEach((line) => {
    line.addEventListener("click", (event) => {
      if (event.target.closest("[data-focus-word-index]")) return;
      openFocusLine(line.dataset.focusLineId);
    });
    line.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openFocusLine(line.dataset.focusLineId);
      }
    });
  });

  document.querySelectorAll("[data-bind]").forEach((field) => {
    field.addEventListener("input", () => {
      updateBoundValue(field.dataset.bind, field.value);
      saveLibrary();
      syncJsonText();
    });
  });

  document.querySelectorAll("[data-word-field]").forEach((field) => {
    field.addEventListener("input", () => {
      const row = field.closest("[data-word-index]");
      updateWord(Number(row.dataset.wordIndex), field.dataset.wordField, field.value);
      saveLibrary();
      syncJsonText();
    });
  });

  const notesBox = document.querySelector("[data-line-notes]");
  if (notesBox) {
    notesBox.addEventListener("input", () => {
      const line = getSelectedLine();
      if (!line) return;
      line.notes = notesBox.value;
      saveLibrary();
      syncJsonText();
      const status = document.querySelector("[data-note-status]");
      if (status) status.textContent = "Saved";
    });
  }

  const jsonBox = document.querySelector("[data-json-box]");
  if (jsonBox) {
    jsonBox.addEventListener("input", () => {
      state.jsonText = jsonBox.value;
    });
  }

  const libraryFile = document.querySelector("[data-library-file]");
  if (libraryFile) {
    libraryFile.addEventListener("change", () => loadLibraryFromFileInput(libraryFile));
  }

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action, button));
  });
}

function attachBookButtonEvents(root = document) {
  root.querySelectorAll("[data-book-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectBook(button.dataset.bookId);
      render();
    });
  });
}

function updateBookListOnly() {
  const list = document.querySelector("[data-book-list]");
  if (!list) return;
  const filteredBooks = filterBooks(state.library.books);
  list.innerHTML = renderBookList(filteredBooks, state.library.books.length);
  attachBookButtonEvents(list);
}

function selectSection(sectionId) {
  state.selectedSectionId = sectionId;
  const section = getSelectedSection();
  state.selectedLineId = section?.lines?.[0]?.id || "";
  render();
}

function handleAction(action, button) {
  switch (action) {
    case "toggle-view-menu":
      state.ui.viewMenuOpen = !state.ui.viewMenuOpen;
      state.ui.menuOpen = false;
      render();
      break;
    case "toggle-controls":
      state.ui.controlsOpen = !state.ui.controlsOpen;
      render();
      break;
    case "toggle-sections":
      state.ui.sectionsOpen = !state.ui.sectionsOpen;
      render();
      break;
    case "toggle-utility-menu":
      state.ui.menuOpen = !state.ui.menuOpen;
      state.ui.viewMenuOpen = false;
      render();
      break;
    case "toggle-theme":
      toggleTheme();
      break;
    case "open-focus-mode":
      state.ui.menuOpen = false;
      openFocusMode();
      break;
    case "close-focus-mode":
      closeFocusMode();
      break;
    case "close-focus-panel":
      closeFocusPanel();
      break;
    case "add-book":
      addBook();
      break;
    case "add-section":
      addSection();
      break;
    case "add-line":
      addLine();
      break;
    case "next-section":
      goToNextSection();
      break;
    case "reset-line-progress":
      resetLineProgress();
      break;
    case "reset-section-progress":
      resetSectionProgress();
      break;
    case "reset-book-progress":
      resetBookProgress();
      break;
    case "reset-all-progress":
      resetAllProgress();
      break;
    case "delete-book":
      deleteBook();
      break;
    case "delete-line":
      deleteLine();
      break;
    case "add-word":
      addWord();
      break;
    case "remove-word":
      removeWord(Number(button.dataset.wordIndex));
      break;
    case "copy-json":
      state.ui.menuOpen = false;
      copyText(getSelectedBookJson(), "Book JSON copied");
      break;
    case "copy-library":
      state.ui.menuOpen = false;
      copyText(getFullLibraryJson(), "Library JSON copied");
      break;
    case "save-json-file":
      saveJsonFile();
      break;
    case "open-library-file":
      openLibraryFile();
      break;
    case "copy-prompt":
      state.ui.menuOpen = false;
      copyText(aiPrompt(), "AI prompt copied");
      break;
    case "load-json":
      loadJsonFromPanel();
      break;
    case "load-library-json":
      loadLibraryJsonFromPanel();
      break;
    case "format-json":
      formatJsonInPanel();
      break;
    default:
      break;
  }
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
  render();
}

function openFocusMode() {
  if (!getSelectedSection()) return;
  state.focus.open = true;
  state.focus.panel = "";
  state.focus.lineId = "";
  state.focus.wordIndex = null;
  enterBrowserFullscreen();
  render();
}

function closeFocusMode() {
  state.focus.open = false;
  state.focus.panel = "";
  state.focus.lineId = "";
  state.focus.wordIndex = null;
  exitBrowserFullscreen();
  render();
}

function closeFocusPanel() {
  state.focus.panel = "";
  state.focus.lineId = "";
  state.focus.wordIndex = null;
  render();
}

function openFocusLine(lineId) {
  if (!lineId) return;
  state.selectedLineId = lineId;
  state.focus.lineId = lineId;
  state.focus.panel = "line";
  state.focus.wordIndex = null;
  markLineRead(lineId);
  render();
}

function openFocusWord(lineId, wordIndex) {
  if (!lineId) return;
  state.selectedLineId = lineId;
  state.focus.lineId = lineId;
  state.focus.panel = "word";
  state.focus.wordIndex = wordIndex;
  markLineRead(lineId);
  render();
}

function enterBrowserFullscreen() {
  const root = document.documentElement;
  if (!root?.requestFullscreen || document.fullscreenElement) return;
  root.requestFullscreen().catch(() => {});
}

function exitBrowserFullscreen() {
  if (!document.exitFullscreen || !document.fullscreenElement) return;
  document.exitFullscreen().catch(() => {});
}

function addBook() {
  const id = makeId("book");
  const sectionId = makeId("section");
  const lineId = makeId("line");
  const book = {
    id,
    title: "Untitled Book",
    author: "Unknown Author",
    label: "",
    sections: [
      {
        id: sectionId,
        title: "New Section",
        summary: "",
        mainIdea: "",
        modernTakeaway: "",
        completedAt: "",
        lines: [blankLine(lineId, 1)]
      }
    ]
  };
  state.library.books.push(book);
  state.selectedBookId = id;
  state.selectedSectionId = sectionId;
  state.selectedLineId = lineId;
  state.view = "edit";
  persistAndRender("Book added");
}

function addSection() {
  const book = getSelectedBook();
  if (!book) return;
  const sectionId = makeId("section");
  const lineId = makeId("line");
  const section = {
    id: sectionId,
    title: "New Section",
    summary: "",
    mainIdea: "",
    modernTakeaway: "",
    completedAt: "",
    lines: [blankLine(lineId, 1)]
  };
  book.sections = book.sections || [];
  book.sections.push(section);
  state.selectedSectionId = sectionId;
  state.selectedLineId = lineId;
  state.view = "edit";
  persistAndRender("Section added");
}

function addLine() {
  const section = getSelectedSection();
  if (!section) return;
  section.lines = section.lines || [];
  const nextNumber =
    Math.max(0, ...section.lines.map((line) => Number(line.number) || 0)) + 1;
  const line = blankLine(makeId("line"), nextNumber);
  section.lines.push(line);
  section.completedAt = "";
  state.selectedLineId = line.id;
  state.view = "edit";
  persistAndRender("Line added");
}

function deleteBook() {
  const book = getSelectedBook();
  if (!book) return;
  const confirmed = window.confirm(
    `Delete "${book.title || "this book"}" and all of its sections?`
  );
  if (!confirmed) return;

  const currentIndex = state.library.books.findIndex(
    (item) => item.id === state.selectedBookId
  );
  state.library.books = state.library.books.filter(
    (item) => item.id !== state.selectedBookId
  );

  const nextBook =
    state.library.books[currentIndex] || state.library.books[currentIndex - 1];
  state.selectedBookId = nextBook?.id || "";
  const nextSection = nextBook?.sections?.[0];
  state.selectedSectionId = nextSection?.id || "";
  state.selectedLineId = nextSection?.lines?.[0]?.id || "";
  state.view = state.library.books.length ? "read" : "edit";
  persistAndRender("Book deleted");
}

function deleteLine() {
  const section = getSelectedSection();
  if (!section || !state.selectedLineId) return;
  if (section.lines.length <= 1) {
    showToast("Keep at least one line");
    return;
  }
  const confirmed = window.confirm("Delete this line?");
  if (!confirmed) return;
  section.lines = section.lines.filter((line) => line.id !== state.selectedLineId);
  state.selectedLineId = section.lines[0]?.id || "";
  updateSectionCompletion(section);
  persistAndRender("Line deleted");
}

function goToNextSection() {
  const book = getSelectedBook();
  const section = getSelectedSection();
  if (!book || !section) return;

  completeSection(section);
  const nextSection = getNextSection(book, section.id);
  if (nextSection) {
    state.selectedSectionId = nextSection.id;
    state.selectedLineId = nextSection.lines?.[0]?.id || "";
    state.view = "read";
    persistAndRender("Moved to next section");
    return;
  }

  persistAndRender("Book complete");
}

function resetLineProgress() {
  const section = getSelectedSection();
  const line = getSelectedLine();
  if (!section || !line) return;
  clearLineProgress(line);
  updateSectionCompletion(section);
  persistAndRender("Line progress reset");
}

function resetSectionProgress() {
  const section = getSelectedSection();
  if (!section) return;
  const confirmed = window.confirm("Reset reading progress for this section?");
  if (!confirmed) return;
  clearSectionProgress(section);
  persistAndRender("Section progress reset");
}

function resetBookProgress() {
  const book = getSelectedBook();
  if (!book) return;
  const confirmed = window.confirm(
    `Reset reading progress for "${book.title || "this book"}"?`
  );
  if (!confirmed) return;
  clearBookProgress(book);
  persistAndRender("Book progress reset");
}

function resetAllProgress() {
  const confirmed = window.confirm("Reset reading progress for every book?");
  if (!confirmed) return;
  state.library.books.forEach(clearBookProgress);
  persistAndRender("All progress reset");
}

function addWord() {
  const line = getSelectedLine();
  if (!line) return;
  line.difficultWords = line.difficultWords || [];
  line.difficultWords.push({ term: "", definition: "" });
  persistAndRender("Word added");
}

function removeWord(index) {
  const line = getSelectedLine();
  if (!line?.difficultWords) return;
  line.difficultWords.splice(index, 1);
  persistAndRender("Word removed");
}

function updateBoundValue(bind, value) {
  const [scope, key] = bind.split(".");
  const target =
    scope === "book"
      ? getSelectedBook()
      : scope === "section"
        ? getSelectedSection()
        : getSelectedLine();

  if (!target) return;
  target[key] = key === "number" ? Number(value) || "" : value;
}

function updateWord(index, key, value) {
  const line = getSelectedLine();
  if (!line) return;
  line.difficultWords = line.difficultWords || [];
  if (!line.difficultWords[index]) return;
  line.difficultWords[index][key] = value;
}

function loadJsonFromPanel() {
  try {
    const parsed = JSON.parse(state.jsonText);
    const normalized = normalizeLibrary(parsed);
    const nextBook = normalized.books[0];
    if (!nextBook) {
      showToast("JSON needs a book");
      return;
    }

    const selectedIndex = state.library.books.findIndex(
      (book) => book.id === state.selectedBookId
    );
    if (selectedIndex >= 0) {
      state.library.books[selectedIndex] = nextBook;
    } else {
      state.library.books = [nextBook];
    }

    saveLibrary();
    selectBook(nextBook.id);
    syncJsonText();
    state.view = "read";
    showToast("Book JSON loaded");
    render();
  } catch (error) {
    showToast("JSON needs a small fix");
  }
}

function loadLibraryJsonFromPanel() {
  replaceLibraryFromJsonText(state.jsonText, "Library JSON loaded");
}

async function openLibraryFile() {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: "REED library JSON",
            accept: { "application/json": [".json"] }
          }
        ]
      });
      if (!handle) return;
      await loadLibraryFromFileHandle(handle);
      return;
    } catch (error) {
      if (error?.name === "AbortError") {
        showToast("File open canceled");
        return;
      }
      console.warn(error);
    }
  }

  document.querySelector("[data-library-file]")?.click();
}

async function loadLibraryFromFileHandle(handle) {
  try {
    const file = await handle.getFile();
    const text = await file.text();
    const loaded = replaceLibraryFromJsonText(text, `${file.name || "library.json"} loaded`);
    if (!loaded) return;
    state.jsonFile.handle = handle;
    state.jsonFile.name = file.name || PERMANENT_LIBRARY_FILE;
    state.jsonFile.message = `${state.jsonFile.name} attached`;
    render();
  } catch (error) {
    console.warn(error);
    showToast("Could not open JSON file");
  }
}

async function loadLibraryFromFileInput(input) {
  const file = input.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const loaded = replaceLibraryFromJsonText(text, `${file.name || "library.json"} loaded`);
    if (loaded) {
      state.jsonFile.name = file.name || PERMANENT_LIBRARY_FILE;
      state.jsonFile.message = `${state.jsonFile.name} loaded`;
    }
  } catch (error) {
    console.warn(error);
    showToast("Could not open JSON file");
  } finally {
    input.value = "";
  }
}

function replaceLibraryFromJsonText(text, message) {
  try {
    const parsed = JSON.parse(text);
    const normalized = normalizeLibrary(parsed);
    if (!normalized.books.length) {
      showToast("JSON needs books");
      return false;
    }

    const confirmed = window.confirm("Replace the whole REED library with this JSON?");
    if (!confirmed) return false;

    state.library = normalized;
    saveLibrary();
    initialiseSelection();
    state.view = "read";
    showToast(message);
    render();
    return true;
  } catch (error) {
    showToast("JSON needs a small fix");
    return false;
  }
}

async function saveJsonFile() {
  const snapshot = clone(state.library);
  if (await saveJsonFileDirectly(snapshot)) return;
  downloadLibraryJson(snapshot);
  state.jsonFile.message = `${PERMANENT_LIBRARY_FILE} downloaded`;
  showToast("library.json downloaded");
  render();
}

async function saveJsonFileDirectly(snapshot) {
  if (!state.jsonFile.handle && !window.showSaveFilePicker) return false;

  try {
    const handle =
      state.jsonFile.handle ||
      (await window.showSaveFilePicker({
        suggestedName: PERMANENT_LIBRARY_FILE,
        types: [
          {
            description: "REED library JSON",
            accept: { "application/json": [".json"] }
          }
        ]
      }));
    if (!handle) return false;
    state.jsonFile.handle = handle;
    state.jsonFile.name = handle.name || PERMANENT_LIBRARY_FILE;
    await writeJsonFileHandle(handle, snapshot);
    state.jsonFile.message = `${state.jsonFile.name} saved`;
    showToast("library.json saved");
    render();
    return true;
  } catch (error) {
    if (error?.name === "AbortError") {
      showToast("Save canceled");
      return true;
    }
    console.warn(error);
    return false;
  }
}

async function writeJsonFileHandle(handle, library, silent = false) {
  try {
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(library, null, 2));
    await writable.close();
    state.jsonFile.name = handle.name || PERMANENT_LIBRARY_FILE;
    state.jsonFile.message = `${state.jsonFile.name} auto-saved`;
  } catch (error) {
    console.warn(error);
    state.jsonFile.message = "JSON file save failed";
    if (!silent) showToast("Could not save JSON file");
  }
}

function downloadLibraryJson(library) {
  const blob = new Blob([JSON.stringify(library, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = PERMANENT_LIBRARY_FILE;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatJsonInPanel() {
  try {
    state.jsonText = JSON.stringify(JSON.parse(state.jsonText), null, 2);
    render();
    showToast("JSON formatted");
  } catch (error) {
    showToast("JSON needs a small fix");
  }
}

function blankLine(id, number) {
  return {
    id,
    number,
    original: "",
    simpleEnglish: "",
    difficultWords: [],
    proof: "",
    modernExample: "",
    connection: "",
    application: "",
    checkQuestion: "",
    notes: "",
    readAt: ""
  };
}

function normalizeLibrary(input) {
  const rawBooks = readValue(input, ["books", "library"]);
  const singleBook = readValue(input, ["book"]);
  const raw = Array.isArray(rawBooks)
    ? { version: 1, books: rawBooks }
    : singleBook && typeof singleBook === "object"
      ? { version: 1, books: [singleBook] }
      : readValue(input, ["title", "bookTitle", "name"])
      ? { version: 1, books: [input] }
      : clone(emptyLibrary);

  const books = raw.books.map((book, bookIndex) => ({
    id: readValue(book, ["id"]) || makeId(`book-${bookIndex + 1}`),
    title: readValue(book, ["title", "bookTitle", "name"]) || "Untitled Book",
    author: readValue(book, ["author", "writer"]) || "Unknown Author",
    label: readValue(book, ["label", "book", "volume"]) || "",
    sections: normalizeArray(readValue(book, ["sections", "chapters", "parts"])).map((section, sectionIndex) => ({
      id: readValue(section, ["id"]) || makeId(`section-${sectionIndex + 1}`),
      title: readValue(section, ["title", "sectionTitle", "name"]) || "Untitled Section",
      summary: readValue(section, ["summary", "sectionSummary"]) || "",
      mainIdea: readValue(section, ["mainIdea", "main idea", "main_idea"]) || "",
      modernTakeaway: readValue(section, ["modernTakeaway", "modern takeaway", "modern_takeaway", "takeaway"]) || "",
      completedAt: readValue(section, ["completedAt", "completed_at"]) || "",
      lines: normalizeArray(readValue(section, ["lines", "paragraphs", "sentences"])).map((line, lineIndex) => ({
        id: readValue(line, ["id"]) || makeId(`line-${lineIndex + 1}`),
        number: readValue(line, ["number", "lineNumber", "line number", "line"]) || lineIndex + 1,
        original: readValue(line, ["original", "originalLine", "original line", "text"]) || "",
        simpleEnglish: readValue(line, ["simpleEnglish", "simple English", "simple_english", "rewrite", "plainEnglish"]) || "",
        difficultWords: normalizeDifficultWords(readValue(line, ["difficultWords", "difficult words", "difficult_words", "terms", "termsAndDefinitions", "terms and definitions", "vocabulary", "definitions", "wordDefinitions"])),
        proof: readValue(line, ["proof", "tryingToProve", "trying to prove", "whatAuthorIsTryingToProve", "what the author is trying to prove", "argument"]) || "",
        modernExample: readValue(line, ["modernExample", "modern example", "modern_example", "example"]) || "",
        connection: readValue(line, ["connection", "connectionToPreviousLine", "connection to the previous line", "previousConnection"]) || "",
        application: readValue(line, ["application", "apply", "applying", "otherWays", "other ways"]) || "",
        checkQuestion: readValue(line, ["checkQuestion", "check question", "check_question", "question"]) || "",
        notes: readValue(line, ["notes", "note"]) || "",
        readAt: readValue(line, ["readAt", "read_at"]) || ""
      }))
    }))
  }));

  if (!books.length) return { version: 1, books: [] };
  books.forEach((book) => {
    if (!book.sections.length) {
      const sectionId = makeId("section");
      book.sections.push({
        id: sectionId,
        title: "New Section",
        summary: "",
        mainIdea: "",
        modernTakeaway: "",
        completedAt: "",
        lines: [blankLine(makeId("line"), 1)]
      });
    }
    book.sections.forEach((section) => {
      if (!section.lines.length) {
        section.lines.push(blankLine(makeId("line"), 1));
      }
    });
  });

  return { version: 1, books };
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}

function normalizeDifficultWords(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => normalizeDifficultWordItem(item))
      .filter((word) => word.term || word.definition);
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .flatMap(([term, definition]) => normalizeDifficultWordEntry(term, definition))
      .filter((word) => word.term || word.definition);
  }

  if (typeof value === "string") {
    return value
      .split(/\n|;/)
      .flatMap((item) => normalizeDifficultWordItem(item.trim()))
      .filter((word) => word.term || word.definition);
  }

  return [];
}

function normalizeDifficultWordItem(item) {
  if (!item) return [];

  if (typeof item === "string") {
    const separatorIndex = item.search(/[:\-\u2013]/);
    if (separatorIndex > 0) {
      return [
        {
          term: item.slice(0, separatorIndex).trim(),
          definition: item.slice(separatorIndex + 1).trim()
        }
      ];
    }
    return [{ term: item.trim(), definition: "" }];
  }

  if (typeof item !== "object") return [];

  const directTerm = readValue(item, [
    "term",
    "word",
    "phrase",
    "difficultWord",
    "difficult word",
    "vocabulary",
    "name",
    "title"
  ]);
  const directDefinition = readValue(item, [
    "definition",
    "definitions",
    "meaning",
    "explanation",
    "simpleMeaning",
    "simple meaning",
    "description",
    "value"
  ]);

  if (directTerm || directDefinition) {
    return [
      {
        term: directTerm || "",
        definition: stringifyWordValue(directDefinition)
      }
    ];
  }

  return Object.entries(item).flatMap(([term, definition]) =>
    normalizeDifficultWordEntry(term, definition)
  );
}

function normalizeDifficultWordEntry(term, definition) {
  if (definition && typeof definition === "object") {
    return normalizeDifficultWordItem({ term, ...definition });
  }

  return [
    {
      term: String(term || "").trim(),
      definition: stringifyWordValue(definition)
    }
  ];
}

function stringifyWordValue(value) {
  if (Array.isArray(value)) return value.map(stringifyWordValue).filter(Boolean).join("; ");
  if (value && typeof value === "object") {
    const nested = readValue(value, ["definition", "meaning", "explanation", "description"]);
    if (nested) return stringifyWordValue(nested);
    return JSON.stringify(value);
  }
  return String(value || "").trim();
}

function readValue(source, names) {
  if (!source || typeof source !== "object") return "";

  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(source, name)) return source[name];
  }

  const entries = Object.entries(source);
  for (const name of names) {
    const wanted = normalizeKey(name);
    const match = entries.find(([key]) => normalizeKey(key) === wanted);
    if (match) return match[1];
  }

  return "";
}

function normalizeKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getSelectedBook() {
  return state.library.books.find((book) => book.id === state.selectedBookId);
}

function getSelectedSection() {
  const book = getSelectedBook();
  return book?.sections?.find((section) => section.id === state.selectedSectionId);
}

function getSelectedLine() {
  const section = getSelectedSection();
  return section?.lines?.find((line) => line.id === state.selectedLineId);
}

function findLineById(lineId) {
  for (const book of state.library.books || []) {
    for (const section of book.sections || []) {
      const line = (section.lines || []).find((item) => item.id === lineId);
      if (line) return line;
    }
  }
  return null;
}

function getBookProgress(book) {
  const lines = (book?.sections || []).flatMap((section) => section.lines || []);
  const total = lines.length;
  const read = lines.filter(isLineRead).length;
  return {
    total,
    read,
    percent: total ? Math.round((read / total) * 100) : 0,
    done: total > 0 && read === total
  };
}

function getSectionProgress(section) {
  const lines = section?.lines || [];
  const total = lines.length;
  const read = lines.filter(isLineRead).length;
  return {
    total,
    read,
    percent: total ? Math.round((read / total) * 100) : 0,
    done: total > 0 && read === total
  };
}

function isLineRead(line) {
  return Boolean(line?.readAt);
}

function markLineRead(lineId) {
  const section = getSelectedSection();
  const line = section?.lines?.find((item) => item.id === lineId);
  if (!line || line.readAt) return;
  line.readAt = new Date().toISOString();
  updateSectionCompletion(section);
  saveLibrary();
  syncJsonText();
}

function completeSection(section) {
  if (!section) return;
  const now = new Date().toISOString();
  (section.lines || []).forEach((line) => {
    if (!line.readAt) line.readAt = now;
  });
  section.completedAt = now;
}

function clearLineProgress(line) {
  if (!line) return;
  line.readAt = "";
}

function clearSectionProgress(section) {
  if (!section) return;
  (section.lines || []).forEach(clearLineProgress);
  section.completedAt = "";
}

function clearBookProgress(book) {
  (book?.sections || []).forEach(clearSectionProgress);
}

function updateSectionCompletion(section) {
  if (!section) return;
  const progress = getSectionProgress(section);
  if (progress.done) {
    section.completedAt = section.completedAt || new Date().toISOString();
    return;
  }
  section.completedAt = "";
}

function getNextSection(book, sectionId) {
  const sections = book?.sections || [];
  const index = sections.findIndex((section) => section.id === sectionId);
  return index >= 0 ? sections[index + 1] : null;
}

function highlightFocusText(text, words, lineId) {
  const usableWords = words
    .map((word, index) => ({ ...word, index }))
    .filter((word) => word.term && text.toLowerCase().includes(word.term.toLowerCase()))
    .sort((a, b) => b.term.length - a.term.length);

  if (!usableWords.length) return escapeHtml(text);

  const indexes = new Map(
    usableWords.map((word) => [word.term.toLowerCase(), word.index])
  );
  const definitions = new Map(
    usableWords.map((word) => [word.term.toLowerCase(), word.definition || ""])
  );
  const pattern = usableWords.map((word) => escapeRegExp(word.term)).join("|");
  const regex = new RegExp(pattern, "gi");
  let result = "";
  let lastIndex = 0;

  text.replace(regex, (match, offset) => {
    result += escapeHtml(text.slice(lastIndex, offset));
    const wordIndex = indexes.get(match.toLowerCase());
    const definition = definitions.get(match.toLowerCase()) || "";
    result += `<span class="focus-word" role="button" tabindex="0" data-tooltip="${escapeAttr(definition)}" data-focus-line-id="${escapeAttr(lineId)}" data-focus-word-index="${escapeAttr(String(wordIndex))}">${escapeHtml(match)}</span>`;
    lastIndex = offset + match.length;
    return match;
  });

  result += escapeHtml(text.slice(lastIndex));
  return result;
}

function highlightText(text, words) {
  const usableWords = words
    .filter((word) => word.term && text.toLowerCase().includes(word.term.toLowerCase()))
    .sort((a, b) => b.term.length - a.term.length);

  if (!usableWords.length) return escapeHtml(text);

  const definitions = new Map(
    usableWords.map((word) => [word.term.toLowerCase(), word.definition || ""])
  );
  const pattern = usableWords.map((word) => escapeRegExp(word.term)).join("|");
  const regex = new RegExp(pattern, "gi");
  let result = "";
  let lastIndex = 0;

  text.replace(regex, (match, offset) => {
    result += escapeHtml(text.slice(lastIndex, offset));
    const definition = definitions.get(match.toLowerCase()) || "";
    result += `<span class="difficult-word" tabindex="0" data-tooltip="${escapeAttr(definition)}">${escapeHtml(match)}</span>`;
    lastIndex = offset + match.length;
    return match;
  });

  result += escapeHtml(text.slice(lastIndex));
  return result;
}

function aiPrompt() {
  return `Convert the passage I give you into JSON for my reading app. Return only valid JSON. Do not use markdown, headings outside JSON, comments, or explanations outside JSON.

The app's Data tab edits one selected book at a time, so return one book object only. Do not wrap it in "version", "books", or "library".

My old explanation method:
- Explain each line as if I know nothing.
- First, rewrite it in simple English.
- Then define every difficult word.
- Then explain what the writer is trying to prove.
- Then give a modern example.
- Then tell me how this line connects to the previous line.
- Then explain how the same thinking can be applied in other ways.
- Finally, ask me one simple question to check if I understood.

Important:
- Go through the passage line by line.
- If I upload a paragraph, split it into complete logical lines or sentences.
- Do not skip any line, sentence, clause, or important idea.
- Keep the original wording in the "original" field.
- Make the explanations simple and beginner-friendly.
- Put every difficult word in "difficultWords".
- Leave "notes" as an empty string because notes are for the reader.
- Do not include "readAt" or "completedAt"; the app manages reading progress itself.

Use this exact shape:
{
  "title": "Book title",
  "author": "Author",
  "label": "Book label or volume",
  "sections": [
    {
      "title": "Section title",
      "summary": "Section summary",
      "mainIdea": "Main idea",
      "modernTakeaway": "Modern takeaway",
      "lines": [
        {
          "number": 1,
          "original": "Original line",
          "simpleEnglish": "Simple English explanation",
          "difficultWords": [
            { "term": "Difficult word", "definition": "Short explanation" }
          ],
          "proof": "What the writer is trying to prove",
          "modernExample": "Modern example",
          "connection": "Connection to the previous line",
          "application": "Applying the same thinking in other ways",
          "checkQuestion": "Check question",
          "notes": ""
        }
      ]
    }
  ]
}

Before returning JSON, silently check that every part of the passage is represented in order.`;
}

function copyText(text, message) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(
      () => showToast(message),
      () => fallbackCopy(text, message)
    );
  } else {
    fallbackCopy(text, message);
  }
}

function fallbackCopy(text, message) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  showToast(message);
}

function persistAndRender(message) {
  saveLibrary();
  syncJsonText();
  showToast(message);
  render();
}

function showToast(message) {
  state.toast = message;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    state.toast = "";
    render();
  }, 1800);
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

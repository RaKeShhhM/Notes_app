// grab the "Add" button from the page (button that creates a new note)
const addBtn = document.querySelector('#addBtn');

// grab the main container where note cards will be added
const main = document.querySelector('#main');

// grab the search input (used to filter notes)
const searchInput = document.querySelector('#search');

// grab the dark mode toggle button
const darkToggle = document.querySelector('#darkToggle');

// key name used to store notes in localStorage
const STORAGE_KEY = 'notesApp:v2';

// key name used to store theme (dark/light) in localStorage
const THEME_KEY = 'notesApp:theme';

// array of preset background colors for notes (palette)
const PALETTE = ['#FFFAE6','#E6FFFA','#FCE4EC','#FFF0E6','#E8F0FF','#F3E8FF'];

// in-memory array that holds all note objects while app runs
let notes = [];

// temporary variable used during drag & drop operations to hold the dragged element
let dragSrcEl = null;

/* Immediately-run function to load saved theme (dark or light)
   from localStorage and update the page UI accordingly. */
(function loadTheme(){
    // read saved theme; default to 'light' if nothing saved
    const t = localStorage.getItem(THEME_KEY) || 'light';
    // if theme is 'dark', add the CSS class 'dark' to <body>
    if(t === 'dark') document.body.classList.add('dark');
    // set the icon inside the dark toggle button: sun for dark, moon for light
    darkToggle.querySelector('i').className = t==='dark' ? 'fas fa-sun' : 'fas fa-moon';
})();

/* Add click handler for the dark mode toggle button:
   - toggles the 'dark' class on body
   - stores the choice in localStorage
   - updates the icon */
darkToggle.addEventListener('click', ()=>{
    // toggle returns true if 'dark' class was added, false if removed
    const isDark = document.body.classList.toggle('dark');
    // persist the new theme choice
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    // update icon to reflect current state
    darkToggle.querySelector('i').className = isDark ? 'fas fa-sun' : 'fas fa-moon';
});

/* persist(): small helper to save the notes array to localStorage.
   We JSON.stringify notes because localStorage stores strings only. */
function persist(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); }

/* createNoteObj(): helper that returns a new note object.
   It accepts an object with optional properties and fills defaults. */
function createNoteObj({title='',content='',color=PALETTE[0],pinned=false,createdAt=null,id=null} = {}){
    return {
    // unique id: use timestamp + small random to reduce collisions
    id: id || (Date.now().toString(36)+Math.random().toString(36).slice(2,7)),
    // note title (string)
    title: title || '',
    // note content/body (string)
    content: content || '',
    // color chosen from palette
    color: color || PALETTE[0],
    // boolean pinned state
    pinned: !!pinned,
    // timestamp when note was created or provided
    createdAt: createdAt || Date.now()
    };
}

/* debounce(): utility to delay calling fn until ms milliseconds
   after the last call. Used to avoid saving on every keystroke. */
function debounce(fn,ms=400){ let t; return function(...args){ clearTimeout(t); t = setTimeout(()=> fn.apply(this,args), ms); }; }

/* render(): re-draw all notes in the #main container
   - clears the container, sorts notes (pinned first), filters by search,
     and appends note DOM elements created by renderNoteElement() */
function render(){
    // clear existing content
    main.innerHTML = '';
    // read search query (lowercased & trimmed)
    const q = (searchInput.value || '').toLowerCase().trim();
    // create a sorted copy: pinned notes first; within same pinned state, newest first
    const ordered = [...notes].sort((a,b)=>{ if(a.pinned===b.pinned) return b.createdAt - a.createdAt; return (a.pinned ? -1 : 1); });
    // iterate notes and render each, skipping ones that don't match search
    ordered.forEach(note => { if(q){ const hay = (note.title + ' ' + note.content).toLowerCase(); if(!hay.includes(q)) return; } main.appendChild(renderNoteElement(note)); })
}

/* isLightColor(hex):
   - convert a hex color to RGB and compute a luminance approximation
   - returns true if the color is very light (so we can choose a readable text color) */
function isLightColor(hex){
    // remove leading '#'
    const c = hex.replace('#','');
    // parse integer value
    const bigint = parseInt(c,16);
    // extract R, G, B
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    // relative luminance approximation (common formula)
    const L = 0.2126 * (r/255) + 0.7152 * (g/255) + 0.0722 * (b/255);
    // true if very light
    return L > 0.75; // threshold: very light
}

/* renderNoteElement(note):
   - builds and returns a DOM element (<article>) for a single note object
   - wires up UI behaviors for that note (save, delete, pin, palette, view toggle, drag/drop) */
function renderNoteElement(note){
    // create article element for note card
    const el = document.createElement('article');
    el.className = 'note';
    // allow html5 drag & drop
    el.setAttribute('draggable','true');
    // store note id on DOM for quick lookup
    el.dataset.id = note.id;
    // set background color
    el.style.background = note.color;

    // set readable text color based on background luminance
    const lightBg = isLightColor(note.color);
    // NOTE: original code sets '#111' for both branches; if you want white for dark bg set '#fff'
    el.style.color = lightBg ? '#111' : '#111';
    // inner HTML of the note: title textarea, tools, content, palette and date
    el.innerHTML = `
    <div class="meta">
        <textarea class="title" rows="1" placeholder="Title">${escapeHtml(note.title)}</textarea>
        <div class="tools">
        <button class="pin" title="Pin/Unpin"><i class="fas fa-thumbtack"></i></button>
        <button class="view" title="Toggle view/edit"><i class="fas fa-eye"></i></button>
        <button class="delete" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
    </div>
    <textarea class="content" rows="6" placeholder="Write something...">${escapeHtml(note.content)}</textarea>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div class="palette"></div>
        <div style="display:flex;gap:8px;align-items:center">
        <div class="date">${formatDate(note.createdAt)}</div>
        </div>
    </div>
    `;

    // grab interactive elements inside this note DOM
    const titleEl = el.querySelector('.title');
    const contentEl = el.querySelector('.content');
    const pinBtn = el.querySelector('.pin');
    const viewBtn = el.querySelector('.view');
    const delBtn = el.querySelector('.delete');
    const paletteDiv = el.querySelector('.palette');

    // if note is pinned, visually mark pin button active
    if(note.pinned) pinBtn.classList.add('active');

    // isView controls view/edit state for this single note
    let isView = false;
    // updateViewState toggles readonly attributes and button tooltip/icon state
    function updateViewState(){
    if(isView){ 
        // set both textareas to readonly (view-only)
        titleEl.setAttribute('readonly','');
        contentEl.setAttribute('readonly','');
        viewBtn.classList.add('active');
        viewBtn.title = 'Switch to edit mode';
    }
    else { 
        // allow editing
        titleEl.removeAttribute('readonly');
        contentEl.removeAttribute('readonly');
        viewBtn.classList.remove('active');
        viewBtn.title = 'Switch to view mode';
    }
    }

    // apply initial view/edit state (false by default)
    updateViewState();

    // build color palette buttons inside the note
    PALETTE.forEach(c=>{
    const sw = document.createElement('button'); // small color swatch button
    sw.className = 'sw';
    sw.style.background = c; // set swatch background
    sw.addEventListener('click', ()=>{
        // when user clicks a palette color:
        note.color = c;           // update note data
        el.style.background = c;  // update DOM
        // recompute readable text color on chosen palette
        const light = isLightColor(c);
        el.style.color = light ? '#111' : '#fff';
        persist(); // persist change immediately
    });
    // add the swatch into this note's palette area
    paletteDiv.appendChild(sw);
    });

    // pin button: toggle pinned state, save and re-render
    pinBtn.addEventListener('click', ()=>{ note.pinned = !note.pinned; pinBtn.classList.toggle('active'); persist(); render(); });

    // view button: toggle view/edit (no persist needed for this UI-only state)
    viewBtn.addEventListener('click', ()=>{ isView = !isView; updateViewState(); });

    // delete button: remove note from notes array -> save -> re-render
    delBtn.addEventListener('click', ()=>{ notes = notes.filter(n=> n.id !== note.id); persist(); render(); });

    // auto-save while typing: use the debounce helper so we don't persist on every keystroke
    const saveDebounced = debounce(()=>{ note.title = titleEl.value; note.content = contentEl.value; persist(); /* don't re-render here to avoid cursor jumps */ }, 600);

    // wire input events to the debounced saver
    titleEl.addEventListener('input', saveDebounced);
    contentEl.addEventListener('input', saveDebounced);

    // handle Enter key in title if you want to allow multi-line titles (optional)
    titleEl.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
        // optional: allow newline in title; currently nothing special is done
        // could preventDefault() or insert newline manually if desired
    }
    });

    // --- Drag & Drop handlers: enable reordering of notes ---

    // when dragging starts: remember source element and add dragging class
    el.addEventListener('dragstart', (e)=>{ dragSrcEl = el; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', note.id); } catch(e){} });

    // when dragging ends: remove dragging class, clear drag source, persist order, and re-render
    el.addEventListener('dragend', ()=>{ el.classList.remove('dragging'); dragSrcEl = null; persist(); render(); });

    // when an element is dragged over this note: prevent default to allow drop and show visual hint
    el.addEventListener('dragover', (e)=>{ e.preventDefault(); e.dataTransfer.dropEffect = 'move'; const target = e.currentTarget; const rect = target.getBoundingClientRect(); const after = (e.clientY - rect.top) > (rect.height/2); target.style.borderTop = after ? '' : '2px dashed rgba(0,0,0,0.12)'; target.style.borderBottom = after ? '2px dashed rgba(0,0,0,0.12)' : ''; });

    // when drag leaves, clear visual hint
    el.addEventListener('dragleave', (e)=>{ e.currentTarget.style.borderTop=''; e.currentTarget.style.borderBottom=''; });

    // when a dropped item is released on this note: compute new order and persist
    el.addEventListener('drop', (e)=>{ 
        e.preventDefault(); 
        const target = e.currentTarget; 
        target.style.borderTop=''; 
        target.style.borderBottom=''; 
        // try to get dragged id from dataTransfer or fallback to dragSrcEl
        const draggedId = e.dataTransfer.getData('text/plain') || (dragSrcEl && dragSrcEl.dataset.id); 
        if(!draggedId || draggedId === note.id) return; // ignore invalid drops
        // find indices in notes array
        const draggedIndex = notes.findIndex(n=>n.id===draggedId); 
        const targetIndex = notes.findIndex(n=>n.id===note.id); 
        if(draggedIndex<0 || targetIndex<0) return;
        const rect = target.getBoundingClientRect(); 
        const after = (e.clientY - rect.top) > (rect.height/2);
        // remove dragged element from old position
        const [draggedObj] = notes.splice(draggedIndex,1); 
        // compute insertion index depending on whether dragging forward/backward and if drop happened after middle
        const insertIndex = (draggedIndex < targetIndex) ? (after ? targetIndex : targetIndex) : (after ? targetIndex+1 : targetIndex);
        // insert dragged object at new index
        notes.splice(insertIndex,0,draggedObj); 
        // save and re-render to reflect new order
        persist(); render(); 
    });

    // set initial readable text color again (redundant but ensures correct color)
    const light = isLightColor(note.color);
    el.style.color = light ? '#111' : '#fff';

    // return the built DOM element to the caller so it can be appended into #main
    return el;
}

// small helper: escape HTML characters before inserting into textarea value
function escapeHtml(s){ if(!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// small helper: format timestamp into a human-friendly string
function formatDate(ts){ const d = new Date(ts); return d.toLocaleString(); }

// Add button handler: create a new note, add it to front of notes, save and render
addBtn.addEventListener('click', ()=>{
    const n = createNoteObj({title:'',content:'',color:PALETTE[0],pinned:false}); // new blank note
    notes.unshift(n); // put new note at start (top)
    persist(); // save
    render(); // re-render the UI
    // after a short delay, focus the new note's title so user can type immediately
    setTimeout(()=>{
        const item = document.querySelector(`[data-id="${n.id}"]`);
        if(item) item.querySelector('.title').focus();
    }, 100);
});

// wire search input: re-render on input (debounced)
searchInput.addEventListener('input', debounce(()=> render(), 200));

// load notes from localStorage when script runs for the first time
(function loadNotes(){
    try{
        // read saved array (or empty array)
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        // if it is an array, convert each saved object back to a proper note object
        if(Array.isArray(raw)) notes = raw.map(r => createNoteObj(r));
    }catch(e){
        // on parse error or other issue, start with empty notes
        notes = [];
    }
    // render whatever we loaded (possibly none)
    render();
})();

// expose a tiny debugging API on window so you can inspect notes from console
window._notesApp = {
    getAll: ()=>notes, // returns the notes array
    clear: ()=>{ notes = []; persist(); render(); } // clears notes
}

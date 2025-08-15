/* Fluuder OS desktop */
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

const desktop = $("#desktop");
const taskArea = $("#taskArea");
const clockEl = $("#clock");

let zCounter = 10;
let windows = new Map();
let tasks = new Map();

function formatTime(d=new Date()){
  return d.toLocaleString(undefined, { hour:"2-digit", minute:"2-digit", day:"2-digit", month:"short" });
}
function updateClock(){ clockEl.textContent = formatTime(); }
setInterval(updateClock, 30_000); updateClock();

// Theme handling
const THEME_KEY = "fluuder-theme";
const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);

function setTheme(name){
  document.documentElement.setAttribute("data-theme", name);
  localStorage.setItem(THEME_KEY, name);
}

// Launchers (desktop icons + start dock)
$$(".icon, .start-item").forEach(btn => {
  btn.addEventListener("dblclick", () => openApp(btn.dataset.app));
  btn.addEventListener("click", () => {
    if (btn.classList.contains("start-item")) openApp(btn.dataset.app);
  });
});

$("#shutdownBtn")?.addEventListener("click", () => {
  // Close all windows
  windows.forEach(win => win.remove());
  windows.clear();
  tasks.forEach(b => b.remove());
  tasks.clear();
});

function createWindow({ id, title, icon, content, width=640, height=440 }){
  if (windows.has(id)) { focusWindow(id); return windows.get(id); }
  const tpl = $("#windowTemplate");
  const win = tpl.content.firstElementChild.cloneNode(true);
  win.style.width = width + "px";
  win.style.height = height + "px";
  win.style.zIndex = ++zCounter;
  win.dataset.id = id;

  $(".title-text", win).textContent = title;
  $(".title-icon", win).src = icon;

  const contentEl = $(".content", win);
  contentEl.append(content);

  desktop.append(win);
  positionWindow(win);
  makeWindowInteractive(win);
  createTaskButton(id, title, icon);

  windows.set(id, win);
  return win;
}
function positionWindow(win){
  const offset = (windows.size % 6) * 24 + 60;
  win.style.left = offset + "px";
  win.style.top  = offset + "px";
}
function focusWindow(id){
  const win = windows.get(id); if (!win) return;
  win.style.zIndex = ++zCounter;
  $$(".task-button").forEach(b => b.classList.remove("active"));
  tasks.get(id)?.classList.add("active");
}
function makeWindowInteractive(win){
  win.addEventListener("mousedown", () => focusWindow(win.dataset.id));
  // Drag via titlebar
  const bar = $(".titlebar", win);
  let dragging=false, dx=0, dy=0;
  bar.addEventListener("mousedown", (e)=>{
    if (e.target.closest(".window-controls")) return;
    dragging=true; const rect = win.getBoundingClientRect();
    dx = e.clientX - rect.left; dy = e.clientY - rect.top; document.body.style.cursor="grabbing";
  });
  window.addEventListener("mousemove", (e)=>{
    if(!dragging) return;
    const boundW = window.innerWidth - 280; // leave dock
    win.style.left = Math.max(0, Math.min(boundW - 80, e.clientX - 280 - dx)) + "px";
    win.style.top  = Math.max(0, Math.min(window.innerHeight - 140, e.clientY - dy)) + "px";
  });
  window.addEventListener("mouseup", ()=>{ dragging=false; document.body.style.cursor=""; });

  // Resize
  const resizer = $(".resizer-se", win);
  let resizing=false, sx=0, sy=0, sw=0, sh=0;
  resizer.addEventListener("mousedown", (e)=>{
    resizing=true; sx=e.clientX; sy=e.clientY;
    const r = win.getBoundingClientRect(); sw=r.width; sh=r.height;
    document.body.style.cursor="nwse-resize";
  });
  window.addEventListener("mousemove", (e)=>{
    if(!resizing) return;
    const w = Math.max(360, sw + (e.clientX - sx));
    const h = Math.max(240, sh + (e.clientY - sy));
    win.style.width = w + "px"; win.style.height = h + "px";
  });
  window.addEventListener("mouseup", ()=>{ resizing=false; document.body.style.cursor=""; });

  // Controls
  $(".btn.close", win).addEventListener("click", () => closeWindow(win.dataset.id));
  $(".btn.min",   win).addEventListener("click", () => minimizeWindow(win.dataset.id));
  $(".btn.max",   win).addEventListener("click", () => toggleMaximize(win.dataset.id));
}
function createTaskButton(id, title, icon){
  const btn = document.createElement("button");
  btn.className = "task-button active";
  btn.innerHTML = `<img alt="" src="${icon}" width="16" height="16"> <span>${title}</span>`;
  btn.addEventListener("click", () => {
    const win = windows.get(id); if (!win) return;
    const hidden = win.style.display === "none";
    win.style.display = hidden ? "" : "none";
    if (!hidden) btn.classList.remove("active");
    else { btn.classList.add("active"); focusWindow(id); }
  });
  $$(".task-button").forEach(b => b.classList.remove("active"));
  taskArea.append(btn);
  tasks.set(id, btn);
}
function closeWindow(id){
  const win = windows.get(id); if (!win) return;
  win.remove(); windows.delete(id);
  tasks.get(id)?.remove(); tasks.delete(id);
}
function minimizeWindow(id){
  const win = windows.get(id); if (!win) return;
  win.style.display = "none"; tasks.get(id)?.classList.remove("active");
}
function toggleMaximize(id){
  const win = windows.get(id); if (!win) return;
  win.classList.toggle("maximized"); focusWindow(id);
}

// Apps
function appAbout(){
  const wrap = document.createElement("div");
  wrap.className = "content-inner";
  wrap.innerHTML = `
    <h3>About Fluuder OS</h3>
    <dl class="info-list">
      <dt>Edition</dt><dd>Web Desktop</dd>
      <dt>Version</dt><dd>1.1.0</dd>
      <dt>License</dt><dd>MIT</dd>
    </dl>
    <p class="small">Always-on Start panel and switchable themes. Not affiliated with Microsoft.</p>
  `;
  return wrap;
}
function appNotepad(){
  const wrap = document.createElement("div"); wrap.className="app-notepad";
  const toolbar = document.createElement("div"); toolbar.className="toolbar";
  const save = document.createElement("button"); save.textContent="Save";
  const load = document.createElement("button"); load.textContent="Load";
  const clear= document.createElement("button"); clear.textContent="Clear";
  toolbar.append(save, load, clear);
  const area = document.createElement("textarea");
  area.placeholder = "Start typing… (saved to your browser)";
  wrap.append(toolbar, area);
  const KEY = "fluuder-notepad"; area.value = localStorage.getItem(KEY) || "";
  save.addEventListener("click", ()=>localStorage.setItem(KEY, area.value));
  load.addEventListener("click", ()=>area.value = localStorage.getItem(KEY) || "");
  clear.addEventListener("click", ()=>{ area.value=""; localStorage.removeItem(KEY); });
  return wrap;
}
function appFiles(){
  const wrap = document.createElement("div"); wrap.className="content-inner";
  wrap.innerHTML = `
    <h3>Files</h3>
    <p class="small">Mock file explorer.</p>
    <ul>
      <li>Documents</li>
      <li>Pictures</li>
      <li>Music</li>
      <li>Downloads</li>
    </ul>
  `;
  return wrap;
}
function appRecycle(){
  const wrap = document.createElement("div"); wrap.className="content-inner";
  wrap.innerHTML = "<p class='small'>Recycle Bin is empty.</p>";
  return wrap;
}
function appBrowser(){
  const wrap = document.createElement("div"); wrap.style.display="flex"; wrap.style.flexDirection="column"; wrap.style.height="100%";
  const bar = document.createElement("div"); bar.className="browser-addr";
  const input = document.createElement("input"); input.type="url"; input.placeholder="https://example.org";
  const go = document.createElement("button"); go.textContent="Go";
  bar.append(input, go);
  const frame = document.createElement("iframe"); frame.className="browser-viewport"; frame.referrerPolicy="no-referrer";
  frame.sandbox = "allow-same-origin allow-scripts allow-forms allow-popups";
  frame.style.flex = "1";
  wrap.append(bar, frame);
  function nav(){ if(!input.value) return; frame.src = input.value; }
  input.addEventListener("keydown", e => { if(e.key==="Enter") nav(); });
  go.addEventListener("click", nav);
  return wrap;
}
function appThemes(){
  const wrap = document.createElement("div"); wrap.className="content-inner";
  wrap.innerHTML = `<h3>Themes</h3>
    <div class="theme-grid" id="themeGrid"></div>
    <hr style="opacity:.2;margin:12px 0">
    <p class="small">Your choice is saved to this browser.</p>`;
  const grid = wrap.querySelector("#themeGrid");
  const themes = [
    { key:"ocean", name:"Ocean", color:"#3ba3ff" },
    { key:"midnight", name:"Midnight", color:"#9b8cff" },
    { key:"sunset", name:"Sunset", color:"#ff8a3b" },
    { key:"mint", name:"Mint", color:"#34d399" },
  ];
  themes.forEach(t => {
    const el = document.createElement("button"); el.className="swatch";
    el.innerHTML = `<span class="chip" style="background:${t.color}"></span><span class="name">${t.name}</span>`;
    el.addEventListener("click", ()=> setTheme(t.key));
    grid.append(el);
  });
  return wrap;
}

const APP_DEFS = {
  files:   { title:"Files", icon:"assets/folder.svg",  content: appFiles },
  notepad: { title:"Notepad", icon:"assets/notepad.svg", content: appNotepad },
  browser: { title:"Web", icon:"assets/internet.svg", content: appBrowser },
  themes:  { title:"Themes", icon:"assets/paint.svg", content: appThemes },
  about:   { title:"About", icon:"assets/info.svg", content: appAbout },
  recycle: { title:"Recycle Bin", icon:"assets/recycle.svg", content: appRecycle },
};

function openApp(key){
  const def = APP_DEFS[key]; if (!def) return;
  const el = createWindow({
    id: key, title: def.title, icon: def.icon, content: def.content(),
  });
  focusWindow(key); return el;
}

// Auto-open Themes on first visit
window.addEventListener("load", () => {
  if (!sessionStorage.getItem("fluuder-welcomed")) {
    openApp("themes");
    sessionStorage.setItem("fluuder-welcomed","1");
  }
});

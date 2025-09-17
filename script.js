// Task Manager App - Vanilla JS

/**
 * Data model
 * Task: { id: string, title: string, completed: boolean, createdAt: number, dueDate: string|null }
 */
(function(){
  const dom = {
    root: document.documentElement,
    form: document.getElementById('add-task-form'),
    input: document.getElementById('task-input'),
    dueInput: document.getElementById('due-date-input'),
    list: document.getElementById('task-list'),
    empty: document.getElementById('empty-state'),
    search: document.getElementById('search-input'),
    statusFilter: document.getElementById('status-filter'),
    sortSelect: document.getElementById('sort-select'),
    clearCompletedBtn: document.getElementById('clear-completed-btn'),
    themeToggle: document.getElementById('theme-toggle'),
  };

  const STORAGE_KEY = 'task-manager.tasks.v1';
  const THEME_KEY = 'task-manager.theme.v1';

  /** @type {Array<{id:string,title:string,completed:boolean,createdAt:number,dueDate:string|null}>} */
  let tasks = [];
  let keyword = '';

  function generateId(){
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function save(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      tasks = raw ? JSON.parse(raw) : [];
    }catch{ tasks = []; }
  }

  function setThemeFromPreference(){
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const useLight = saved ? saved === 'light' : !prefersDark;
    dom.root.classList.toggle('light', useLight);
    dom.themeToggle.checked = !useLight;
  }

  function toggleTheme(){
    const isLight = dom.root.classList.toggle('light');
    localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
  }

  function addTask(title, dueDate){
    const trimmed = title.trim();
    if(!trimmed) return;
    const task = { id: generateId(), title: trimmed, completed: false, createdAt: Date.now(), dueDate: dueDate || null };
    tasks.unshift(task);
    save();
    render();
  }

  function deleteTask(id){
    tasks = tasks.filter(t => t.id !== id);
    save();
    render();
  }

  function toggleComplete(id){
    const t = tasks.find(x => x.id === id);
    if(!t) return;
    t.completed = !t.completed;
    save();
    render();
  }

  function clearCompleted(){
    tasks = tasks.filter(t => !t.completed);
    save();
    render();
  }

  function updateTaskTitle(id, newTitle){
    const t = tasks.find(x => x.id === id);
    if(!t) return;
    const trimmed = newTitle.trim();
    if(!trimmed){ deleteTask(id); return; }
    t.title = trimmed;
    save();
    render();
  }

  function updateTaskDueDate(id, dueDate){
    const t = tasks.find(x => x.id === id);
    if(!t) return;
    t.dueDate = dueDate || null;
    save();
    render();
  }

  function sortTasks(list){
    const v = dom.sortSelect.value;
    const arr = [...list];
    switch(v){
      case 'created_asc': arr.sort((a,b)=>a.createdAt-b.createdAt); break;
      case 'created_desc': arr.sort((a,b)=>b.createdAt-a.createdAt); break;
      case 'due_asc': arr.sort((a,b)=> (a.dueDate?Date.parse(a.dueDate):Infinity) - (b.dueDate?Date.parse(b.dueDate):Infinity)); break;
      case 'due_desc': arr.sort((a,b)=> (b.dueDate?Date.parse(b.dueDate):-Infinity) - (a.dueDate?Date.parse(a.dueDate):-Infinity)); break;
    }
    return arr;
  }

  function applyFilters(){
    const status = dom.statusFilter.value; // all|pending|completed
    let list = tasks;
    if(status === 'pending') list = list.filter(t=>!t.completed);
    else if(status === 'completed') list = list.filter(t=>t.completed);
    if(keyword){
      const q = keyword.toLowerCase();
      list = list.filter(t=> t.title.toLowerCase().includes(q));
    }
    return sortTasks(list);
  }

  function formatDueDate(due){
    if(!due) return '';
    const d = new Date(due + 'T00:00:00');
    if(Number.isNaN(d.getTime())) return '';
    const intl = new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
    return intl.format(d);
  }

  function createTaskElement(task){
    const li = document.createElement('li');
    li.className = 'task-item';
    li.dataset.id = task.id;

    const checkbox = document.createElement('button');
    checkbox.className = 'checkbox' + (task.completed ? ' checked' : '');
    checkbox.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
    checkbox.addEventListener('click', ()=> toggleComplete(task.id));

    const content = document.createElement('div');
    content.className = 'task-content';

    const title = document.createElement('div');
    title.className = 'task-title' + (task.completed ? ' completed' : '');
    title.textContent = task.title;
    title.title = 'Double-click to edit';
    title.addEventListener('dblclick', ()=> startInlineEdit(task, title));

    const meta = document.createElement('div');
    meta.className = 'task-meta';
    const dueText = task.dueDate ? `Due: ${formatDueDate(task.dueDate)}` : 'No due date';
    meta.textContent = dueText;

    content.appendChild(title);
    content.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const setDateBtn = document.createElement('button');
    setDateBtn.className = 'icon-btn';
    setDateBtn.title = 'Set due date';
    setDateBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
    setDateBtn.addEventListener('click', ()=> openDatePicker(task));

    const del = document.createElement('button');
    del.className = 'icon-btn delete';
    del.title = 'Delete task';
    del.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
    del.addEventListener('click', ()=> deleteTask(task.id));

    actions.appendChild(setDateBtn);
    actions.appendChild(del);

    li.appendChild(checkbox);
    li.appendChild(content);
    li.appendChild(actions);
    return li;
  }

  function startInlineEdit(task, titleEl){
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'edit-input';
    input.value = task.title;
    titleEl.replaceWith(input);
    input.focus();
    input.selectionStart = input.value.length;

    const commit = ()=> updateTaskTitle(task.id, input.value);
    const cancel = ()=> { render(); };

    input.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter') commit();
      else if(e.key === 'Escape') cancel();
    });
    input.addEventListener('blur', commit);
  }

  function openDatePicker(task){
    const picker = document.createElement('input');
    picker.type = 'date';
    picker.style.position = 'fixed';
    picker.style.left = '-9999px';
    document.body.appendChild(picker);
    picker.value = task.dueDate || '';
    picker.addEventListener('change', ()=>{
      updateTaskDueDate(task.id, picker.value || null);
      document.body.removeChild(picker);
    });
    picker.addEventListener('blur', ()=>{
      setTimeout(()=>{ if(picker.parentNode) document.body.removeChild(picker); }, 50);
    });
    picker.showPicker && picker.showPicker();
    picker.focus();
  }

  function render(){
    const list = applyFilters();
    dom.list.innerHTML = '';
    list.forEach(task => dom.list.appendChild(createTaskElement(task)));
    dom.empty.style.display = list.length ? 'none' : 'block';
  }

  // Event wiring
  dom.form.addEventListener('submit', (e)=>{
    e.preventDefault();
    addTask(dom.input.value, dom.dueInput.value || null);
    dom.input.value = '';
    dom.dueInput.value = '';
    dom.input.focus();
  });

  dom.search.addEventListener('input', ()=>{ keyword = dom.search.value.trim(); render(); });
  dom.statusFilter.addEventListener('change', render);
  dom.sortSelect.addEventListener('change', render);
  dom.clearCompletedBtn.addEventListener('click', clearCompleted);
  dom.themeToggle.addEventListener('change', toggleTheme);

  // Init
  setThemeFromPreference();
  load();
  render();
})();




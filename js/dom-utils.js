// DOM helpers: createEl, clearChildren, toast, formatDate
window.DomUtils = (function(){
  function createEl(tag, opts = {}) {
    const el = document.createElement(tag);
    if (opts.class) el.className = opts.class;
    if (opts.text) el.textContent = opts.text;
    if (opts.html) el.innerHTML = opts.html;
    if (opts.attrs) Object.entries(opts.attrs).forEach(([k,v]) => el.setAttribute(k, v));
    return el;
  }
  function clearChildren(el){ while(el.firstChild) el.removeChild(el.firstChild); }
  function toast(msg, timeout=3500){
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) { wrap = createEl('div',{class:'toast-wrap'}); document.body.appendChild(wrap); }
    const t = createEl('div',{class:'toast', text:msg});
    wrap.appendChild(t);
    setTimeout(()=> t.remove(), timeout);
  }
  function formatDateISO(dateStr){
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toISOString().split('T')[0];
  }
  function daysBetween(dateA, dateB){
    const a = new Date(dateA); const b = new Date(dateB);
    const diff = Math.ceil((a - b) / (1000*60*60*24));
    return diff;
  }
  return { createEl, clearChildren, toast, formatDateISO, daysBetween };
})();

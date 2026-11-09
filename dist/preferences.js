// Runs before CSS to avoid a light flash, and is safe to import again from app.js.
// Appearance is device-local and independent of learning-progress imports/resets.
(function () {
 if(window.ModelCraftUI)return;
 const key='model-craft:appearance:v1';
 const normalize=value=>({theme:['light','dark','system'].includes(value?.theme)?value.theme:'system',sidebarCollapsed:value?.sidebarCollapsed===true});
 const read=()=>{try{return normalize(JSON.parse(localStorage.getItem(key)||'{}'));}catch{return normalize({});}};
 const media=window.matchMedia?.('(prefers-color-scheme: dark)');
 let preferences=read();
 function apply(){
  const dark=preferences.theme==='dark'||(preferences.theme==='system'&&!!media?.matches);
  document.documentElement.dataset.theme=dark?'dark':'light';
  document.documentElement.dataset.sidebar=preferences.sidebarCollapsed?'collapsed':'expanded';
  document.documentElement.style.colorScheme=dark?'dark':'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#0d151d':'#f7f8fa');
  document.querySelectorAll('[data-ui-theme]').forEach(el=>{el.value=preferences.theme;});
  document.querySelectorAll('[data-action="sidebar-toggle"]').forEach(button=>{
   const label=preferences.sidebarCollapsed?'展开侧栏':'收起侧栏';
   button.setAttribute('aria-expanded',String(!preferences.sidebarCollapsed));button.setAttribute('aria-label',label);button.title=label;
   const text=button.querySelector('.sidebar-toggle-label');if(text)text.textContent=label;
  });
 }
 window.ModelCraftUI={key,get:()=>({...preferences}),refresh:apply,set:patch=>{
  preferences=normalize({...preferences,...patch});try{localStorage.setItem(key,JSON.stringify(preferences));}catch{}
  apply();window.dispatchEvent(new window.Event('modelcraft:appearance'));
 }};
 media?.addEventListener?.('change',()=>{if(preferences.theme==='system')apply();});
 window.addEventListener('storage',event=>{if(event.key===key){preferences=read();apply();}});
 apply();
})();

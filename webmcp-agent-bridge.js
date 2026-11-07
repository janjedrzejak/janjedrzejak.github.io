/* Jan / AI Guide <-> WebMCP: a guarded browser-side action bridge.
 * Existing Groq backend remains unchanged. The bridge does not contain secrets.
 * Only public, allowlisted portfolio UI actions may be executed.
 */
(() => {
  'use strict';
  if (window.portfolioWebMcpAgent) return;
  const STORAGE_KEY = 'jj:webmcp:actions:v1';
  const MAX_ACTIONS = 4;
  const MAX_AGE_MS = 90000;
  const permitted = Object.freeze({
    portfolio_get_page: {},
    portfolio_navigate: {page:['home','projects','notes']},
    portfolio_open_section: {section:['top','profile','expertise','work','experience','contact']},
    portfolio_set_language: {language:['pl','en']},
    portfolio_list_projects: {keyword:null},
    portfolio_filter_projects: {category:['all','ai','automation','integration','product','commerce','data']}
  });
  const simplify = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const currentPath = () => location.pathname.replace(/^\/pl\//,'/');
  const currentLang = () => document.documentElement.lang === 'pl' ? 'pl' : 'en';
  const json = value => JSON.stringify(value);

  function isActionRequest(question) {
    const q = simplify(question);
    return /\b(przejdz|przenies|otworz|pokaz|wyswietl|przefiltruj|filtruj|ustaw|przelacz|zmien|przewin|znajdz|nawiguj|go to|open|show|filter|switch|change|navigate|scroll|find)\b/.test(q);
  }
  function validate(action) {
    if (!action || typeof action !== 'object' || Array.isArray(action)) return null;
    if (!Object.hasOwn(permitted, action.name)) return null;
    const allowed = permitted[action.name];
    const args = action.arguments ?? action.args ?? {};
    if (!args || typeof args !== 'object' || Array.isArray(args)) return null;
    if (Object.keys(args).some(key => !Object.hasOwn(allowed,key))) return null;
    for (const [key,values] of Object.entries(allowed)) {
      if (key !== 'keyword' && !Object.hasOwn(args,key)) return null;
      if (Object.hasOwn(args,key)) {
        if (typeof args[key] !== 'string' || args[key].length > 100) return null;
        if (Array.isArray(values) && !values.includes(args[key])) return null;
      }
    }
    return {name:action.name,arguments:args};
  }
  function parsePlan(value) {
    const actions=Array.isArray(value) ? value : value?.actions;
    if (!Array.isArray(actions) || !actions.length || actions.length > MAX_ACTIONS) return [];
    const valid=actions.map(validate);
    return valid.every(Boolean) ? valid : [];
  }
  function readPlan(payload) {
    const direct=parsePlan(payload);
    if (direct.length) return direct;
    const text=String(payload?.answer || '').trim();
    if (!text || text.length > 4000) return [];
    try { return parsePlan(JSON.parse(text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''))); }
    catch { return []; }
  }
  function fallbackPlan(question) {
    const q=simplify(question);
    const steps=[];
    const projects=/projekt|projects|portfolio/.test(q);
    const category=/\bn8n\b|automat|workflow/.test(q) ? 'automation' :
      /\brag\b|\bai\b|machine learning|sztuczn/.test(q) ? 'ai' :
      /integrac|\bapi\b|integration/.test(q) ? 'integration' :
      /\bb2b\b|commerce|ecommerce/.test(q) ? 'commerce' :
      /\bdata\b|\bdane\b|analytic/.test(q) ? 'data' : null;
    if (/\b(polski|polska wersj|po polsku|polish)\b/.test(q) && /przelacz|zmien|ustaw|switch|change|pokaz/.test(q))
      steps.push({name:'portfolio_set_language',arguments:{language:'pl'}});
    else if (/\b(angielski|po angielsku|english)\b/.test(q) && /przelacz|zmien|ustaw|switch|change|pokaz/.test(q))
      steps.push({name:'portfolio_set_language',arguments:{language:'en'}});
    const section=/kontakt|contact/.test(q)?'contact':
      /doswiadcz|experience/.test(q)?'experience':
      /kompetenc|expertise/.test(q)?'expertise':
      /profil|profile/.test(q)?'profile':null;
    if (section) steps.push({name:'portfolio_open_section',arguments:{section}});
    else if (/notatk|artykul|blog|notes/.test(q) && /przejdz|otworz|pokaz|go to|open|show/.test(q))
      steps.push({name:'portfolio_navigate',arguments:{page:'notes'}});
    else if (projects) {
      if (currentPath() !== '/projects.html') steps.push({name:'portfolio_navigate',arguments:{page:'projects'}});
      steps.push(category?{name:'portfolio_filter_projects',arguments:{category}}:{name:'portfolio_list_projects',arguments:{}});
    } else if (/glown|home page|homepage/.test(q)) steps.push({name:'portfolio_navigate',arguments:{page:'home'}});
    return parsePlan({actions:steps});
  }
  async function requestPlan({question,locale,apiUrl}) {
    if (!/^https:\/\//.test(String(apiUrl||''))) return [];
    const instruction='Choose portfolio navigation tools. Reply ONLY as JSON {"actions":[{"name":"...","arguments":{}}]} with at most 4 actions, or {"actions":[]}. Tools: portfolio_navigate(page:home|projects|notes), portfolio_open_section(section:top|profile|expertise|work|experience|contact), portfolio_set_language(language:pl|en), portfolio_filter_projects(category:all|ai|automation|integration|product|commerce|data), portfolio_list_projects(). To filter, first navigate to projects if necessary. User instruction: ';
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),6500);
    try {
      const response=await fetch(apiUrl,{
        method:'POST',mode:'cors',credentials:'omit',
        headers:{'Content-Type':'application/json'},
        body:json({message:instruction+question.slice(0,240),history:[],locale,page:(location.pathname+location.hash).slice(0,180)}),
        signal:controller.signal
      });
      return response.ok ? readPlan(await response.json()) : [];
    } catch { return []; }
    finally { clearTimeout(timer); }
  }
  async function execute(name,args) {
    if (!validate({name,arguments:args})) throw Error('Tool or arguments rejected');
    for (let i=0;i<25 && !window.portfolioWebMcpTools?.getTools?.().includes(name);i++)
      await new Promise(resolve=>setTimeout(resolve,80));
    const api=document.modelContext;
    if (typeof api?.getTools === 'function' && typeof api?.executeTool === 'function') {
      const available=await api.getTools();
      const selected=available.find(item=>item.name===name);
      if (selected) {
        let result;
        try { result=await api.executeTool(selected,args); }
        catch(err) {
          if (!/Failed to parse input arguments/i.test(String(err?.message||''))) throw err;
          result=await api.executeTool(selected,json(args));
        }
        if (typeof result === 'string') {try{return JSON.parse(result)}catch{return result}}
        return result;
      }
    }
    if (window.portfolioWebMcpTools?.runTool) return window.portfolioWebMcpTools.runTool(name,args);
    throw Error('Tool unavailable: '+name);
  }
  function expectedPath(action) {
    const lang=currentLang();
    const locale=(p,lng=lang)=>(lng==='pl'?'/pl/':'/')+p;
    const args=action.arguments;
    if (action.name==='portfolio_navigate') return locale({home:'',projects:'projects.html',notes:'blog.html'}[args.page]);
    if (action.name==='portfolio_set_language') return locale(currentPath().slice(1),args.language);
    if (action.name==='portfolio_open_section' && currentPath()!=='/') return locale('')+'#'+args.section;
    return null;
  }
  function explain(results,locale) {
    const pl=locale==='pl',ok=results.filter(r=>r.ok),bad=results.length-ok.length;
    if (!ok.length) return pl?'Nie udało się wykonać polecenia.':'Could not execute the requested actions.';
    const words=ok.map(item=>{
      if(item.name==='portfolio_navigate')return pl?'otwarto podstronę':'opened a page';
      if(item.name==='portfolio_open_section')return pl?'otwarto sekcję':'opened a section';
      if(item.name==='portfolio_set_language')return pl?'zmieniono język':'switched language';
      if(item.name==='portfolio_filter_projects'){
        const p=item.result?.projects;
        return (pl?'ustawiono filtr „'+item.args.category+'”':'applied '+item.args.category+' filter')+
          (Array.isArray(p)?' ('+p.length+': '+p.slice(0,4).join(', ')+')':'');
      }
      if(item.name==='portfolio_list_projects'){
        const p=item.result?.projects;
        return (pl?'wyświetlono projekty':'listed projects')+
          (Array.isArray(p)?' ('+p.length+': '+p.slice(0,4).map(x=>x.title).filter(Boolean).join(', ')+')':'');
      }
      return item.name;
    });
    return (pl?'Wykonano: ':'Done: ')+words.join('; ')+'.'+(bad?' '+(pl?'Nieudane działania: ':'Failed actions: ')+bad+'.':'');
  }
  async function run(actions, context) {
    const results=Array.isArray(context.results)?context.results:[];
    for (let i=0;i<Math.min(actions.length,MAX_ACTIONS);i++) {
      const action=actions[i];
      const destination=expectedPath(action);
      if (destination && location.pathname+location.hash !== destination) {
        try {
          sessionStorage.setItem(STORAGE_KEY,json({
            actions:actions.slice(i+1),results:[...results,{name:action.name,args:action.arguments,ok:true}],
            expected:destination,locale:context.locale,question:String(context.question||'').slice(0,240),
            until:Date.now()+MAX_AGE_MS
          }));
          await execute(action.name,action.arguments);
          return {handled:true,navigation:true,answer:context.locale==='pl'?'Przechodzę do wskazanej strony…':'Navigating…'};
        } catch(err) {
          sessionStorage.removeItem(STORAGE_KEY);
          results.push({name:action.name,args:action.arguments,ok:false,error:String(err)});
          return {handled:true,navigation:false,answer:explain(results,context.locale)};
        }
      }
      try {
        const result=await execute(action.name,action.arguments);
        results.push({name:action.name,args:action.arguments,ok:true,result});
      } catch(err) { results.push({name:action.name,args:action.arguments,ok:false,error:String(err)}); }
    }
    return {handled:true,navigation:false,answer:explain(results,context.locale)};
  }
  function repair(actions) {
    if (currentPath()==='/projects.html') return actions;
    const i=actions.findIndex(a=>a.name==='portfolio_filter_projects'||a.name==='portfolio_list_projects');
    if(i<0) return actions;
    if(actions.slice(0,i).some(a=>a.name==='portfolio_navigate'&&a.arguments.page==='projects'))return actions;
    const fixed=[{name:'portfolio_navigate',arguments:{page:'projects'}},...actions];
    return fixed.length<=MAX_ACTIONS?fixed:[];
  }
  async function handle({question,locale='pl',apiUrl}) {
    if(!isActionRequest(question))return {handled:false};
    let actions=await requestPlan({question,locale,apiUrl});
    if(!actions.length)actions=fallbackPlan(question);
    if(!actions.length)return {handled:false};
    actions=repair(actions);
    if(!actions.length)return {handled:false};
    return run(actions,{question,locale,results:[]});
  }
  async function resume() {
    let pending;
    try { pending=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||'null'); }
    catch { pending=null; }
    sessionStorage.removeItem(STORAGE_KEY);
    if(!pending || !Array.isArray(pending.actions) || pending.actions.length>MAX_ACTIONS ||
       pending.until<Date.now() || pending.until>Date.now()+MAX_AGE_MS ||
       pending.expected!==location.pathname+location.hash) return;
    for(let i=0;i<30&&!window.portfolioWebMcpTools?.runTool;i++)
      await new Promise(resolve=>setTimeout(resolve,100));
    const result=await run(parsePlan({actions:pending.actions}),pending);
    if(!result.navigation)window.dispatchEvent(new CustomEvent('portfolio:agent-result',{
      detail:{message:result.answer,question:pending.question}
    }));
  }
  window.portfolioWebMcpAgent=Object.freeze({isActionRequest,handle,resume});
  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',()=>resume().catch(console.warn),{once:true});
  else resume().catch(console.warn);
})();

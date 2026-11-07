(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const catalogue = [
    { title:'AI & RAG assistants', category:'AI', tags:['AI','RAG','LLM','Vector Search'], url:'/projects.html' },
    { title:'Workflow automation', category:'Automation', tags:['n8n','API','Workflows'], url:'/projects.html' },
    { title:'Machine learning & prediction', category:'Data', tags:['ML','Prediction','Analytics'], url:'/projects.html' },
    { title:'B2B product & commerce', category:'Product', tags:['B2B','Product Owner','eCommerce'], url:'/projects.html' }
  ];
  const state = { counter:0, theme:'forest', lastQuery:null, calls:0, history:[], tools:[], selected:null, native:false, pending:false };
  const json = (value) => JSON.stringify(value, null, 2);
  const definitions = [
    {
      name:'get_profile', description:'Read Jan Jędrzejak’s public professional profile and areas of expertise.',
      inputSchema:{ type:'object', properties:{}, additionalProperties:false },
      annotations:{readOnlyHint:true},
      execute: async () => ({name:'Jan Jędrzejak', role:'Digital Project Manager / Product Owner', location:'Kraków, Poland', focus:['Workflow automation','AI & RAG','API integrations','Digital transformation','B2B products'], website:'https://janjedrzejak.github.io/'})
    },
    {
      name:'search_projects', description:'Search a curated public demo catalogue of portfolio project topics by a keyword (AI, n8n, B2B, RAG).',
      inputSchema:{type:'object',properties:{query:{type:'string',description:'Keyword to look for'}},required:['query'],additionalProperties:false},
      annotations:{readOnlyHint:true},
      execute: async ({query}) => {const q=String(query??'').trim().toLowerCase();if(!q)throw new Error('Query cannot be empty');const projects=catalogue.filter(p=>[p.title,p.category,...p.tags].some(t=>t.toLowerCase().includes(q)));state.lastQuery=query;$('search-label').textContent=`${projects.length} result(s) for “${query}”`;return {query,count:projects.length,projects};}
    },
    {
      name:'increment_counter', description:'Increase the live counter on this playground page by a positive integer.',
      inputSchema:{type:'object',properties:{amount:{type:'integer',minimum:1,maximum:100,description:'How much to increase the counter'}},required:['amount'],additionalProperties:false},
      annotations:{readOnlyHint:false},
      execute: async ({amount}) => {if(!Number.isInteger(amount)||amount<1||amount>100)throw new Error('amount must be an integer between 1 and 100');state.counter+=amount;renderState();return {success:true,counter:state.counter,increment:amount};}
    },
    {
      name:'reset_counter', description:'Reset the live playground counter to zero.',
      inputSchema:{type:'object',properties:{},additionalProperties:false},
      annotations:{readOnlyHint:false},
      execute: async () => {state.counter=0;renderState();return {success:true,counter:0};}
    },
    {
      name:'set_accent_theme', description:'Set the accent color of the playground. Supported themes: forest, blue, amber.',
      inputSchema:{type:'object',properties:{theme:{type:'string',enum:['forest','blue','amber']}},required:['theme'],additionalProperties:false},
      annotations:{readOnlyHint:false},
      execute: async ({theme}) => {if(!['forest','blue','amber'].includes(theme))throw new Error('Unknown theme');state.theme=theme;renderState();return {success:true,theme};}
    },
    {
      name:'navigate_to_section', description:'Scroll to the selected section on this WebMCP playground page.',
      inputSchema:{type:'object',properties:{section:{type:'string',enum:['explorer','state','guide']}},required:['section'],additionalProperties:false},
      annotations:{readOnlyHint:false},
      execute: async ({section}) => {const map={explorer:'.workspace',state:'.demo-section',guide:'.guide'};const element=document.querySelector(map[section]||'#__invalid');if(!element)throw new Error('Invalid section');element.scrollIntoView({behavior:'smooth',block:'start'});return {success:true,section};}
    }
  ];
  const defaults = {get_profile:{},search_projects:{query:'n8n'},increment_counter:{amount:3},reset_counter:{},set_accent_theme:{theme:'blue'},navigate_to_section:{section:'state'}};
  function renderState(){ $('counter').textContent=String(state.counter);document.body.dataset.theme=state.theme;$('theme-label').textContent=state.theme[0].toUpperCase()+state.theme.slice(1)+' mode'; }
  function setStatus(title, description, mode){ $('status-title').textContent=title;$('status-description').textContent=description;$('notice').className='notice '+(mode==='demo'?'demo':mode==='error'?'error':'');$('api-status').textContent=state.native?'Available':'Unavailable';$('run-mode').textContent=state.native?'Native':'Simulation'; }
  function renderTools(){const list=$('tool-list');list.replaceChildren();state.tools.forEach(tool=>{const btn=document.createElement('button');btn.className='tool-item';btn.type='button';btn.setAttribute('role','option');btn.setAttribute('aria-selected',String(state.selected?.name===tool.name));const title=document.createElement('strong');title.textContent=tool.name;const desc=document.createElement('span');desc.textContent=tool.description;btn.append(title,desc);btn.addEventListener('click',()=>select(tool.name));list.append(btn);});$('tool-count').textContent=String(state.tools.length);$('tool-counter').textContent=state.tools.length+' tools';}
  function select(name){state.selected=state.tools.find(tool=>tool.name===name)||null;const tool=state.selected;if(!tool)return;$('selected-title').textContent=tool.name;$('selected-description').textContent=tool.description;$('selected-type').textContent=tool.annotations?.readOnlyHint?'READ ONLY':'MODIFIES PAGE';$('arguments').value=json(defaults[name]||{});$('schema').textContent=json(tool.inputSchema);$('execution-hint').textContent=state.native?'Native WebMCP API':'Simulation — WebMCP not available';renderTools();}
  function displayResult(value, ok){$('result').textContent=typeof value==='string'?value:json(value);$('result-status').textContent=ok?'EXECUTION SUCCESS':'EXECUTION ERROR';$('result-status').style.color=ok?'var(--accent)':'#ee8989';}
  function log(name, ok){const timestamp=new Date().toLocaleTimeString();state.history.unshift({name,ok,timestamp});state.history=state.history.slice(0,20);const list=$('history');list.replaceChildren();state.history.forEach(item=>{const li=document.createElement('li');if(!item.ok)li.className='bad';const label=document.createElement('strong');label.textContent=(item.ok?'✓ ':'✕ ')+item.name;const time=document.createElement('span');time.textContent=item.timestamp;li.append(label,time);list.append(li);});}
  async function execute(name,args){if(state.pending)return;const def=definitions.find(t=>t.name===name);if(!def)throw new Error('Unknown tool');state.pending=true;$('run').disabled=true;$('execution-hint').textContent='Executing…';let ok=false;try{let result;if(state.native){const nativeTool=state.tools.find(t=>t.name===name);if(!nativeTool)throw new Error('Tool is not registered');result=await document.modelContext.executeTool(
nativeTool,
JSON.stringify(args)
);}else{result=await def.execute(args);}ok=true;state.calls++;$('call-count').textContent=String(state.calls);displayResult(result??{result:null},true);}catch(err){displayResult({error:err?.message||String(err)},false);}finally{log(name,ok);state.pending=false;$('run').disabled=false;$('execution-hint').textContent=state.native?'Native WebMCP API':'Simulation mode';}}
  async function initialize(){state.native=!!(document.modelContext&&typeof document.modelContext.registerTool==='function'&&typeof document.modelContext.getTools==='function'&&typeof document.modelContext.executeTool==='function');if(state.native){try{for(const definition of definitions){await document.modelContext.registerTool({...definition, execute: async (args, context) => json(await definition.execute(args, context))});}const found=await document.modelContext.getTools();state.tools=definitions.map(def=>found.find(t=>t.name===def.name)).filter(Boolean);if(state.tools.length!==definitions.length)throw new Error('Not all tools were discoverable');setStatus('WebMCP connected — tools registered','The browser exposes document.modelContext. Calls use getTools() and executeTool().','native');}catch(error){state.native=false;state.tools=definitions;setStatus('Registration failed — simulation enabled',error.message,'error');}}else{state.tools=definitions;setStatus('WebMCP unavailable — simulation enabled','You can explore and run demo tools, but they are not exposed to a browser agent. Enable experimental WebMCP support in a compatible Chrome build.','demo');}renderTools();select('search_projects');}
  $('run').addEventListener('click',async()=>{if(!state.selected)return;let args;try{args=JSON.parse($('arguments').value);if(args===null||typeof args!=='object'||Array.isArray(args))throw new Error('Arguments must be a JSON object');}catch(err){displayResult({error:'Invalid input JSON: '+err.message},false);return;}await execute(state.selected.name,args);});
  $('reset-input').addEventListener('click',()=>{if(state.selected)$('arguments').value=json(defaults[state.selected.name]||{});});
  $('refresh').addEventListener('click',()=>location.reload());
  $('copy-result').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('result').textContent);$('copy-result').textContent='Copied';setTimeout(()=>$('copy-result').textContent='Copy JSON',1200);}catch{ $('copy-result').textContent='Copy failed';}});
  $('clear-history').addEventListener('click',()=>{state.history=[];$('history').replaceChildren();const item=document.createElement('li');item.className='muted';item.textContent='No calls yet';$('history').append(item);});
  $('counter-button').addEventListener('click',()=>execute('increment_counter',{amount:1}));
  $('theme-button').addEventListener('click',()=>execute('set_accent_theme',{theme:state.theme==='forest'?'blue':state.theme==='blue'?'amber':'forest'}));
  $('search-button').addEventListener('click',()=>execute('search_projects',{query:'AI'}));
  renderState();initialize().catch(error=>setStatus('Initialization failed',String(error),'error'));
})();

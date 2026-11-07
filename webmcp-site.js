/* Site-wide WebMCP tools — public portfolio only, no remote API calls. */
(() => {
  'use strict';
  const ctx = document.modelContext;
  if (!ctx || typeof ctx.registerTool !== 'function') return;
  const origin = location.origin;
  const path = location.pathname;
  const isPolish = path.startsWith('/pl/');
  const localized = (p, lang = (isPolish ? 'pl' : 'en')) =>
    (lang === 'pl' ? '/pl/' : '/') + p;
  const pages = Object.freeze({
    home: '', projects: 'projects.html', notes: 'blog.html',
    playground: 'webmcp-lab.html'
  });
  const sections = Object.freeze({
    top: 'top', profile: 'profile', expertise: 'expertise',
    work: 'work', experience: 'experience', contact: 'contact'
  });
  const categories = ['all','ai','automation','integration','product','commerce','data'];
  const format = value => JSON.stringify(value);
  const register = async (spec) => ctx.registerTool({
    ...spec, execute: async (args) => format(await spec.execute(args || {}))
  });
  const currentPage = () => path.replace(/^\/pl\//, '/').replace(/^\//, '') || 'index.html';
  const goto = (relative, hash = '') => {
    const url = new URL(relative + hash, origin);
    if (url.origin !== origin) throw new Error('External destinations are not permitted');
    location.assign(url.pathname + url.hash);
    return {success:true, destination:url.pathname + url.hash, note:'Navigation started; the agent should rediscover tools on the destination page.'};
  };

  async function setup() {
    await register({
      name:'portfolio_get_page',
      description:'Get the current page title, language, headings and public navigation links on Jan Jedrzejak’s portfolio.',
      annotations:{readOnlyHint:true},
      inputSchema:{type:'object',properties:{},additionalProperties:false},
      execute: async () => ({
        page:currentPage(), title:document.title,
        language:document.documentElement.lang || (isPolish?'pl':'en'),
        headings:[...document.querySelectorAll('main h1, main h2')].slice(0,24).map(h=>({text:h.textContent.trim().replace(/\s+/g,' '),id:h.id||null})),
        links:[...document.querySelectorAll('main a[href]')].filter(a=>{
          const u = new URL(a.getAttribute('href'),origin);
          return u.origin===origin;
        }).slice(0,30).map(a=>({text:a.textContent.trim().replace(/\s+/g,' ').slice(0,90),href:a.getAttribute('href')}))
      })
    });
    await register({
      name:'portfolio_navigate',
      description:'Navigate to a main section of the public portfolio (home, projects, notes, playground).',
      annotations:{readOnlyHint:false},
      inputSchema:{type:'object',properties:{page:{type:'string',enum:Object.keys(pages)}},required:['page'],additionalProperties:false},
      execute:async ({page}) => goto(localized(pages[page]))
    });
    await register({
      name:'portfolio_open_section',
      description:'Open a public section on the homepage and scroll to it.',
      annotations:{readOnlyHint:false},
      inputSchema:{type:'object',properties:{section:{type:'string',enum:Object.keys(sections)}},required:['section'],additionalProperties:false},
      execute:async ({section}) => {
        const id=sections[section];
        const onHome=currentPage()==='index.html';
        if (onHome) {
          const target=document.getElementById(id);
          if (!target) throw new Error('The section is not available');
          target.scrollIntoView({behavior:'smooth',block:'start'});
          history.replaceState(null,'','#'+id);
          return {success:true,section,scrolled:true};
        }
        return goto(localized(''),'#'+id);
      }
    });
    await register({
      name:'portfolio_set_language',
      description:'Switch the website between English and Polish, preserving the current page when supported.',
      annotations:{readOnlyHint:false},
      inputSchema:{type:'object',properties:{language:{type:'string',enum:['pl','en']}},required:['language'],additionalProperties:false},
      execute:async ({language}) => {
        const page=currentPage();
        const supported = page==='index.html'||page==='projects.html'||page==='blog.html'||page==='webmcp-lab.html'||page.startsWith('blog-posts/');
        if (!supported) throw new Error('Language switching is unavailable for this page');
        return goto(localized(page==='index.html'?'':page,language),location.hash);
      }
    });
    await register({
      name:'portfolio_list_projects',
      description:'List publicly displayed project cards on the Projects page; open that page first for complete results.',
      annotations:{readOnlyHint:true},
      inputSchema:{type:'object',properties:{keyword:{type:'string',description:'Optional search term'}},additionalProperties:false},
      execute:async ({keyword=''}) => {
        const cards=[...document.querySelectorAll('.project-library-card')];
        const q=String(keyword).trim().toLowerCase();
        return {page:currentPage(),complete:currentPage()==='projects.html',
          count:cards.filter(card=>!q||card.textContent.toLowerCase().includes(q)).length,
          projects:cards.filter(card=>!q||card.textContent.toLowerCase().includes(q)).map(card=>({
            title:(card.querySelector('h3')?.textContent||'').trim(),
            categories:(card.dataset.categories||'').split(/\s+/).filter(Boolean),
            description:(card.querySelector('p')?.textContent||'').trim().slice(0,280)
          }))};
      }
    });
    // This is available only on the page with actual filter chips.
    if (document.querySelector('.filter-chip[data-filter]')) {
      await register({
        name:'portfolio_filter_projects',
        description:'Apply the existing visual project category filter on the Projects page.',
        annotations:{readOnlyHint:false},
        inputSchema:{type:'object',properties:{category:{type:'string',enum:categories}},required:['category'],additionalProperties:false},
        execute:async ({category}) => {
          const button=[...document.querySelectorAll('.filter-chip[data-filter]')].find(b=>b.dataset.filter===category);
          if(!button) throw new Error('Filter not found');
          button.click();
          const visible=[...document.querySelectorAll('.project-library-card')].filter(el=>{
            const style=getComputedStyle(el);
            return !el.hidden && style.display!=='none' && style.visibility!=='hidden';
          });
          return {success:true,category,visibleCount:visible.length,
            projects:visible.map(el=>(el.querySelector('h3')?.textContent||'').trim())};
        }
      });
    }
    console.info('[WebMCP] Site-wide portfolio tools registered on',location.pathname);
  }
  setup().catch(error=>console.warn('[WebMCP] Site-wide registration failed:',error));
})();

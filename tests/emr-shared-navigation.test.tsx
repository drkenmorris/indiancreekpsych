import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {readFileSync,readdirSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
// @ts-expect-error This repository uses jsdom fixtures without @types/jsdom.
import {JSDOM} from 'jsdom';
import EmrNavigationShell from '@/app/emr/navigation/EmrNavigationShell';
import {menus,workspaceLink,routeSection} from '@/app/emr/navigation/links';
const location=vi.hoisted(()=>({path:'/emr/groups',query:'patient=00000000-0000-4000-8000-000000000103'}));
vi.mock('next/navigation',()=>({usePathname:()=>location.path,useSearchParams:()=>new URLSearchParams(location.query)}));
afterEach(()=>{cleanup();location.path='/emr/groups';location.query='patient=00000000-0000-4000-8000-000000000103';});
test('standalone EMR pages share the top menus, provider sidebar, module switcher and bottom navigation',()=>{
 render(<EmrNavigationShell providerName="Fictional provider"><main><h1>Group Sessions</h1></main></EmrNavigationShell>);
 expect(screen.getByRole('navigation',{name:'Main EMR modules'})).toBeTruthy();expect(screen.getByRole('navigation',{name:'Workspace navigation'})).toBeTruthy();expect(screen.getByText('Provider Menu')).toBeTruthy();expect(screen.getByText('Active Provider')).toBeTruthy();expect(screen.getByText('Fictional provider')).toBeTruthy();
 const modules=screen.getByRole('navigation',{name:'Main EMR modules'});fireEvent.click(within(modules).getByRole('button',{name:'Personal Data'}));const options=screen.getByRole('navigation',{name:'Current module options'});const first=within(options).getAllByRole('link')[0];expect(first.textContent).toBe('Find/Add Patient');expect(first.getAttribute('href')).toContain('directory=1');expect(first.getAttribute('href')).toContain('patient=00000000-0000-4000-8000-000000000103');
 expect(screen.getByRole('heading',{name:'Group Sessions'})).toBeTruthy();fireEvent.click(screen.getByRole('switch'));expect(screen.queryByRole('navigation',{name:'Main EMR modules'})).toBeNull();expect(screen.getByRole('switch').textContent).toContain('Workspace Menu/Off');fireEvent.click(screen.getByRole('switch'));expect(screen.getByRole('navigation',{name:'Main EMR modules'})).toBeTruthy();
});
test('Home and Personal Data target the same patient-bound directory and the planner link preserves context',()=>{
 location.path='/emr/treatment-planners';render(<EmrNavigationShell providerName="Fictional provider"><main>Library form</main></EmrNavigationShell>);const link=screen.getByRole('navigation',{name:'Home quick links',hidden:true}).querySelector('a');expect(link?.getAttribute('href')).toBe(workspaceLink('personal','patient_directory','00000000-0000-4000-8000-000000000103'));expect(screen.getByRole('link',{name:'Manage Treatment Planners',hidden:true}).getAttribute('href')).toContain('?patient=');expect(screen.getByRole('link',{name:'Treatment Planners'}).getAttribute('aria-current')).toBe('page');
});
test('embedded content inherits parent menus instead of duplicating them',()=>{location.query+='&embedded=1';render(<EmrNavigationShell providerName="Fictional"><main>Embedded form</main></EmrNavigationShell>);expect(screen.getByText('Embedded form')).toBeTruthy();expect(screen.queryByRole('navigation')).toBeNull();});
test('module labels and options match the actual home workspace definitions',()=>{
 const source=readFileSync('public/emr-assets/module-menu.js','utf8');const original=JSON.parse(runInNewContext(source.slice(0,source.indexOf('function findMenuSection'))+'JSON.stringify({sections:moduleSections,extra:extraNavigationSections})'));expect(menus.sections).toEqual(original.sections);expect(menus.extra).toEqual(original.extra);
 const providers=readFileSync('public/emr-assets/providers.js','utf8');const start=providers.indexOf('const mainModules=');expect(menus.modules).toEqual(JSON.parse(runInNewContext(providers.slice(start,providers.indexOf(';',start)+1)+'JSON.stringify(mainModules)')));expect(menus.sections.personal[0].slice(0,2)).toEqual(['patient_directory','Find/Add Patient']);
});
test('all EMR page routes inherit the shared layout and retain their own content/auth pages',()=>{
 function pages(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(item=>item.isDirectory()?pages(dir+'/'+item.name):item.name==='page.tsx'?[dir+'/'+item.name]:[]);}
 const routes=pages('app/emr');expect(routes).toHaveLength(15);for(const file of routes)expect(readFileSync(file,'utf8')).not.toContain('AdministrativeShell');expect(readFileSync('app/emr/layout.tsx','utf8')).toContain('<EmrNavigationShell');expect(routeSection('/emr/groups')).toEqual(['administration','teams']);expect(routeSection('/emr/treatment-planners')).toEqual(['administration','treatment_planners']);expect(readFileSync('app/emr/navigation/navigation.css','utf8')).toContain('grid-template-rows:auto minmax(0,1fr) auto');
});

test('home-workspace first Personal Data option invokes the existing guarded directory and stops generic navigation',()=>{
 const dom=new JSDOM('<button data-submenu="personal:patient_directory">Find/Add Patient</button>');const opened=vi.fn(),generic=vi.fn();dom.window.document.addEventListener('click',generic);const source=readFileSync('public/emr-assets/central-directory.js','utf8');runInNewContext(source.slice(source.indexOf('// Personal Data and Home share')), {document:dom.window.document,providerMe:{account_type:'Provider'},openDirectory:opened});dom.window.document.querySelector('button')!.click();expect(opened).toHaveBeenCalledTimes(1);expect(generic).not.toHaveBeenCalled();dom.window.close();
});

test('choosing a patient from the Personal Data directory opens that patient demographics without reopening the picker',()=>{const source=readFileSync('public/emr-assets/central-directory.js','utf8');const start=source.indexOf('function selectedPatientWorkspaceUrl');const end=source.indexOf('selectPatient=async',start);const url=runInNewContext(source.slice(start,end)+"selectedPatientWorkspaceUrl('00000000-0000-4000-8000-000000000104')",{URLSearchParams,activeSection:{module:'personal',key:'patient_directory',definition:['patient_directory','Find/Add Patient','demographics']},findMenuSection:()=>['demographics','Patient Demographics','demographics']});const parsed=new URL(url,'https://fictional.example');expect(parsed.searchParams.get('section')).toBe('personal:demographics');expect(parsed.searchParams.get('patient')).toBe('00000000-0000-4000-8000-000000000104');expect(parsed.searchParams.has('directory')).toBe(false);});

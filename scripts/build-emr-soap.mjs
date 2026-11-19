import {build} from 'esbuild';
await build({
 entryPoints:['browser/soap-workspace.tsx'],outfile:'public/emr-assets/soap-workspace.js',
 bundle:true,minify:true,format:'iife',platform:'browser',jsx:'automatic',
 target:['safari16','chrome110','firefox115'],define:{'process.env.NODE_ENV':'"production"'},
 legalComments:'inline',logLevel:'info',
});

await build({entryPoints:['browser/prognosis-workspace.tsx'],outfile:'public/emr-assets/prognosis-workspace.js',bundle:true,minify:true,format:'iife',platform:'browser',jsx:'automatic',target:['safari16','chrome110','firefox115'],define:{'process.env.NODE_ENV':'"production"'},legalComments:'inline',logLevel:'info'});

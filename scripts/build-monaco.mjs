import {build} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
const directory=new URL('../public/pulse/',import.meta.url);
await mkdir(directory,{recursive:true});
await build({entryPoints:['scripts/monaco-entry.mjs'],bundle:true,format:'esm',target:'es2022',outdir:directory.pathname,entryNames:'editor',minify:true,loader:{'.ttf':'file'},assetNames:'assets/[name]-[hash]',legalComments:'linked'});
await build({entryPoints:['node_modules/monaco-editor/esm/vs/editor/editor.worker.js'],bundle:true,format:'esm',target:'es2022',outfile:new URL('editor-worker.js',directory).pathname,minify:true,legalComments:'linked'});
await copyFile('node_modules/monaco-editor/LICENSE',new URL('LICENSE.txt',directory));

import ts from 'typescript';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const target=new URL('../public/workers/',import.meta.url);
await mkdir(target,{recursive:true});
const license=await readFile(new URL('../lib/verilog/LICENSE',import.meta.url),'utf8');
for(const name of ['model','vcd','vcd-worker']){
 const file=new URL(`../lib/verilog/${name}.ts`,import.meta.url);
 let source=await readFile(file,'utf8');
 source=source.replaceAll("'./model.ts'","'./model.js'").replaceAll("'./vcd'","'./vcd.js'");
 const result=ts.transpileModule(source,{fileName:file.pathname,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}});
 await writeFile(new URL(`${name}.js`,target),'/*\n'+license+'\n*/\n'+result.outputText);
}

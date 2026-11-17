import {test} from 'node:test';
import assert from 'node:assert/strict';
import {indexHDL,basicIssues,moduleSnippet,snippets,systemFunctions} from '../lib/verilog/language.ts';
import {parseHDL,emptyHDL,validProjectPath} from '../lib/verilog/project.ts';
test('workspace paths preserve nested files and reject traversal',()=>{
 const p=emptyHDL();p.files[0].name='rtl/core/design.sv';p.files.push({name:'.gitignore',source:'build/'});
 assert.equal(parseHDL(p).files[0].name,'rtl/core/design.sv');
 for(const path of ['../a.sv','/a.sv','rtl//a.sv','rtl/../a.sv','a.exe'])assert.equal(validProjectPath(path),false);
});
test('source index ignores comments and strings, preserves locations and parameterized ports',()=>{
 const symbols=indexHDL([{name:'rtl/core.sv',source:'// module fake;\nmodule core #(parameter W = 8) (input logic clk, input logic [W-1:0] data, output logic ready);\n string s = "module hidden;";\nendmodule'}]);
 const core=symbols.find(s=>s.name==='core')!;
 assert.equal(core.line,2);assert.equal(core.column,8);assert.deepEqual(core.ports,['clk','data','ready']);
 assert.equal(symbols.some(s=>['fake','hidden'].includes(s.name)),false);
 assert.match(moduleSnippet(core),/\.clk\(\$\{2:clk\}\)/);
});
test('basic diagnostics ignore comment and string punctuation and stay bounded',()=>{
 assert.deepEqual(basicIssues({name:'a.sv',source:'// (\ninitial $display("["); /* { */'}),[]);
 const issues=basicIssues({name:'a.sv',source:'module a;\ninitial begin\n  f(1;\nend'});
 assert.equal(issues[0].line,3);assert.equal(issues[0].column,4);
 assert.equal(basicIssues({name:'a.sv',source:')'.repeat(100)}).length,50);
 assert.deepEqual(basicIssues({name:'README.md',source:'('}),[]);
});
test('testbench snippet escapes Verilog system task dollar signs for Monaco',()=>{
 const body=snippets.find(s=>s.label==='testbench')!.body;
 assert.ok(body.includes('\\$dumpfile'));assert.ok(body.includes('\\$finish'));assert.ok(body.includes('$0'));
});

test('new projects separate RTL and testbench without rewriting existing projects',()=>{
 assert.deepEqual(emptyHDL().files.map(f=>f.name),['rtl/design.sv','tb/tb.sv']);
 const legacy={...emptyHDL(),files:[{name:'legacy.v',source:'module legacy; endmodule'}]};
 assert.equal(parseHDL(legacy).files[0].name,'legacy.v');
});
test('function hover index retains typed signatures across lines',()=>{
 const symbols=indexHDL([{name:'rtl/math.sv',source:'function automatic logic [7:0] increment(\n input logic [7:0] value\n);\n return value + 1;\nendfunction\ntask automatic check(input int x); endtask\nfunction my_type decode(input int x); endfunction'}]);
 assert.equal(symbols.find(s=>s.name==='increment')?.kind,'function');
 assert.match(symbols.find(s=>s.name==='increment')!.declaration,/input logic \[7:0\] value/);
 assert.equal(symbols.find(s=>s.name==='check')?.kind,'task');
 assert.equal(symbols.find(s=>s.name==='decode')?.kind,'function');
 assert.equal(symbols.some(s=>s.name==='my_type'),false);
});
test('system task completions have signatures and hover documentation',()=>{
 for(const name of ['$display','$clog2','$dumpvars','$finish']){
 const item=systemFunctions.find(s=>s.name===name);assert.ok(item);assert.ok(item.signature.startsWith(name));assert.ok(item.description.length>10);
 }
 assert.equal(new Set(systemFunctions.map(s=>s.name)).size,systemFunctions.length);
});

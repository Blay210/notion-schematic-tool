import test from 'node:test';
import assert from 'node:assert/strict';
import {hdlDialect} from '../lib/verilog/dialect.ts';
import {completionsForFile} from '../lib/verilog/language.ts';
test('file and header extensions choose their own dialect including uppercase',()=>{
 for(const file of ['rtl/core.v','include/core.vh','RTL/CORE.V'])assert.equal(hdlDialect(file),'verilog');
 for(const file of ['tb/core.sv','include/core.svh','TB/CORE.SVH'])assert.equal(hdlDialect(file),'systemverilog');
 assert.equal(hdlDialect('README.md'),'text');assert.deepEqual(completionsForFile('README.md'),{keywords:[],functions:[],snippets:[]});
});
test('Verilog excludes SV-only keywords, tasks and template syntax',()=>{
 for(const path of ['file.v','file.vh']){
 const catalog=completionsForFile(path);
 for(const word of ['always_ff','always_comb','always_latch','logic','class','package','interface','typedef','struct','enum','join_any','assert'])assert.equal(catalog.keywords.includes(word),false,word);
 for(const word of ['always','module','reg','wire','function','generate'])assert.ok(catalog.keywords.includes(word),word);
 for(const word of ['$fatal','$bits','$urandom'])assert.equal(catalog.functions.some(f=>f.name===word),false,word);
 assert.ok(catalog.functions.some(f=>f.name==='$display'));
 assert.ok(catalog.functions.some(f=>f.name==='$clog2'));
 assert.match(catalog.snippets[0].body,/reg clk/);assert.doesNotMatch(catalog.snippets[0].body,/\blogic\b/);
 }
});
test('SystemVerilog retains extended recommendations without mutating Verilog catalogs',()=>{
 const sv=completionsForFile('file.sv');
 for(const word of ['always_ff','logic','interface','class'])assert.ok(sv.keywords.includes(word));
 assert.ok(sv.functions.some(f=>f.name==='$fatal'));assert.match(sv.snippets[0].body,/logic clk/);
 assert.doesNotMatch(completionsForFile('file.v').snippets[0].body,/logic clk/);
});

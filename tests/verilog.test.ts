import test from 'node:test';
import assert from 'node:assert/strict';
import {parseVcd} from '../lib/verilog/vcd.ts';
import {parseHDL,emptyHDL,validateHDLBlocks} from '../lib/verilog/project.ts';
const trace='$timescale 1 ns $end\n$scope module tb $end\n$var wire 1 ! clk $end\n$var wire 4 " data $end\n$upscope $end\n$enddefinitions $end\n$dumpvars\n0!\nb0 "\n$end\n#5\n1!\nb10 "\n#10\n0!\nbx "\n';
test('ported VCD parser retains digital values, buses, unknowns and aliases',()=>{const wave=parseVcd(trace);assert.equal(wave.timescale.unit,'ns');assert.equal(wave.end,'10');assert.deepEqual(wave.channels.get('!'),[{time:'0',value:'0'},{time:'5',value:'1'},{time:'10',value:'0'}]);assert.equal(wave.channels.get('"')?.at(-1)?.value,'xxxx');assert.equal(wave.signals[1].path,'tb.data');});
test('VCD timestamps preserve precision and malformed or regressing traces are rejected',()=>{const wave=parseVcd(trace+'#900719925474099300000\n1!\n');assert.equal(wave.end,'900719925474099300000');assert.throws(()=>parseVcd(trace+'#2\n1!'));assert.throws(()=>parseVcd(trace+'1?'));assert.throws(()=>parseVcd('$enddefinitions $end'));});
test('HDL validation rejects duplicate paths, traversal and oversized source without discarding originals',()=>{const d=emptyHDL();for(const files of [[{name:'../x.sv',source:''}],[...d.files,d.files[0]],[{name:'x.sv',source:'a'.repeat(256*1024+1)}]])assert.throws(()=>parseHDL({...d,files}));assert.throws(()=>validateHDLBlocks({type:'verilogProject',attrs:{data:{}}}));});

test('shipped module worker JavaScript parses VCD and reports errors',async()=>{
 const {execFileSync}=await import('node:child_process');
 const code=`globalThis.self={postMessage:(result)=>{if(result.data)console.log(result.data.end);else console.log('error')}};await import('./public/workers/vcd-worker.js');self.onmessage({data:${JSON.stringify(trace)}});self.onmessage({data:'invalid'});`;
 const output=execFileSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8'});
 assert.equal(output.trim(),'10\nerror');
});

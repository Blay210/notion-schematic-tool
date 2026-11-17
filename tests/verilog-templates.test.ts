// Behavioral cases adapted from Pulse ide/language/ported.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {planTemplate} from '../lib/verilog/templates.ts';
import {planBlockEnter} from '../lib/verilog/blocks.ts';
const template=(source:string,language:'verilog'|'systemverilog'='systemverilog')=>{const offset=source.indexOf('|');return planTemplate(source.replace('|',''),offset,language);};
function enter(source:string,unit='  ',eol:'\n'|'\r\n'='\n'){const offset=source.indexOf('|'),text=source.replace('|',''),edit=planBlockEnter(text,offset,{unit,eol});return edit&&text.slice(0,offset)+edit.beforeCursor+'|'+edit.afterCursor+text.slice(edit.replaceEnd);}
test('all 17 original block keywords expand; module fields are empty and ordered',()=>{
 for(const name of ['module','package','class','interface','program','function','task','generate','fork','case','casex','casez','begin','always','always_ff','always_comb','always_latch'])assert.ok(template(name+'|'),name);
 assert.equal(template('module|')?.snippet,'module $1 (\n\t$2\n);\n\t$0\nendmodule');
 assert.equal(planTemplate('mod',3,'systemverilog','module')?.label,'module');
 assert.equal(template('function|')?.snippet,'function $1 $2 ($3);\n\t$0\nendfunction');
 assert.equal(template('fork|')?.snippet,'fork\n\t$0\n${1|join,join_any,join_none|}');
 assert.equal(template('always_ff|')?.snippet,'always_ff @($1) begin\n\t$0\nend');
});
test('templates honor language, comments, existing closers and optional-block statements',()=>{
 for(const source of ['// module|','"package|','`define X begin|','pkg::module|','object.begin|','module| existing;','module|\nendmodule','case|\nendcase','module|_name','if|','for|','class| // keep','fork|\njoin_any'])assert.equal(template(source),undefined,source);
 for(const word of ['package','class','interface','program','always_ff','always_comb','always_latch'])assert.equal(template(word+'|','verilog'),undefined);
 assert.equal(template('fork|','verilog')?.snippet,'fork\n\t$0\njoin');
 assert.equal(template('begin|\nend')?.snippet,'begin\n\t$0');
 assert.equal(template('always|\nend')?.snippet,'always @($1) begin\n\t$0');
});
test('Enter closes explicit begin and case with exact indentation and no duplicate outer end',()=>{
 assert.equal(enter('initial begin|'),'initial begin\n  |\nend');
 assert.equal(enter('  if (ready) begin : transfer|'),'  if (ready) begin : transfer\n    |\n  end');
 assert.equal(enter('begin|end'),'begin\n  |\nend');
 assert.equal(enter('begin|\nend'),'begin\n  |\nend');
 assert.equal(enter('initial begin\n  if (x) begin|\nend'),'initial begin\n  if (x) begin\n    |\n  end\nend');
 assert.equal(enter('\talways begin|','\t','\r\n'),'\talways begin\r\n\t\t|\r\n\tend');
 for(const word of ['case','casex','casez'])assert.equal(enter(`${word} (foo(bar))|`),`${word} (foo(bar))\n  |\nendcase`);
});
test('Enter leaves statements, strings and preprocessor branches alone',()=>{
 for(const source of ['// begin|','/* begin|','$display("begin|','`define X begin|','if (ready)|','always @(posedge clk)|','for (i=0; i<8; i++)|','begin| x=1;','begin|\n`ifdef FEATURE\nend\n`endif'])assert.equal(enter(source),undefined,source);
});

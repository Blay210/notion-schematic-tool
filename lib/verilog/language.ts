import {hdlDialect,verilogKeywords,svSystemFunctions} from './dialect.ts';
import type {HDLFile} from './project.ts';
export const keywords='module endmodule input output inout wire tri reg logic bit integer int shortint longint byte time real realtime string signed unsigned parameter localparam genvar assign deassign always always_comb always_ff always_latch initial final begin end if else case casex casez endcase default for foreach while repeat forever generate endgenerate function endfunction task endtask automatic static typedef struct union enum packed unpacked interface endinterface modport package endpackage import export class endclass virtual extends new return break continue fork join join_any join_none disable wait posedge negedge or and not nand nor xor xnor buf supply0 supply1 event const void var inside unique priority rand randc constraint clocking endclocking program endprogram property endproperty sequence endsequence assert assume cover'.split(' ');
export const snippets=[
 {label:'testbench',detail:'테스트벤치',body:'`timescale 1ns/1ps\nmodule ${1:tb};\n  logic clk = 0;\n  always #5 clk = ~clk;\n  initial begin\n    \\$dumpfile("wave.vcd");\n    \\$dumpvars(0, ${1:tb});\n    $0\n    #100 \\$finish;\n  end\nendmodule'},
];
export type SymbolInfo={name:string;kind:string;file:string;line:number;column:number;declaration:string;ports?:string[]};
export type BasicIssue={file:string;line:number;column:number;message:string};
export function maskHDL(source:string){return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"(?:\\.|[^"\\])*"|\\[^\s]+/g,value=>value.replace(/[^\r\n]/g,' '));}
function position(source:string,offset:number){const before=source.slice(0,offset),line=before.split('\n').length;return {line,column:offset-(before.lastIndexOf('\n')+1)+1};}
function modulePorts(header:string){let rest=header.replace(/^\s*#\s*\(/,'(');if(/^\s*#/.test(header)){let depth=0,end=-1;for(let i=header.indexOf('(');i<header.length;i++){if(header[i]==='(')depth++;if(header[i]===')'&&!--depth){end=i;break;}}if(end<0)return [];rest=header.slice(end+1);}const start=rest.indexOf('('),end=rest.lastIndexOf(')');if(start<0||end<start)return [];
 return [...new Set(rest.slice(start+1,end).split(',').flatMap(part=>{const simple=part.split('=')[0].replace(/\[[^\]]*\]/g,' ').trim();if(/[(){}]/.test(simple))return [];const words=simple.match(/[a-zA-Z_][\w$]*/g)||[];const name=words.at(-1);return name&&!keywords.includes(name)?[name]:[];}))];}
export function indexHDL(files:HDLFile[]):SymbolInfo[]{const symbols:SymbolInfo[]=[];
 for(const file of files.filter(f=>/\.(sv|v|svh|vh)$/i.test(f.name))){const clean=maskHDL(file.source);const add=(name:string,kind:string,offset:number,ports?:string[])=>{if(symbols.some(s=>s.file===file.name&&s.name===name&&s.line===position(clean,offset).line))return;const p=position(clean,offset);symbols.push({name,kind,file:file.name,...p,declaration:file.source.split('\n')[p.line-1]?.trim()||name,ports});};
  for(const m of clean.matchAll(/\b(module|interface|package|class)\s+(?:(?:automatic|static|void|int|logic|bit)\s+)?([a-zA-Z_][\w$]*)/g)){const offset=m.index+m[0].lastIndexOf(m[2]);const semi=clean.indexOf(';',offset);add(m[2],m[1],offset,m[1]==='module'?modulePorts(clean.slice(offset+m[2].length,semi<0?offset:semi)):undefined);}
  // Functions can have qualifiers, user-defined return types and packed widths.
  for(const m of clean.matchAll(/\b(function|task)\s+([^;()]*?)([a-zA-Z_][\w$]*)\s*(?=\(|;)/g)){
   if(keywords.includes(m[3]))continue;
   const offset=m.index+m[0].lastIndexOf(m[3]);add(m[3],m[1],offset);
   const symbol=symbols.at(-1);const end=clean.indexOf(';',offset);
   if(symbol&&symbol.name===m[3]&&end>=0)symbol.declaration=file.source.slice(m.index,end+1).trim();
  }
  for(const m of clean.matchAll(/\b(input|output|inout|wire|reg|logic|bit|integer|int|genvar|parameter|localparam)\b\s*(?:(?:wire|reg|logic|bit|signed|unsigned|integer|int)\s+)*(?:\[[^\]]*\]\s*)*([a-zA-Z_][\w$]*)/g)){if(!keywords.includes(m[2]))add(m[2],m[1],m.index+m[0].lastIndexOf(m[2]));}
 }return symbols;}
export function basicIssues(file:HDLFile):BasicIssue[]{if(!/\.(sv|v|svh|vh)$/i.test(file.name))return [];const clean=maskHDL(file.source),stack:{char:string;offset:number}[]=[],issues:BasicIssue[]=[];const pairs:Record<string,string>={')':'(',']':'[','}':'{'};
 for(let i=0;i<clean.length&&issues.length<50;i++){const char=clean[i];if('([{'.includes(char))stack.push({char,offset:i});else if(pairs[char]){if(stack.at(-1)?.char===pairs[char])stack.pop();else issues.push({file:file.name,...position(clean,i),message:`짝이 맞지 않는 ${char} · 기본 검사`});}}
 for(const item of stack.slice(0,50-issues.length))issues.push({file:file.name,...position(clean,item.offset),message:`닫히지 않은 ${item.char} · 기본 검사`});return issues;
}
export function moduleSnippet(symbol:SymbolInfo){return `${symbol.name} \${1:u_${symbol.name}} (\n${(symbol.ports||[]).map((port,i)=>`  .${port}(\${${i+2}:${port}})`).join(',\n')}\n);$0`;}

export const systemFunctions = [
 {name:'$display',signature:'$display(format, ...args)',description:'포맷 문자열과 값을 출력하고 줄을 바꿉니다. %b, %h, %d, %t 등을 사용할 수 있습니다.'},
 {name:'$write',signature:'$write(format, ...args)',description:'줄바꿈 없이 포맷 문자열과 값을 출력합니다.'},
 {name:'$monitor',signature:'$monitor(format, ...args)',description:'인수 값이 변할 때 현재 값을 출력합니다.'},
 {name:'$clog2',signature:'$clog2(value)',description:'log₂(value)를 올림한 정수입니다. 주소나 카운터의 비트 폭 계산에 사용합니다.'},
 {name:'$bits',signature:'$bits(expression_or_type)',description:'표현식 또는 데이터 타입의 비트 수를 반환합니다.'},
 {name:'$signed',signature:'$signed(expression)',description:'표현식을 같은 비트 폭의 signed 값으로 해석합니다.'},
 {name:'$unsigned',signature:'$unsigned(expression)',description:'표현식을 같은 비트 폭의 unsigned 값으로 해석합니다.'},
 {name:'$time',signature:'$time',description:'현재 시뮬레이션 시간을 정수로 반환합니다.'},
 {name:'$realtime',signature:'$realtime',description:'현재 시뮬레이션 시간을 실수로 반환합니다.'},
 {name:'$dumpfile',signature:'$dumpfile(filename)',description:'VCD 파형을 기록할 파일 이름을 지정합니다.'},
 {name:'$dumpvars',signature:'$dumpvars(depth, scope, ...)',description:'지정한 계층의 신호를 VCD 파형 기록에 추가합니다. depth 0은 모든 하위 계층을 포함합니다.'},
 {name:'$readmemh',signature:'$readmemh(filename, memory [, start, finish])',description:'16진수 텍스트 파일을 메모리 배열에 읽습니다.'},
 {name:'$readmemb',signature:'$readmemb(filename, memory [, start, finish])',description:'2진수 텍스트 파일을 메모리 배열에 읽습니다.'},
 {name:'$urandom',signature:'$urandom([seed])',description:'32비트 unsigned 의사 난수를 반환합니다.'},
 {name:'$urandom_range',signature:'$urandom_range(maxval [, minval])',description:'지정한 닫힌 구간의 unsigned 의사 난수를 반환합니다.'},
 {name:'$finish',signature:'$finish([diagnostic_level])',description:'시뮬레이션을 종료합니다.'},
 {name:'$stop',signature:'$stop([diagnostic_level])',description:'시뮬레이션을 일시 정지합니다. 실행 엔진에 따라 동작이 달라집니다.'},
 {name:'$fatal',signature:'$fatal([finish_number, format, ...args])',description:'치명적 오류를 출력하고 시뮬레이션을 종료합니다.'},
 {name:'$error',signature:'$error([format, ...args])',description:'오류 메시지를 출력합니다.'},
 {name:'$warning',signature:'$warning([format, ...args])',description:'경고 메시지를 출력합니다.'},
];

export function completionsForFile(path:string){const language=hdlDialect(path);if(language==='text')return {keywords:[],functions:[],snippets:[]};return {
 keywords:language==='verilog'?verilogKeywords:[...new Set([...verilogKeywords,...keywords])],
 functions:systemFunctions.filter(f=>language==='systemverilog'||!svSystemFunctions.has(f.name)),
 snippets:snippets.map(s=>language==='verilog'?{...s,body:s.body.replace(/\blogic\b/g,'reg')}:s),
};}

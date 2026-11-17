export function validProjectPath(name:string){const parts=name.split('/');return name.length<=240&&parts.length<=8&&parts.every(p=>/^[a-zA-Z0-9_.-]+$/.test(p)&&p!=='.'&&p!=='..'&&p.length<=100)&&(/\.(v|sv|vh|svh|md|txt|json|toml|sdc|xdc|mem|hex)$/i.test(parts.at(-1)||'')||parts.at(-1)==='.gitignore');}
export type HDLFile={name:string;source:string};
export type HDLProject={version:1;title:string;top:string;files:HDLFile[];folders?:string[]};
export function parseHDL(value:unknown):HDLProject{
 const d=value as HDLProject;
 if(!d||d.version!==1||typeof d.title!=='string'||d.title.length>120||typeof d.top!=='string'||!/^([a-zA-Z_][\w$]*)?$/.test(d.top)||d.top.length>80||!Array.isArray(d.files)||d.files.length<1||d.files.length>20)throw new Error('HDL 프로젝트 형식을 확인해주세요. 파일은 1~20개까지 지원해요.');
 const names=new Set<string>();let bytes=0;
 for(const f of d.files){if(!f||typeof f.name!=='string'||!validProjectPath(f.name)||names.has(f.name.toLowerCase())||typeof f.source!=='string')throw new Error('중복되지 않는 상대 경로와 지원되는 텍스트 확장자를 사용해주세요.');names.add(f.name.toLowerCase());bytes+=new TextEncoder().encode(f.source).length;}
 const folders=d.folders;
 if(folders!==undefined&&(!Array.isArray(folders)||folders.length>100||folders.some(f=>typeof f!=='string'||f.length>240||f.split('/').length>7||!f.split('/').every(p=>/^[a-zA-Z0-9_.-]+$/.test(p)&&p!=='.'&&p!=='..'&&p.length<=100))))throw new Error('폴더 경로를 확인해주세요. 폴더는 최대 100개까지 지원해요.');
 const directories=new Set<string>();
 for(const path of [...(folders||[]),...d.files.map(f=>f.name.includes('/')?f.name.slice(0,f.name.lastIndexOf('/')):'')]){const parts=path.split('/').filter(Boolean);for(let i=1;i<=parts.length;i++)directories.add(parts.slice(0,i).join('/').toLowerCase());}
 if([...names].some(name=>directories.has(name)))throw new Error('파일과 폴더에 같은 경로를 사용할 수 없어요.');
 if(bytes>256*1024)throw new Error('소스 파일 합계는 256KB까지 지원해요.');
 return {version:1,title:d.title,top:d.top,files:d.files.map(f=>({name:f.name,source:f.source})),...(folders?{folders:[...new Set(folders)]}:{})};
}
export function emptyHDL():HDLProject{return {version:1,title:'Verilog 프로젝트',top:'tb',files:[{name:'rtl/design.sv',source:'module counter (input logic clk, input logic rst, output logic [3:0] count);\n  always_ff @(posedge clk) begin\n    if (rst) count <= 0;\n    else count <= count + 1;\n  end\nendmodule\n'},{name:'tb/tb.sv',source:'`timescale 1ns/1ps\nmodule tb;\n  logic clk = 0;\n  logic rst = 1;\n  logic [3:0] count;\n  counter dut(.clk(clk), .rst(rst), .count(count));\n  always #5 clk = ~clk;\n  initial begin\n    $dumpfile("wave.vcd");\n    $dumpvars(0, tb);\n    #12 rst = 0;\n    #100 $finish;\n  end\nendmodule\n'}]};}
export function hdlFromCode(source:string):HDLProject{return parseHDL({version:1,title:'Verilog 코드',top:'',files:[{name:'rtl/design.sv',source}]});}

export function validateHDLBlocks(value:unknown){if(!value||typeof value!=='object')return;const node=value as {type?:string;attrs?:{data?:unknown};content?:unknown[]};if(node.type==='verilogProject')parseHDL(node.attrs?.data);if(Array.isArray(node.content))node.content.forEach(validateHDLBlocks);}

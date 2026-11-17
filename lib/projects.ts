import {emptyDiagram,parseDiagram,type DiagramData} from './diagram.ts';
import {emptySchematic,parseSchematic,type Schematic} from './schematic.ts';
import {emptyHDL,parseHDL,type HDLProject} from './verilog/project.ts';
export type Project = {version:1;id:string;kind:'diagram';data:DiagramData}|{version:1;id:string;kind:'schematic';data:Schematic}|{version:1;id:string;kind:'verilog';data:HDLProject};
export const STORAGE_KEY='moon-notion-tools.projects.v1';
export function parseProject(input:unknown):Project {
 const p=input as Partial<Project>;
 if(!p||p.version!==1||typeof p.id!=='string'||!p.id||p.id.length>100)throw new Error('프로젝트 파일 형식을 확인해주세요.');
 if(p.kind==='diagram')return {version:1,id:p.id,kind:p.kind,data:parseDiagram(p.data)};
 if(p.kind==='schematic')return {version:1,id:p.id,kind:p.kind,data:parseSchematic(p.data)};
 if(p.kind==='verilog')return {version:1,id:p.id,kind:p.kind,data:parseHDL(p.data)};
 throw new Error('지원하지 않는 프로젝트예요.');
}
export function createProject(kind:Project['kind']):Project {
 const base={version:1 as const,id:crypto.randomUUID()};
 if(kind==='diagram')return {...base,kind,data:emptyDiagram()};
 if(kind==='schematic')return {...base,kind,data:emptySchematic()};
 return {...base,kind,data:emptyHDL()};
}
export function encodeSnapshot(project:Project):string {
 const bytes=new TextEncoder().encode(JSON.stringify(parseProject(project)));
 const encoded=btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
 if(encoded.length>24000)throw new Error('이 프로젝트는 링크에 담기에 커요. JSON 내보내기를 이용해주세요.');
 return encoded;
}
export function decodeSnapshot(value:string):Project {
 if(!value||value.length>24000||!/^[\w-]+$/.test(value))throw new Error('올바른 스냅샷 링크가 아니에요.');
 const decoded=atob(value.replaceAll('-','+').replaceAll('_','/'));
 return parseProject(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(decoded,c=>c.charCodeAt(0)))));
}

import {parseHDL,type HDLProject} from './project.ts';
export const fileName=(path:string)=>path.split('/').at(-1)!;
export const parentFolder=(path:string)=>path.includes('/')?path.slice(0,path.lastIndexOf('/')):'';
export function projectFolders(project:HDLProject){
 const folders=new Set(['rtl','tb',...(project.folders||[])]);
 for(const path of [...project.files.map(f=>parentFolder(f.name)),...folders]){
  const pieces=path.split('/').filter(Boolean);for(let i=1;i<=pieces.length;i++)folders.add(pieces.slice(0,i).join('/'));
 }
 return [...folders].sort();
}
export function validBaseName(name:string){return /^[a-zA-Z0-9_.-]+$/.test(name)&&name!=='.'&&name!=='..'&&name.length<=100;}
export function addProjectFolder(project:HDLProject,parent:string,name:string){
 if(!validBaseName(name))throw new Error('폴더 이름만 입력해주세요.');
 const path=parent?`${parent}/${name}`:name;
 if(parent&&!projectFolders(project).includes(parent))throw new Error('대상 폴더가 없어요.');
 if(projectFolders(project).some(f=>f.toLowerCase()===path.toLowerCase())||project.files.some(f=>f.name.toLowerCase()===path.toLowerCase()))throw new Error('같은 이름의 파일 또는 폴더가 있어요.');
 return parseHDL({...project,folders:[...projectFolders(project),path]});
}
export function renameProjectFile(project:HDLProject,source:string,name:string){
 if(!validBaseName(name))throw new Error('경로 없이 파일 이름만 입력해주세요.');
 if(!project.files.some(f=>f.name===source))throw new Error('파일을 찾을 수 없어요.');
 const parent=parentFolder(source),target=parent?`${parent}/${name}`:name;
 return {project:parseHDL({...project,folders:projectFolders(project),files:project.files.map(f=>f.name===source?{...f,name:target}:f)}),paths:new Map([[source,target]])};
}
export function moveProjectFiles(project:HDLProject,sources:string[],folder:string){
 const unique=new Set(sources);
 if(!unique.size||sources.some(name=>!project.files.some(f=>f.name===name)))throw new Error('이동할 파일을 확인해주세요.');
 if(folder&&!projectFolders(project).includes(folder))throw new Error('대상 폴더가 없어요.');
 const paths=new Map([...unique].map(name=>[name,folder?`${folder}/${fileName(name)}`:fileName(name)]));
 // Validate the complete move first: duplicate destinations never overwrite files.
 const next=parseHDL({...project,folders:projectFolders(project),files:project.files.map(f=>({...f,name:paths.get(f.name)||f.name}))});
 return {project:next,paths};
}
export function rangeSelection(order:string[],anchor:string,target:string,previous:string[],additive:boolean){
 const a=order.indexOf(anchor),b=order.indexOf(target);if(a<0||b<0)return [target];
 return [...new Set([...(additive?previous:[]),...order.slice(Math.min(a,b),Math.max(a,b)+1)])];
}

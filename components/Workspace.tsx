'use client';
import {useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import {Pencil} from 'lucide-react';
import {createProject,parseProject,encodeSnapshot,decodeSnapshot,STORAGE_KEY,type Project} from '@/lib/projects';
import {downloadJSON} from '@/lib/storage';
import SchematicCanvas from './schematic/SchematicCanvas';
const Circuit=dynamic(()=>import('./schematic/SchematicDialog'),{ssr:false});
const LegacyDiagram=dynamic(()=>import('./diagram/DiagramCanvas').then(m=>m.DiagramCanvas),{ssr:false});
type CircuitProject=Extract<Project,{kind:'schematic'}>;
export default function Workspace({embed=false}:{embed?:boolean}){
 const [projects,setProjects]=useState<Project[]>([]),[selected,setSelected]=useState<Project|null>(null),[editing,setEditing]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[ready,setReady]=useState(false);
 useEffect(()=>{if(embed){const load=()=>{try{setSelected(decodeSnapshot(location.hash.slice(1)));setError('');}catch{setError('올바른 회로 링크가 아니에요.');}};load();setReady(true);window.addEventListener('hashchange',load);return()=>window.removeEventListener('hashchange',load);}try{const saved=localStorage.getItem(STORAGE_KEY);if(saved)setProjects((JSON.parse(saved) as unknown[]).map(parseProject));}catch{setError('브라우저 저장소를 읽지 못했어요. JSON으로 백업해주세요.');}try{const p=location.hash?{...decodeSnapshot(location.hash.slice(1)),id:crypto.randomUUID()}:createProject('schematic');setSelected(p);setEditing(p.kind==='schematic');}catch{setSelected(createProject('schematic'));setEditing(true);setError('링크를 읽지 못해 빈 회로를 열었어요.');}setReady(true);},[embed]);
 function persist(p:Project){const checked=parseProject(p);const next=[checked,...projects.filter(x=>x.id!==checked.id)];localStorage.setItem(STORAGE_KEY,JSON.stringify(next));setProjects(next);setSelected(checked);}
 async function copy(p:Project){await navigator.clipboard.writeText(`${location.origin}/embed/#${encodeSnapshot(p)}`);}
 async function importFile(file?:File){if(!file)return;try{if(file.size>2_000_000)throw new Error('2MB 이하 JSON 파일을 선택해주세요.');const p=parseProject(JSON.parse(await file.text()));if(p.kind!=='schematic')throw new Error('회로 프로젝트를 선택해주세요.');const next={...p,id:crypto.randomUUID()};persist(next);setEditing(true);}catch(e){setError(e instanceof Error?e.message:'파일을 열지 못했어요.');}}
 function remove(p:Project){if(!confirm('이 브라우저에서 프로젝트를 삭제할까요? 내보낸 파일과 embed 링크는 유지돼요.'))return;try{const next=projects.filter(x=>x.id!==p.id);localStorage.setItem(STORAGE_KEY,JSON.stringify(next));setProjects(next);if(selected?.id===p.id)setSelected(null);}catch{setError('삭제하지 못했어요.');}}
 if(embed)return <main className="circuit-embed">{error&&<p role="alert">{error}</p>}{selected?.kind==='schematic'&&<><SchematicCanvas data={selected.data}/><a className="embed-edit" aria-label="회로 사본 편집" title="회로 사본 편집" target="_blank" rel="noopener noreferrer" href={`/#${encodeSnapshot(selected)}`}><Pencil size={17}/></a></>}{selected?.kind==='diagram'&&<LegacyDiagram data={selected.data} fit/>}{selected?.kind==='verilog'&&<pre>기존 Pulse 스냅샷은 JSON으로 보관해주세요.</pre>}</main>;
 const current=selected?.kind==='schematic'?selected as CircuitProject:null;
 return <main className="workspace-shell"><header className="workspace-header"><h1>회로 프로젝트</h1><button onClick={()=>{setSelected(createProject('schematic'));setEditing(true);}}>새 회로</button></header><nav className="project-actions"><label className="button">프로젝트 JSON 가져오기<input hidden type="file" accept=".json,application/json" onChange={e=>{void importFile(e.target.files?.[0]);e.target.value='';}}/></label></nav>{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}{!ready&&<p>불러오는 중…</p>}
 <section className="project-list">{projects.map(p=><article key={p.id}><button className="project-title" disabled={p.kind!=='schematic'} onClick={()=>{setSelected(p);setEditing(true);}}>{p.data.title}</button>{p.kind==='schematic'&&<button onClick={()=>void copy(p).then(()=>setNotice('현재 상태의 embed 링크를 복사했어요.')).catch(()=>setError('링크를 복사하지 못했어요.'))}>embed 링크</button>}<button onClick={()=>downloadJSON(p,`${p.kind}.json`)}>내보내기</button><button aria-label={`${p.data.title} 삭제`} onClick={()=>remove(p)}>삭제</button></article>)}</section>
 {editing&&current&&<Circuit key={current.id} initial={current.data} editable mode="project" onApply={data=>persist({...current,data})} onShare={data=>copy({...current,data})} onLibrary={()=>setEditing(false)} onClose={()=>setEditing(false)}/>}
 </main>;
}

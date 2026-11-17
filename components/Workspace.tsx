'use client';
import {useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import {createProject,parseProject,encodeSnapshot,decodeSnapshot,STORAGE_KEY,type Project} from '@/lib/projects';
import {downloadJSON} from '@/lib/storage';
import {DiagramCanvas} from './diagram/DiagramCanvas';
import SchematicCanvas from './schematic/SchematicCanvas';
const Diagram=dynamic(()=>import('./diagram/DiagramDialog'),{ssr:false});
const Circuit=dynamic(()=>import('./schematic/SchematicDialog'),{ssr:false});
const Pulse=dynamic(()=>import('./verilog/VerilogDialog'),{ssr:false});
const Simulation=dynamic(()=>import('./schematic/SimulationPanel'),{ssr:false});
const names={diagram:'블록 다이어그램',schematic:'회로 설계·시뮬레이션',verilog:'Pulse Web'};
export default function Workspace({embed=false}:{embed?:boolean}){
 const [projects,setProjects]=useState<Project[]>([]),[selected,setSelected]=useState<Project|null>(null),[editing,setEditing]=useState(false),[simulation,setSimulation]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[ready,setReady]=useState(false);
 useEffect(()=>{try{if(embed){setSelected(decodeSnapshot(location.hash.slice(1)));}else{const saved=localStorage.getItem(STORAGE_KEY);if(saved)setProjects((JSON.parse(saved) as unknown[]).map(parseProject));if(location.hash){setSelected({...decodeSnapshot(location.hash.slice(1)),id:crypto.randomUUID()});setNotice('스냅샷을 열었어요. 저장하면 이 브라우저에 사본이 생겨요.');}}}catch(e){setError(e instanceof Error?e.message:'프로젝트를 불러오지 못했어요.');}setReady(true);},[embed]);
 function persist(p:Project){const checked=parseProject(p);const next=[checked,...projects.filter(x=>x.id!==checked.id)];localStorage.setItem(STORAGE_KEY,JSON.stringify(next));setProjects(next);setSelected(checked);setNotice('이 브라우저에 저장했어요.');}
 function save(p:Project){persist(p);setEditing(false);}
 async function copy(p:Project){try{const url=`${location.origin}/embed/#${encodeSnapshot(p)}`;await navigator.clipboard.writeText(url);setNotice('embed 링크 복사 완료 · 현재 상태가 고정된 링크예요. 링크를 아는 사람은 내용을 볼 수 있어요.');}catch(e){setError(e instanceof Error?e.message:'링크 복사에 실패했어요.');}}
 async function importFile(file?:File){if(!file)return;try{if(file.size>2_000_000)throw new Error('2MB 이하 JSON 파일을 선택해주세요.');const p=parseProject(JSON.parse(await file.text()));persist({...p,id:crypto.randomUUID()});}catch(e){setError(e instanceof Error?e.message:'파일을 열지 못했어요.');}}
 function remove(p:Project){if(!confirm('이 브라우저에서 프로젝트를 삭제할까요? 내보낸 파일과 embed 링크는 유지돼요.'))return;try{const next=projects.filter(x=>x.id!==p.id);localStorage.setItem(STORAGE_KEY,JSON.stringify(next));setProjects(next);if(selected?.id===p.id)setSelected(null);}catch{setError('삭제하지 못했어요.');}}
 return <main className={embed?'embed-shell':'workspace-shell'}>
 <header className="workspace-header"><h1>{embed?(selected?.data.title||'Moon Tools'):'Moon Tools'}</h1>{embed&&selected&&<a className="button" target="_blank" rel="noopener noreferrer" href={`/#${encodeSnapshot(selected)}`}>편집기로 열기</a>}</header>
 {!embed&&<><p className="storage-note">이 브라우저에 저장 · 다른 기기로 옮기려면 JSON 내보내기</p><nav className="project-actions">{(Object.keys(names) as Project['kind'][]).map(kind=><button key={kind} onClick={()=>{setSelected(createProject(kind));setEditing(true);}}>{names[kind]} +</button>)}<label className="button">JSON 가져오기<input hidden type="file" accept=".json,application/json" onChange={e=>{void importFile(e.target.files?.[0]);e.target.value='';}}/></label></nav></>}
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {!ready&&<p>불러오는 중…</p>}
 {!embed&&<section className="project-list">{projects.map(p=><article key={p.id}><button className="project-title" onClick={()=>{setSelected(p);setSimulation(false);}}>{p.data.title}<small>{names[p.kind]}</small></button><button onClick={()=>{setSelected(p);setEditing(true);}}>편집</button><button onClick={()=>void copy(p)}>embed 링크</button><button onClick={()=>downloadJSON(p,`${p.kind}.json`)}>내보내기</button><button aria-label={`${p.data.title} 삭제`} onClick={()=>remove(p)}>삭제</button></article>)}</section>}
 {selected&&<section className="project-preview">{!embed&&<h2>{selected.data.title}</h2>}{selected.kind==='diagram'?<DiagramCanvas data={selected.data} fit/>:selected.kind==='schematic'?<><SchematicCanvas data={selected.data}/><button onClick={()=>setSimulation(v=>!v)}>시뮬레이션</button>{simulation&&<Simulation data={selected.data}/>}</>:<><p>Verilog 컴파일러 미연결 · 소스 편집 및 VCD 파형 보기를 지원해요.</p>{selected.data.files.map(f=><details key={f.name} open><summary>{f.name}</summary><pre><code>{f.source}</code></pre></details>)}</>}</section>}
 {editing&&selected?.kind==='diagram'&&<Diagram initial={selected.data} editable mode="project" onApply={data=>save({...selected,data})} onClose={()=>setEditing(false)}/>}
 {editing&&selected?.kind==='schematic'&&<Circuit initial={selected.data} editable mode="project" onApply={data=>save({...selected,data})} onClose={()=>setEditing(false)}/>}
 {editing&&selected?.kind==='verilog'&&<Pulse initial={selected.data} mode="project" onSave={data=>save({...selected,data})} onClose={()=>setEditing(false)}/>}
 {!embed&&selected&&!projects.some(p=>p.id===selected.id)&&<button onClick={()=>setEditing(true)}>이 사본 편집</button>}
 </main>;
}

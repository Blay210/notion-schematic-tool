'use client';
import {useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import {Pencil} from 'lucide-react';
import {createProject,encodeSnapshot,decodeSnapshot,type Project} from '@/lib/projects';
import SchematicCanvas from './schematic/SchematicCanvas';
const Circuit=dynamic(()=>import('./schematic/SchematicDialog'),{ssr:false});
const LegacyDiagram=dynamic(()=>import('./diagram/DiagramCanvas').then(m=>m.DiagramCanvas),{ssr:false});
export default function Workspace({embed=false}:{embed?:boolean}){
 const [selected,setSelected]=useState<Project|null>(null),[error,setError]=useState('');
 useEffect(()=>{const load=()=>{try{setSelected(location.hash?decodeSnapshot(location.hash.slice(1)):embed?null:createProject('schematic'));setError('');}catch{setError('이전 링크를 읽지 못했어요.');if(!embed)setSelected(createProject('schematic'));}};load();window.addEventListener('hashchange',load);return()=>window.removeEventListener('hashchange',load);},[embed]);
 if(embed)return <main className="circuit-embed">{error&&<p role="alert">{error}</p>}{selected?.kind==='schematic'&&<><SchematicCanvas data={selected.data}/><a className="embed-edit" aria-label="회로 사본 편집" title="회로 사본 편집" target="_blank" rel="noopener noreferrer" href={`/#${encodeSnapshot(selected)}`}><Pencil size={17}/></a></>}{selected?.kind==='diagram'&&<LegacyDiagram data={selected.data} fit/>}{selected?.kind==='verilog'&&<pre>기존 Pulse 스냅샷은 JSON으로 보관해주세요.</pre>}</main>;
 return <main>{error&&<p role="alert">{error}</p>}{selected?.kind==='schematic'?<Circuit key={selected.id} initial={selected.data}/>:<p>불러오는 중…</p>}</main>;
}

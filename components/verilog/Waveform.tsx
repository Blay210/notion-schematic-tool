'use client';
import {useEffect,useRef,useState} from 'react';
import type {WaveData,WaveSignal,Change} from '@/lib/verilog/model';
function valueAt(changes:Change[],time:bigint){let lo=0,hi=changes.length;while(lo<hi){const mid=(lo+hi)>>1;if(BigInt(changes[mid].time)<=time)lo=mid+1;else hi=mid;}return lo?changes[lo-1].value:'x';}
function display(value:string){return /^[01]{2,}$/.test(value)?`0x${BigInt('0b'+value).toString(16)}`:value;}
export default function Waveform(){
 const [data,setData]=useState<WaveData|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[selected,setSelected]=useState<string[]>([]),[filter,setFilter]=useState(''),[cursor,setCursor]=useState(0),[fileName,setFileName]=useState('');
 const worker=useRef<Worker|null>(null),generation=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 function stop(){generation.current++;worker.current?.terminate();worker.current=null;if(timer.current)clearTimeout(timer.current);timer.current=null;}
 useEffect(()=>()=>stop(),[]);
 async function load(file:File){stop();const request=generation.current;setError('');setData(null);setSelected([]);setBusy(true);setFileName(file.name);
  try{if(file.size>4*1024*1024)throw new Error('VCD는 4MB까지 열 수 있어요.');const text=await file.text();if(request!==generation.current)return;const w=new Worker('/workers/vcd-worker.js',{type:'module'});worker.current=w;
   const fail=(message:string)=>{if(request!==generation.current)return;stop();setBusy(false);setError(message);};
   timer.current=setTimeout(()=>fail('VCD 분석 시간이 초과됐어요. 더 작은 파형 파일을 선택해주세요.'),10000);
   w.onerror=()=>fail('파형 분석기를 실행하지 못했어요. 다시 열어주세요.');
   w.onmessage=(e:MessageEvent<{data?:WaveData;error?:string}>)=>{if(request!==generation.current)return;if(e.data.error){fail(e.data.error);return;}stop();setBusy(false);if(e.data.data){setData(e.data.data);setCursor(0);setSelected(e.data.data.signals.slice(0,4).map(s=>s.id));}};w.postMessage(text);
  }catch(e){if(request===generation.current){stop();setBusy(false);setError(e instanceof Error?e.message:'파형을 읽지 못했어요.');}}
 }
 const end=data?BigInt(data.end):0n,time=end*BigInt(cursor)/1000n;
 function row(s:WaveSignal){const changes=data!.channels.get(s.code)||[];const x=(t:string)=>40+(end?Number(BigInt(t)*1000000n/end)/1000000:0)*720;
  const digital=s.width===1&&s.type!=='real';const points=changes.length<=(digital?3000:40)?changes:[];const level=(value:string)=>value==='1'?12:value==='0'?38:25;
  let path='';if(digital&&points.length){let y=level(points[0].value);path=`M${x(points[0].time)} ${y}`;for(const c of points.slice(1)){path+=` H${x(c.time)} V${level(c.value)}`;}path+=' H760';}
  return <div className="wave-row" key={s.id}><div className="wave-label" title={s.path}><strong>{s.path}</strong><code>{display(valueAt(changes,time))}</code></div><svg viewBox="0 0 800 50" role="img" aria-label={`${s.path} 파형`}><line x1={40} x2={760} y1={38} y2={38} stroke="#ddd"/>{points.length?(digital?<><path d={path} fill="none" stroke="#8063ab" strokeWidth={2}/>{points.filter(c=>/[xz]/.test(c.value)).map(c=><text key={c.time} x={x(c.time)} y={25} fill="#a56b7d">{c.value}</text>)}</>:<><path d="M40 12H760 M40 38H760" stroke="#9981bb"/>{points.slice(0,40).map(c=><g key={c.time}><line x1={x(c.time)} x2={x(c.time)} y1={12} y2={38} stroke="#9981bb"/><text x={x(c.time)+3} y={29}>{display(c.value).slice(0,18)}</text></g>)}</>):<text x={40} y={28}>{changes.length?'변화가 많아 그래프 생략 · 커서 값 확인 가능':'값 없음'}</text>}<line x1={40+cursor*.72} x2={40+cursor*.72} y1={0} y2={50} stroke="#c3a97f"/></svg></div>;
 }
 return <section className="hdl-wave"><div className="hdl-wave-toolbar"><label className="button small secondary">VCD 열기<input hidden type="file" accept=".vcd" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void load(f);}}/></label>{busy&&<button onClick={()=>{stop();setBusy(false);}}>분석 취소</button>}<small>{fileName||'로컬 시뮬레이션 결과 파일'}</small></div>{busy&&<p role="status">파형 분석 중…</p>}{error&&<p role="alert">{error}</p>}{data&&<><div className="wave-controls"><input aria-label="파형 신호 검색" placeholder="신호 검색" value={filter} onChange={e=>setFilter(e.target.value)}/><span>커서 {time.toString()} × {data.timescale.magnitude} {data.timescale.unit}</span><input type="range" aria-label="파형 시간 커서" min={0} max={1000} value={cursor} onChange={e=>setCursor(Number(e.target.value))}/></div><div className="wave-signals">{data.signals.filter(s=>s.path.toLowerCase().includes(filter.toLowerCase())).slice(0,80).map(s=><label key={s.id}><input type="checkbox" checked={selected.includes(s.id)} disabled={!selected.includes(s.id)&&selected.length>=8} onChange={e=>setSelected(v=>e.target.checked?[...v,s.id]:v.filter(id=>id!==s.id))}/>{s.path}</label>)}</div>{data.signals.filter(s=>selected.includes(s.id)).map(row)}<small>끝 {data.end} × {data.timescale.magnitude} {data.timescale.unit} · 최대 8개 신호 표시 · 변화가 많은 신호는 그래프 대신 커서 값으로 확인해요.</small>{data.warnings.map(w=><p key={w}>{w}</p>)}</>}</section>;
}

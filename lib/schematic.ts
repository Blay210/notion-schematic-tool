export const PARTS={resistor:{name:'저항',prefix:'R',pins:['1','2']},capacitor:{name:'커패시터',prefix:'C',pins:['1','2']},inductor:{name:'인덕터',prefix:'L',pins:['1','2']},voltage:{name:'전압원',prefix:'V',pins:['+','-']},current:{name:'전류원',prefix:'I',pins:['+','-']},diode:{name:'다이오드',prefix:'D',pins:['A','K']},ground:{name:'접지',prefix:'G',pins:['0']},junction:{name:'접속점',prefix:'J',pins:['●']}} as const;
export type PartKind=keyof typeof PARTS;
export type Part={id:string;kind:PartKind;ref:string;value:string;x:number;y:number;rotation:0|90|180|270};
export type Terminal={part:string;pin:number};
export type Wire={id:string;a:Terminal;b:Terminal;bend:'horizontal'|'vertical';points?:Point[]};
export type Schematic={version:1;title:string;parts:Part[];wires:Wire[]};
export const SHEET={width:4000,height:3000};
export function emptySchematic():Schematic{return {version:1,title:'회로 스키메틱',parts:[],wires:[]};}
export function terminalKey(t:Terminal){return `${t.part}:${t.pin}`;}
export function sameTerminal(a:Terminal,b:Terminal){return a.part===b.part&&a.pin===b.pin;}
export const GRID=10;
export function snap(n:number){return Math.round(n/GRID)*GRID;}
export function pinPosition(p:Part,pin:number){const offset=PARTS[p.kind].pins.length===1?0:pin===0?-60:60;const angle=p.rotation*Math.PI/180;return {x:p.x+snap(offset*Math.cos(angle)),y:p.y+snap(offset*Math.sin(angle))};}
export function movePart(p:Part,x:number,y:number):Part{return {...p,x:Math.max(p.kind==='junction'?0:80,Math.min(SHEET.width-(p.kind==='junction'?0:80),snap(x))),y:Math.max(p.kind==='junction'?0:80,Math.min(SHEET.height-(p.kind==='junction'?0:80),snap(y)))};}
export function removePart(d:Schematic,id:string):Schematic{return {...d,parts:d.parts.filter(p=>p.id!==id),wires:d.wires.filter(w=>w.a.part!==id&&w.b.part!==id)};}
export function nextRef(d:Schematic,kind:PartKind){let i=1;while(d.parts.some(p=>p.ref.toLowerCase()===`${PARTS[kind].prefix}${i}`.toLowerCase()))i++;return `${PARTS[kind].prefix}${i}`;}
export function parseSchematic(value:unknown):Schematic{
 const d=value as Schematic;const fail=()=>{throw new Error('회로 원본 형식이 올바르지 않아요. 소자 이름·핀·배선을 확인해주세요.');};
 if(!d||d.version!==1||typeof d.title!=='string'||d.title.length>120||!Array.isArray(d.parts)||!Array.isArray(d.wires)||d.parts.length>100||d.wires.length>200)return fail();
 const ids=new Set<string>(),refs=new Set<string>();
 for(const p of d.parts){if(!p||typeof p.id!=='string'||! /^[a-zA-Z0-9_-]{1,80}$/.test(p.id)||ids.has(p.id)||!Object.hasOwn(PARTS,p.kind)||typeof p.ref!=='string'||! /^[a-zA-Z][a-zA-Z0-9_]{0,19}$/.test(p.ref)||refs.has(p.ref.toLowerCase())||typeof p.value!=='string'||p.value.length>100||!Number.isFinite(p.x)||p.x<(p.kind==='junction'?0:80)||p.x>SHEET.width-(p.kind==='junction'?0:80)||!Number.isFinite(p.y)||p.y<(p.kind==='junction'?0:80)||p.y>SHEET.height-(p.kind==='junction'?0:80)||![0,45,90,135,180,225,270,315].includes(p.rotation))return fail();ids.add(p.id);refs.add(p.ref.toLowerCase());}
 const pairs=new Set<string>();
 const valid=(t:Terminal)=>{if(!t)return false;const p=d.parts.find(p=>p.id===t.part);return p&&Number.isInteger(t.pin)&&t.pin>=0&&t.pin<PARTS[p.kind].pins.length;};
 for(const w of d.wires){if(!w||typeof w.id!=='string'||! /^[a-zA-Z0-9_-]{1,80}$/.test(w.id)||ids.has(w.id)||!valid(w.a)||!valid(w.b)||sameTerminal(w.a,w.b)||!['horizontal','vertical'].includes(w.bend))return fail();if(w.points!==undefined&&(!Array.isArray(w.points)||w.points.length>200||w.points.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.y<0||p.x>SHEET.width||p.y>SHEET.height)))return fail();const pair=[terminalKey(w.a),terminalKey(w.b)].sort().join('|');if(pairs.has(pair))return fail();pairs.add(pair);ids.add(w.id);}
 return {version:1,title:d.title,parts:d.parts.map(p=>({id:p.id,kind:p.kind,ref:p.ref,value:p.value,x:p.x,y:p.y,rotation:((Math.round(p.rotation/90)*90)%360) as Part['rotation']})),wires:d.wires.map(w=>({id:w.id,a:{part:w.a.part,pin:w.a.pin},b:{part:w.b.part,pin:w.b.pin},bend:w.bend,...(w.points?{points:w.points.map(p=>({x:p.x,y:p.y}))}:{})}))};
}
export function connectionNets(d:Schematic){
 const keys=d.parts.flatMap(p=>PARTS[p.kind].pins.map((_,pin)=>terminalKey({part:p.id,pin})));
 const parent=new Map(keys.map(key=>[key,key]));const root=(key:string):string=>{const p=parent.get(key)!;return p===key?key:root(p);};const join=(a:string,b:string)=>{parent.set(root(b),root(a));};
 for(const w of d.wires)join(terminalKey(w.a),terminalKey(w.b));
 const grounds=d.parts.filter(p=>p.kind==='ground').map(p=>terminalKey({part:p.id,pin:0}));grounds.slice(1).forEach(g=>join(grounds[0],g));
 const groups=new Map<string,string[]>();for(const key of keys){const r=root(key);groups.set(r,[...(groups.get(r)||[]),key]);}
 let i=1;return [...groups.entries()].map(([r,pins])=>({name:grounds.length&&root(grounds[0])===r?'0':`N${i++}`,pins:pins.map(key=>{const [id,pin]=key.split(':');const p=d.parts.find(p=>p.id===id)!;return `${p.ref}.${PARTS[p.kind].pins[Number(pin)]}`;})}));
}
export function schematicWarnings(d:Schematic){const messages:string[]=[];if(d.parts.length&&!d.parts.some(p=>p.kind==='ground'))messages.push('접지가 없어요. 시뮬레이션용 회로라면 기준 노드가 필요해요.');const used=new Set(d.wires.flatMap(w=>[terminalKey(w.a),terminalKey(w.b)]));const loose=d.parts.flatMap(p=>PARTS[p.kind].pins.map((name,pin)=>({name:`${p.ref}.${name}`,key:terminalKey({part:p.id,pin})}))).filter(t=>!used.has(t.key));if(loose.length)messages.push(`배선되지 않은 핀: ${loose.map(t=>t.name).join(', ')}`);return messages;}
export function rcSchematic():Schematic{return parseSchematic({version:1,title:'RC 저역통과 회로',parts:[{id:'v',kind:'voltage',ref:'V1',value:'DC 5 V',x:240,y:340,rotation:90},{id:'r',kind:'resistor',ref:'R1',value:'1 kΩ',x:500,y:240,rotation:0},{id:'c',kind:'capacitor',ref:'C1',value:'1 µF',x:760,y:340,rotation:90},{id:'g',kind:'ground',ref:'G1',value:'',x:500,y:560,rotation:0}],wires:[{id:'w1',a:{part:'v',pin:0},b:{part:'r',pin:0},bend:'vertical'},{id:'w2',a:{part:'r',pin:1},b:{part:'c',pin:0},bend:'horizontal'},{id:'w3',a:{part:'v',pin:1},b:{part:'g',pin:0},bend:'vertical'},{id:'w4',a:{part:'c',pin:1},b:{part:'g',pin:0},bend:'vertical'}]});}
export function validateSchematics(value:unknown){if(!value||typeof value!=='object')return;const n=value as {type?:string;attrs?:{data?:unknown};content?:unknown[]};if(n.type==='schematic')parseSchematic(n.attrs?.data);if(Array.isArray(n.content))n.content.forEach(validateSchematics);}
export function rlSchematic():Schematic{const d=rcSchematic();return parseSchematic({...d,title:'RL 전류 상승',parts:d.parts.map(p=>p.id==='c'?{...p,kind:'inductor',ref:'L1',value:'10mH'}:p.id==='r'?{...p,value:'10ohm'}:p)});}
export function rlcSchematic():Schematic{const d=rcSchematic();return parseSchematic({...d,title:'RLC 직렬 과도응답',parts:[...d.parts.map(p=>p.id==='r'?{...p,value:'10ohm'}:p.id==='c'?{...p,x:1000,value:'10uF'}:p),{id:'l',kind:'inductor',ref:'L1',value:'10mH',x:740,y:240,rotation:0}],wires:[...d.wires.map(w=>w.id==='w2'?{...w,b:{part:'l',pin:0}}:w),{id:'w5',a:{part:'l',pin:1},b:{part:'c',pin:0},bend:'horizontal'}]});}

export type Point={x:number;y:number};
const equalPoint=(a:Point,b:Point)=>a.x===b.x&&a.y===b.y;
export function orthogonalRoute(points:Point[],bend:Wire['bend']='horizontal'):Point[]{
 const out:Point[]=[];for(const p of points){const prev=out.at(-1);if(prev&&!equalPoint(prev,p)&&prev.x!==p.x&&prev.y!==p.y)out.push(bend==='horizontal'?{x:p.x,y:prev.y}:{x:prev.x,y:p.y});if(!prev||!equalPoint(out.at(-1)!,p))out.push({...p});}
 for(let i=1;i<out.length-1;){const a=out[i-1],b=out[i],c=out[i+1];if((a.x===b.x&&b.x===c.x&&(b.y-a.y)*(c.y-b.y)>=0)||(a.y===b.y&&b.y===c.y&&(b.x-a.x)*(c.x-b.x)>=0))out.splice(i,1);else i++;}return out;
}
export function wirePoints(d:Schematic,w:Wire):Point[]{return orthogonalRoute([pinPosition(d.parts.find(p=>p.id===w.a.part)!,w.a.pin),...(w.points||[]),pinPosition(d.parts.find(p=>p.id===w.b.part)!,w.b.pin)],w.bend);}
export function nearestWireSegment(d:Schematic,w:Wire,point:Point){const pts=wirePoints(d,w);let best={index:0,point:pts[0],distance:Infinity};for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];const p={x:a.x===b.x?a.x:Math.max(Math.min(a.x,b.x),Math.min(Math.max(a.x,b.x),snap(point.x))),y:a.y===b.y?a.y:Math.max(Math.min(a.y,b.y),Math.min(Math.max(a.y,b.y),snap(point.y)))};const distance=Math.hypot(p.x-point.x,p.y-point.y);if(distance<best.distance)best={index:i,point:p,distance};}return best;}
export function moveWireSegment(d:Schematic,id:string,index:number,delta:number):Schematic{const w=d.wires.find(w=>w.id===id);if(!w)return d;const pts=wirePoints(d,w),a=pts[index],b=pts[index+1];if(!a||!b)return d;const horizontal=a.y===b.y;const shift=Math.max(-(horizontal?a.y:a.x),Math.min((horizontal?SHEET.height:SHEET.width)-(horizontal?a.y:a.x),snap(delta)));if(!shift)return d;const offset=(p:Point)=>horizontal?{x:p.x,y:p.y+shift}:{x:p.x+shift,y:p.y};const route=orthogonalRoute([...pts.slice(0,index),...(index===0?[a]:[]),offset(a),offset(b),...(index+1===pts.length-1?[b]:[]),...pts.slice(index+2)]);return {...d,wires:d.wires.map(old=>old.id===id?{...old,points:route.slice(1,-1)}:old)};}
/** Split only the clicked wire, retaining its routed shape and electrical endpoints. */
export function splitWireAt(d:Schematic,id:string,point:Point,uid:()=>string=()=>crypto.randomUUID()):{data:Schematic;terminal:Terminal}{
 const w=d.wires.find(w=>w.id===id);if(!w)throw new Error('배선을 찾을 수 없어요.');const pts=wirePoints(d,w),hit=nearestWireSegment(d,w,point),p=hit.point;
 if(equalPoint(p,pts[0]))return {data:d,terminal:w.a};if(equalPoint(p,pts.at(-1)!))return {data:d,terminal:w.b};
 const junction:Part={id:uid(),kind:'junction',ref:nextRef(d,'junction'),value:'',...p,rotation:0},terminal={part:junction.id,pin:0};
 const left=orthogonalRoute([...pts.slice(0,hit.index+1),p]),right=orthogonalRoute([p,...pts.slice(hit.index+1)]);
 return {data:parseSchematic({...d,parts:[...d.parts,junction],wires:[...d.wires.filter(old=>old.id!==id),{...w,b:terminal,points:left.slice(1,-1)},{...w,id:uid(),a:terminal,points:right.slice(1,-1)}]}),terminal};
}

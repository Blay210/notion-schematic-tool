import {parseSchematic,connectionNets,PARTS,type Schematic} from '../schematic.ts';
export type SimOptions={mode:'dc'|'transient';stop:number;step:number;initial:'zero'|'operating'};
export type Trace={name:string;unit:'V'|'A';values:number[]};
export type SimResult={times:number[];traces:Trace[];netlist:string;method:string};
const multipliers:Record<string,number>={t:1e12,g:1e9,meg:1e6,k:1e3,m:1e-3,u:1e-6,n:1e-9,p:1e-12,f:1e-15};
export function parseValue(input:string,kind:'resistor'|'capacitor'|'inductor'|'voltage'|'time'):number{
 const cleaned=(kind==='capacitor'?input.trim().replace(/F$/,''):input.trim()).replace(/^DC\s*/i,'').replace(/[µμ]/g,'u').replace(/Ω/gi,'ohm').replace(/\s/g,'');
 const match=cleaned.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(meg|[tgkmunpf])?(ohms?|[fvhs])?$/i);
 if(!match)throw Error(`값을 읽을 수 없어요: ${input||'(빈 값)'} · 예: 1k, 10uF, 1mH, 5V`);
 const suffix=(match[3]||'').toLowerCase();const allowed=kind==='resistor'?['','ohm','ohms']:kind==='capacitor'?['','f']:kind==='inductor'?['','h']:kind==='voltage'?['','v']:['','s'];
 if(!allowed.includes(suffix))throw Error(`소자와 단위가 맞지 않아요: ${input}`);
 const value=Number(match[1])*(match[2]?multipliers[match[2].toLowerCase()]:1);
 if(!Number.isFinite(value)||Math.abs(value)>1e12||(kind!=='voltage'&&(value<1e-15)))throw Error('R·L·C와 시간은 0보다 큰 유한한 값이어야 해요.');
 return value;
}
type Device={ref:string;kind:'resistor'|'capacitor'|'inductor'|'voltage';value:number;a:number;b:number;na:string;nb:string;branch:number};
function compile(input:Schematic){const d=parseSchematic(input);if(!d.parts.some(p=>p.kind==='ground'))throw Error('GND를 추가하고 회로의 기준 노드에 연결해주세요.');
 const nets=connectionNets(d);const nodes=nets.filter(n=>n.name!=='0');const pinMap=new Map(nets.flatMap(n=>n.pins.map(p=>[p,n.name] as const)));const nodeIndex=new Map(nodes.map((n,i)=>[n.name,i]));let branches=nodes.length;
 const devices:Device[]=[];
 for(const p of d.parts){if(p.kind==='ground'||p.kind==='junction')continue;if(!['resistor','capacitor','inductor','voltage'].includes(p.kind))throw Error(`${p.ref}: 이번 버전은 R, L, C, VDC만 계산해요.`);
  const kind=p.kind as Device['kind'];let value:number;try{value=parseValue(p.value,kind);}catch(e){throw Error(`${p.ref}: ${(e as Error).message}`);}
  const na=pinMap.get(`${p.ref}.${PARTS[kind].pins[0]}`)!,nb=pinMap.get(`${p.ref}.${PARTS[kind].pins[1]}`)!;
  if(na===nb)throw Error(`${p.ref}: 두 핀이 같은 노드에 연결되어 있어요. 단락된 소자를 제거하거나 배선을 수정해주세요.`);
  devices.push({ref:p.ref,kind,value,na,nb,a:nodeIndex.get(na)??-1,b:nodeIndex.get(nb)??-1,branch:kind==='voltage'||kind==='inductor'?branches++:-1});
 }
 if(!devices.length)throw Error('계산할 R·L·C·VDC 소자를 추가해주세요.');if(branches>128)throw Error('첫 버전은 노드와 전압원·인덕터 전류 미지수 합계 128개까지 계산해요.');
 const reachable=new Set(['0']);for(let i=0;i<nets.length;i++)for(const p of devices){if(reachable.has(p.na))reachable.add(p.nb);if(reachable.has(p.nb))reachable.add(p.na);}
 if(nodes.some(n=>!reachable.has(n.name)))throw Error('GND와 연결되지 않은 떠 있는 회로가 있어요. 모든 회로의 기준 연결을 확인해주세요.');
 const netlist=['* '+d.title.replace(/[\r\n]/g,' '),...devices.map(p=>`${{resistor:'R',capacitor:'C',inductor:'L',voltage:'V'}[p.kind]}_${p.ref} ${p.na} ${p.nb} ${p.kind==='voltage'?'DC ':''}${p.value}`)];
 return {nodes,devices,size:branches,netlist};
}
// Row equilibration + partial-pivot LU, factored once for fixed-step linear circuits.
function factor(matrix:number[][]){const n=matrix.length,lu=matrix.map(r=>r.slice()),scale=lu.map(r=>Math.max(...r.map(Math.abs))),permutation=Array.from({length:n},(_,i)=>i);
 const singular=()=>Error('회로 해를 구할 수 없어요. 떠 있는 노드, 서로 충돌하는 전압원, 이상적인 전압원·인덕터의 병렬/루프를 확인해주세요. DC에서는 커패시터가 개방되고 인덕터는 단락돼요.');
 for(let i=0;i<n;i++){if(!scale[i])throw singular();for(let j=0;j<n;j++)lu[i][j]/=scale[i];}
 for(let k=0;k<n;k++){let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(lu[i][k])>Math.abs(lu[pivot][k]))pivot=i;if(Math.abs(lu[pivot][k])<1e-14)throw singular();[lu[k],lu[pivot]]=[lu[pivot],lu[k]];[permutation[k],permutation[pivot]]=[permutation[pivot],permutation[k]];
  for(let i=k+1;i<n;i++){lu[i][k]/=lu[k][k];for(let j=k+1;j<n;j++)lu[i][j]-=lu[i][k]*lu[k][j];}
 }
 return (rhs:number[])=>{const x=permutation.map(i=>rhs[i]/scale[i]);for(let i=0;i<n;i++)for(let j=0;j<i;j++)x[i]-=lu[i][j]*x[j];for(let i=n-1;i>=0;i--){for(let j=i+1;j<n;j++)x[i]-=lu[i][j]*x[j];x[i]/=lu[i][i];if(!Number.isFinite(x[i])||Math.abs(x[i])>1e18)throw Error('수치 계산 범위를 벗어났어요. 소자 값과 시간 간격을 확인해주세요.');}return x;};
}
export function simulate(input:Schematic,options:SimOptions):SimResult{
 const {nodes,devices,size,netlist}=compile(input);if(!['dc','transient'].includes(options.mode)||!['zero','operating'].includes(options.initial))throw Error('해석 설정이 올바르지 않아요.');
 if(options.mode==='transient'&&(!Number.isFinite(options.stop)||!Number.isFinite(options.step)||options.step<1e-12||options.stop<options.step||options.stop>1e6||Math.ceil(options.stop/options.step)>5000))throw Error('시간 간격은 1ps 이상, 종료 시간 이하여야 해요. 최대 5,000스텝까지 계산해요.');
 const steps=options.mode==='dc'?1:Math.ceil(options.stop/options.step);const dt=options.mode==='dc'?0:options.stop/steps;
 const voltage=(x:number[],p:Device)=>(p.a<0?0:x[p.a])-(p.b<0?0:x[p.b]);
 function system(transient:boolean){const matrix=Array.from({length:size},()=>Array(size).fill(0) as number[]);const put=(i:number,j:number,v:number)=>{if(i>=0&&j>=0)matrix[i][j]+=v;};
  for(const p of devices){if(p.kind==='resistor'||p.kind==='capacitor'){const g=p.kind==='resistor'?1/p.value:transient?p.value/dt:0;put(p.a,p.a,g);put(p.b,p.b,g);put(p.a,p.b,-g);put(p.b,p.a,-g);}else{put(p.a,p.branch,1);put(p.b,p.branch,-1);put(p.branch,p.a,1);put(p.branch,p.b,-1);if(p.kind==='inductor'&&transient)put(p.branch,p.branch,-p.value/dt);}}
  const solve=factor(matrix);
  return (previous:number[])=>{const rhs=Array(size).fill(0) as number[];for(const p of devices){if(p.kind==='voltage')rhs[p.branch]=p.value;
   if(transient&&p.kind==='inductor')rhs[p.branch]=-p.value/dt*previous[p.branch];
   if(transient&&p.kind==='capacitor'){const history=p.value/dt*voltage(previous,p);if(p.a>=0)rhs[p.a]+=history;if(p.b>=0)rhs[p.b]-=history;}}
   return solve(rhs);
  };
 }
 let previous=Array(size).fill(0) as number[];if(options.mode==='transient'&&options.initial==='operating')previous=system(false)(previous);
 const solve=system(options.mode==='transient');
 const traces:Trace[]=[...nodes.map(n=>({name:`V(${n.name})`,unit:'V' as const,values:[] as number[]})),...devices.flatMap(p=>[{name:`V(${p.ref})`,unit:'V' as const,values:[] as number[]},{name:`I(${p.ref})`,unit:'A' as const,values:[] as number[]}])];const times:number[]=[];
 for(let step=0;step<steps;step++){const x=solve(previous);times.push(options.mode==='dc'?0:(step+1)*dt);nodes.forEach((_,i)=>traces[i].values.push(x[i]));devices.forEach((p,i)=>{const v=voltage(x,p);let current:number;if(p.kind==='resistor')current=v/p.value;else if(p.kind==='capacitor')current=dt?p.value/dt*(v-voltage(previous,p)):0;else current=x[p.branch];traces[nodes.length+i*2].values.push(v);traces[nodes.length+i*2+1].values.push(current);});previous=x;}
 netlist.push(options.mode==='dc'?'.op':`.tran ${dt} ${options.stop}${options.initial==='zero'?' UIC':''}`,'.end');
 return {times,traces,netlist:netlist.join('\n'),method:options.mode==='dc'?'DC 동작점':'Backward Euler · 고정 시간 간격'};
}

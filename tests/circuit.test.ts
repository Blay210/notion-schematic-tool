import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate,parseValue,type SimOptions} from '../lib/circuit/solver.ts';
import {rcSchematic,rlSchematic,rlcSchematic,type Schematic} from '../lib/schematic.ts';
const opts:SimOptions={mode:'transient',initial:'zero',stop:.005,step:.00001};
const near=(a:number,b:number,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} vs ${b}`);
const last=(r:ReturnType<typeof simulate>,name:string)=>r.traces.find(t=>t.name===name)!.values.at(-1)!;
test('SPICE values distinguish milli/meg and SI units, and reject invalid physical values',()=>{
 near(parseValue('1 kΩ','resistor'),1000);near(parseValue('DC 5 V','voltage'),5);near(parseValue('1 µF','capacitor'),1e-6);near(parseValue('1F','capacitor'),1);near(parseValue('1mF','capacitor'),.001);near(parseValue('1M','resistor'),.001);near(parseValue('2meg','resistor'),2e6);near(parseValue('10mH','inductor'),.01);near(parseValue('-3V','voltage'),-3);
 for(const value of ['0','-1','Infinity','1x','1V'])assert.throws(()=>parseValue(value,'resistor'));
});
test('DC divider and source current satisfy KCL with correct polarity',()=>{
 const d=rcSchematic();d.parts=d.parts.map(p=>p.id==='c'?{...p,kind:'resistor',ref:'R2',value:'1k'}:p);const r=simulate(d,{...opts,mode:'dc'});
 near(last(r,'V(R2)'),2.5);near(last(r,'I(R1)'),.0025);near(last(r,'I(R2)'),.0025);near(last(r,'I(V1)'),-.0025);
});
test('RC backward Euler agrees with its discrete solution and converges to analytic charging',()=>{
 const r=simulate(rcSchematic(),opts);const tau=.001;const discrete=5*(1-Math.pow(1+opts.step/tau,-500));near(last(r,'V(C1)'),discrete,1e-9);near(last(r,'I(R1)'),last(r,'I(C1)'),1e-10);near(last(r,'I(V1)'),-last(r,'I(C1)'),1e-10);
 const exact=5*(1-Math.exp(-opts.stop/tau));const fine=simulate(rcSchematic(),{...opts,step:opts.step/2});assert.ok(Math.abs(last(fine,'V(C1)')-exact)<Math.abs(last(r,'V(C1)')-exact));
});
test('RL response and operating-point initial conditions are consistent',()=>{
 const r=simulate(rlSchematic(),opts);near(last(r,'I(L1)'),.5*(1-Math.pow(1.01,-500)),1e-9);near(last(r,'I(R1)'),last(r,'I(L1)'),1e-9);
 const dc=simulate(rlSchematic(),{...opts,mode:'dc'});near(last(dc,'V(L1)'),0);near(last(dc,'I(L1)'),.5);
 const steady=simulate(rcSchematic(),{...opts,initial:'operating'});for(const v of steady.traces.find(t=>t.name==='V(C1)')!.values)near(v,5,1e-9);
});
test('RLC oscillates, settles, and satisfies source KCL and loop KVL',()=>{
 const r=simulate(rlcSchematic(),{...opts,stop:.02});const c=r.traces.find(t=>t.name==='V(C1)')!;assert.ok(Math.max(...c.values)>6);near(last(r,'V(C1)'),5,.002);
 for(let i=0;i<r.times.length;i++){const at=(name:string)=>r.traces.find(t=>t.name===name)!.values[i];near(at('V(R1)')+at('V(L1)')+at('V(C1)'),5,1e-8);near(at('I(R1)'),at('I(L1)'),1e-8);near(at('I(L1)'),at('I(C1)'),1e-8);}
});
test('missing ground, floating nodes, inconsistent ideal sources, unsupported parts and excessive steps fail explicitly',()=>{
 const d=rcSchematic();assert.throws(()=>simulate({...d,parts:d.parts.filter(p=>p.kind!=='ground'),wires:d.wires.filter(w=>w.b.part!=='g')},opts));
 assert.throws(()=>simulate({...d,wires:[]},opts));
 assert.throws(()=>simulate({...d,parts:d.parts.map(p=>p.id==='r'?{...p,kind:'diode'}:p)},opts));
 const conflict:Schematic={...d,parts:[...d.parts,{...d.parts[0],id:'v2',ref:'V2',value:'6V'}],wires:[...d.wires,{id:'w5',a:{part:'v2',pin:0},b:{part:'v',pin:0},bend:'horizontal'},{id:'w6',a:{part:'v2',pin:1},b:{part:'v',pin:1},bend:'horizontal'}]};assert.throws(()=>simulate(conflict,opts));
 assert.throws(()=>simulate(d,{...opts,step:1e-9}));
 assert.throws(()=>simulate(d,{...opts,step:0}));
});
test('worker bundle executes the same solver and contains failures',async()=>{
 const {execFileSync}=await import('node:child_process');const code=`globalThis.self={postMessage:r=>console.log(r.result?r.result.traces.find(t=>t.name==='V(C1)').values[0]:'error')};await import('./public/workers/circuit-worker.js');self.onmessage({data:${JSON.stringify({data:rcSchematic(),options:{...opts,mode:'dc'}})}});self.onmessage({data:{data:{},options:{}}});`;
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8'}).trim(),'5\nerror');
});

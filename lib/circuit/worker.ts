import {simulate,type SimOptions} from './solver.ts';
import type {Schematic} from '../schematic.ts';
self.onmessage=(event:MessageEvent<{data:Schematic;options:SimOptions}>)=>{try{self.postMessage({result:simulate(event.data.data,event.data.options)});}catch(e){self.postMessage({error:e instanceof Error?e.message:'회로 계산에 실패했어요.'});}};

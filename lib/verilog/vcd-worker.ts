import {parseVcd} from './vcd';
self.onmessage=(event:MessageEvent<string>)=>{try{self.postMessage({data:parseVcd(event.data)});}catch(e){self.postMessage({error:e instanceof Error?e.message:'VCD를 읽지 못했어요.'});}};

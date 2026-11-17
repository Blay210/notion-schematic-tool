import type * as Monaco from 'monaco-editor';
declare global {interface Window {PulseMonaco?:typeof Monaco;MonacoEnvironment?:{getWorker:(moduleId:string,label:string)=>Worker};}}
let pending:Promise<typeof Monaco>|null=null;
export function loadMonaco(){if(pending)return pending;
 pending=new Promise((resolve,reject)=>{
  window.MonacoEnvironment={getWorker:()=>new Worker('/pulse/editor-worker.js',{type:'module'})};
  const css=document.createElement('link');css.rel='stylesheet';css.href='/pulse/editor.css';const stylesReady=new Promise<void>((done,fail)=>{css.onload=()=>done();css.onerror=()=>fail(new Error('편집기 스타일을 불러오지 못했어요. 다시 열어주세요.'));});stylesReady.catch(()=>{});document.head.append(css);
  const script=document.createElement('script');script.type='module';script.src='/pulse/editor.js';
  script.onload=async()=>{try{await stylesReady;}catch(error){pending=null;reject(error);return;}if(window.PulseMonaco)resolve(window.PulseMonaco);else {pending=null;reject(new Error('편집기를 초기화하지 못했어요.'));}};
  script.onerror=()=>{pending=null;script.remove();reject(new Error('편집기 파일을 불러오지 못했어요. 다시 열어주세요.'));};document.head.append(script);
 });return pending;
}

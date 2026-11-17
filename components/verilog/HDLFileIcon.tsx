import {FileCode2} from 'lucide-react';
import {hdlDialect} from '@/lib/verilog/dialect';
export default function HDLFileIcon({name,size=15}:{name:string;size?:number}){
 const dialect=hdlDialect(name);if(dialect==='text')return <FileCode2 size={size}/>;
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`pulse-file-icon ${dialect}`} role="img" aria-label={dialect==='verilog'?'Verilog 파일':'SystemVerilog 파일'}><path d="M5 2h9l5 5v15H5zM14 2v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><text x="12" y="17" textAnchor="middle" fill="currentColor" fontFamily="Consolas,monospace" fontWeight="bold" fontSize={dialect==='verilog'?11:9}>{dialect==='verilog'?'V':'SV'}</text></svg>;
}

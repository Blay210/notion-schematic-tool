import type {PartKind} from '@/lib/schematic';
export default function PartSymbol({kind}:{kind:PartKind}){
 if(kind==='junction')return <circle r="6" fill="currentColor"/>;
 if(kind==='ground')return <path d="M0 0 V20 M-24 20 H24 M-16 28 H16 M-8 36 H8"/>;
 if(kind==='resistor')return <path d="M-60 0 H-35 L-28 -12 L-16 12 L-4 -12 L8 12 L20 -12 L32 12 L38 0 H60"/>;
 if(kind==='capacitor')return <path d="M-60 0 H-8 M-8 -25 V25 M8 -25 V25 M8 0 H60"/>;
 if(kind==='inductor')return <path d="M-60 0 H-32 C-32 -28 -16 -28 -16 0 C-16 -28 0 -28 0 0 C0 -28 16 -28 16 0 C16 -28 32 -28 32 0 H60"/>;
 if(kind==='diode')return <><path d="M-60 0 H-20 M20 0 H60 M20 -24 V24"/><path d="M-20 -24 L20 0 L-20 24 Z"/></>;
 if(kind==='switch')return <><path d="M-60 0 H-25 M25 0 H60 M-25 0 L20 -28"/><circle cx="-25" r="4"/><circle cx="25" r="4"/></>;
 if(['npn','pnp'].includes(kind))return <><circle r="39"/><path d="M-60 0 H-15 M-15 -24 V24 M-15 -12 L40 -40 V-60 M-15 12 L40 40 V60"/><path d={kind==='npn'?'M21 24 L32 36 L16 34 Z':'M8 24 L-5 15 L12 14 Z'} fill="currentColor"/></>;
 if(['nmos','pmos'].includes(kind))return <><path d="M-60 0 H-24 M-24 -27 V27 M-12 -28 V28 M-12 -22 H40 V-60 M-12 22 H40 V60 M40 22 V0 H-12"/><path d={kind==='nmos'?'M2 -6 L-10 0 L2 6 Z':'M20 -6 L32 0 L20 6 Z'} fill="currentColor"/>{kind==='pmos'&&<circle cx="-32" r="6" fill="white"/>}</>;
 if(['opamp','opamp_power','comparator'].includes(kind))return <><path d="M-32 -38 L40 0 L-32 38 Z M-60 -20 H-32 M-60 20 H-32 M40 0 H60"/>{kind!=='opamp'&&<path d="M0 -21 V-60 M0 21 V60"/>}<path d="M-25 -20 H-13 M-19 -26 V-14 M-25 20 H-13"/>{kind==='comparator'&&<path d="M-5 7 V-7 H10"/>}</>;
 if(['and','nand','or','nor','xor','xnor','not','buffer','tristate'].includes(kind)){
 const unary=['not','buffer','tristate'].includes(kind),inv=['nand','nor','xnor','not'].includes(kind),or=['or','nor','xor','xnor'].includes(kind);
 return <>{unary?<path d="M-60 0 H-30 M-30 -30 L30 0 L-30 30 Z"/>:<><path d="M-60 -20 H-28 M-60 20 H-28"/><path d={or?'M-34 -32 Q5 -32 32 0 Q5 32 -34 32 Q-8 0 -34 -32 Z':'M-30 -32 H0 A32 32 0 0 1 0 32 H-30 Z'}/>{['xor','xnor'].includes(kind)&&<path d="M-43 -32 Q-17 0 -43 32"/>}</>}{inv?<><circle cx="39" r="6"/><path d="M45 0 H60"/></>:<path d="M32 0 H60"/>}{kind==='tristate'&&<path d="M0 17 V60"/>}</>;
 }
 return <><path d="M-60 0 H-28 M28 0 H60"/><circle r="28" fill="white"/>{kind==='vsin'?<path d="M-20 0 Q-10 -28 0 0 Q10 28 20 0"/>:kind==='vpulse'?<path d="M-20 12 H-10 V-12 H10 V12 H20"/>:kind==='current'?<path d="M-16 0 H16 M7 -7 L16 0 L7 7"/>:<path d="M-19 0 H-5 M-12 -7 V7 M7 0 H21"/>}</>;
}

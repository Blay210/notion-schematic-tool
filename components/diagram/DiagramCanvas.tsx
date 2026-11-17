"use client";
import {useId,type PointerEvent,type Ref} from 'react';
import {useDrawingBounds} from './useDrawingBounds';
import {CANVAS,portPoint,edgeEndpoints,roundedEdgePath,type DiagramData,type DiagramNode,type Point,type Port} from '../../lib/diagram';
type Props={fit?:boolean;data:DiagramData;selected?:string;onSelect?:(id:string)=>void;onNodePointerDown?:(e:PointerEvent<SVGGElement>,n:DiagramNode)=>void;onResize?:(e:PointerEvent<SVGRectElement>,n:DiagramNode,handle:string)=>void;onEdit?:(n:DiagramNode)=>void;svgRef?:Ref<SVGSVGElement>;grid?:boolean;wire?:boolean;preview?:{a:Point;b:Point;port:Port;arrows:'end'|'both'|'none'};snap?:Point;editing?:string};
export function DiagramCanvas({data,selected,onSelect,onNodePointerDown,onResize,onEdit,svgRef,grid=false,fit=false,wire,preview,snap,editing}:Props){
 const {content,bounds}=useDrawingBounds(data,fit,CANVAS);
 const uid=useId().replace(/:/g,'');const marker=`url(#${uid}-arrow)`;
 return <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`} role="img" aria-label={data.title||'블록 다이어그램'} style={{display:'block',width:'100%',height:'auto',fontFamily:'sans-serif',background:'#fff'}}>
 <title>{data.title||'블록 다이어그램'}</title>
 <defs><linearGradient id={`${uid}-lavender`} x2="0" y2="1"><stop stopColor="#f1e9ff"/><stop offset="1" stopColor="#d9c8f3"/></linearGradient><linearGradient id={`${uid}-blue`} x2="0" y2="1"><stop stopColor="#e9f3ff"/><stop offset="1" stopColor="#c9def7"/></linearGradient><filter id={`${uid}-shadow`} x="-20%" y="-30%" width="140%" height="170%"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#8d76ad" floodOpacity=".14"/></filter><marker id={`${uid}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="#81709f" strokeWidth="1.6" strokeLinejoin="round"/></marker><pattern id={`${uid}-grid`} width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r=".75" fill="#e1d8ed"/></pattern></defs>
 <rect width={CANVAS.width} height={CANVAS.height} fill={grid?`url(#${uid}-grid)`:'#fff'} onClick={()=>{if(!wire)onSelect?.('');}}/>
 <g ref={content}>
 {data.edges.map(e=>{const {a,b}=edgeEndpoints(data,e);const path=roundedEdgePath(a,b,e.fromPort,e.routing);return <g key={e.id} onClick={()=>{if(!wire)onSelect?.(e.id);}} style={{cursor:wire?'crosshair':onSelect?'pointer':'default'}}>
 <path fill="none" d={path} stroke="transparent" strokeWidth="18"/>
 <path fill="none" d={path} stroke="#fff" strokeWidth="7" strokeLinecap="round"/>
 <path fill="none" d={path} stroke={selected===e.id?'#7957b2':'#81709f'} strokeWidth="2.5" markerStart={e.arrows==='both'?marker:undefined} markerEnd={e.arrows==='none'?undefined:marker}/>
 <text x={(a.x+b.x)/2} y={(a.y+b.y)/2-10} textAnchor="middle" fontSize="17" fill="#514266" stroke="#fff" strokeWidth="5" paintOrder="stroke">{e.label}</text></g>})}
 {data.nodes.map(n=>{const stroke=selected===n.id?'#7957b2':'#ab94c8',fill=`url(#${uid}-${n.shape==='ellipse'?'blue':'lavender'})`;return <g key={n.id} onPointerDown={e=>{if(!wire)onNodePointerDown?.(e,n);}} onClick={()=>{if(!wire)onSelect?.(n.id);}} onDoubleClick={()=>{if(!wire)onEdit?.(n);}} style={{cursor:wire?'crosshair':onSelect?'move':'default',touchAction:'none'}}>
 <g filter={n.shape==='text'?undefined:`url(#${uid}-shadow)`} fill={n.shape==='text'?'transparent':fill} stroke={n.shape==='text'?'transparent':stroke} strokeWidth="2">
 {n.shape==='ellipse'?<ellipse cx={n.x+n.width/2} cy={n.y+n.height/2} rx={n.width/2} ry={n.height/2}/>:n.shape==='diamond'?<polygon points={`${n.x+n.width/2},${n.y} ${n.x+n.width},${n.y+n.height/2} ${n.x+n.width/2},${n.y+n.height} ${n.x},${n.y+n.height/2}`}/>:<rect x={n.x} y={n.y} width={n.width} height={n.height} rx={n.shape==='rounded'?18:0}/>}</g>
 {editing!==n.id&&n.label.split('\n').slice(0,8).map((line,i,lines)=><text key={i} x={n.x+n.width/2} y={n.y+n.height/2+(i-(lines.length-1)/2)*(n.fontSize||18)*1.3} dominantBaseline="middle" textAnchor="middle" fontSize={n.fontSize||18} fontFamily={n.fontFamily||'sans-serif'} fill="#373449" style={{pointerEvents:'none'}}>{line}</text>)}
 {wire&&(['top','right','bottom','left'] as Port[]).map(p=>{const pos=portPoint(n,p);return <circle key={p} cx={pos.x} cy={pos.y} r="4" fill="#fff" stroke="#9976bd"/>;})}
 {selected===n.id&&!wire&&onResize&&<g data-editor-only="true"><rect x={n.x-1} y={n.y-1} width={n.width+2} height={n.height+2} fill="none" stroke="#9873c0" strokeDasharray="4 3"/>{(['nw','n','ne','e','se','s','sw','w']).map(h=><rect key={h} x={n.x+(h.includes('w')?0:h.includes('e')?n.width:n.width/2)-5} y={n.y+(h.includes('n')?0:h.includes('s')?n.height:n.height/2)-5} width="10" height="10" rx="2" fill="#fff" stroke="#8561ad" style={{cursor:`${h}-resize`}} onPointerDown={e=>{e.stopPropagation();onResize(e,n,h);}}/>)}</g>}
 </g>})}
 {preview&&<path data-editor-only="true" d={roundedEdgePath(preview.a,preview.b,preview.port,'orthogonal')} fill="none" stroke="#9571bc" strokeWidth="2.5" strokeDasharray="6 4" markerStart={preview.arrows==='both'?marker:undefined} markerEnd={preview.arrows==='none'?undefined:marker} pointerEvents="none"/>}
 {snap&&<circle data-editor-only="true" cx={snap.x} cy={snap.y} r="8" fill="#dcccfa" stroke="#7957b2" strokeWidth="2" pointerEvents="none"/>}
 </g></svg>;
}

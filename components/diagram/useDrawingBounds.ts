'use client';
import {useLayoutEffect,useRef,useState} from 'react';
/** Measure rendered geometry, including text and routed wires, without altering source coordinates. */
export function useDrawingBounds(data:unknown,fit:boolean,full:{width:number;height:number}){
 const content=useRef<SVGGElement>(null);
 const [bounds,setBounds]=useState({x:0,y:0,width:full.width,height:full.height});
 useLayoutEffect(()=>{if(!fit)return;let disposed=false;const measure=()=>{if(disposed||!content.current)return;const box=content.current.getBBox();const padding=28;setBounds(box.width||box.height?{x:box.x-padding,y:box.y-padding,width:Math.max(80,box.width+padding*2),height:Math.max(80,box.height+padding*2)}:{x:0,y:0,width:320,height:160});};measure();document.fonts?.ready.then(measure);return()=>{disposed=true;};},[data,fit]);
 return {content,bounds:fit?bounds:{x:0,y:0,width:full.width,height:full.height}};
}

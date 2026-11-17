import {embedSchematicPNG} from './schematic-png';
import type {Schematic} from './schematic';
export async function exportSchematicPNG(source:SVGSVGElement,data:Schematic){
 await document.fonts.ready;
 const content=source.querySelector(':scope > g') as SVGGElement|null;
 const box=content?.getBBox();
 const bounds=box&&(box.width||box.height)?{x:box.x-28,y:box.y-28,width:box.width+56,height:box.height+56}:{x:0,y:0,width:320,height:160};
 const scale=Math.min(2,4096/Math.max(bounds.width,bounds.height));
 const width=Math.ceil(bounds.width*scale),height=Math.ceil(bounds.height*scale);
 const copy=source.cloneNode(true) as SVGSVGElement;
 copy.setAttribute('viewBox',`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
 copy.setAttribute('width',String(width));copy.setAttribute('height',String(height));copy.removeAttribute('style');
 copy.style.fontFamily='sans-serif';
 const svgURL=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml;charset=utf-8'}));
 try{
  const image=new Image();image.src=svgURL;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d');if(!context)throw new Error('이미지를 만들지 못했어요.');
  context.fillStyle='#fff';context.fillRect(0,0,width,height);context.drawImage(image,0,0,width,height);
  const png=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG를 만들지 못했어요.')),'image/png'));
  const bytes=await embedSchematicPNG(new Uint8Array(await png.arrayBuffer()),data);
  const url=URL.createObjectURL(new Blob([bytes.buffer],{type:'image/png'}));
  const link=document.createElement('a');link.href=url;link.download=`${(data.title||'회로').replace(/[\\/:*?"<>|]/g,'_')}.png`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
 }finally{URL.revokeObjectURL(svgURL);}
}

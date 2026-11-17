import type {ReactNode} from 'react';
import './globals.css';
export const metadata={title:'Schematic',description:'Circuit schematic design for Notion',robots:{index:false,follow:false}};
export default function Layout({children}:{children:ReactNode}){return <html lang="ko"><body>{children}</body></html>;}

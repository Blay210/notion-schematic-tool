import type {ReactNode} from 'react';
import './globals.css';
export const metadata={title:'Moon Tools',description:'Diagrams, circuits and Pulse for Notion',robots:{index:false,follow:false}};
export default function Layout({children}:{children:ReactNode}){return <html lang="ko"><body>{children}</body></html>;}

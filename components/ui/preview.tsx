'use client';
import { useEffect,useState } from 'react';
import { useI18n } from './locale';
export function SvgPreview({svg,alt,className=''}:{svg:string;alt:string;className?:string}){
  const {t}=useI18n();
  const [url,setUrl]=useState('');
  useEffect(()=>{if(!svg)return;const objectUrl=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));setUrl(objectUrl);return()=>URL.revokeObjectURL(objectUrl);},[svg]);
  return url?<img className={className} src={url} alt={alt}/>:<div className="preview-placeholder">{t.common.preparingPreview}</div>;
}

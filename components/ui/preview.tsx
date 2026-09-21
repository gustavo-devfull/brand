'use client';
import { useEffect,useState } from 'react';
import { Skeleton } from '@mantine/core';
export function SvgPreview({svg,alt,className='',height}:{svg:string;alt:string;className?:string;height?:number}){
  const [url,setUrl]=useState('');
  useEffect(()=>{if(!svg)return;const objectUrl=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));setUrl(objectUrl);return()=>URL.revokeObjectURL(objectUrl);},[svg]);
  return url?<img className={`svg-preview ${className}`} src={url} alt={alt}/>:<Skeleton height={height??120} radius="md"/>;
}

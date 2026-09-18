'use client';
import { createContext,useCallback,useContext,useEffect,useState,type ReactNode } from 'react';
import { useI18n } from './locale';
import type { Workspace } from '@/types';

type State={workspace:Workspace|null;cloud:boolean;ready:boolean;error:string;reload:()=>Promise<void>;setWorkspace:React.Dispatch<React.SetStateAction<Workspace|null>>};
const Context=createContext<State|null>(null);

export async function request<T>(url:string,options?:RequestInit,fallback='Request failed.'):Promise<T>{
  const response=await fetch(url,options);
  if(!response.ok){const body=await response.json();throw new Error(body.error||fallback);}
  return response.json() as Promise<T>;
}

export function WorkspaceProvider({children}:{children:ReactNode}){
  const {locale,t}=useI18n();
  const [workspace,setWorkspace]=useState<Workspace|null>(null),[cloud,setCloud]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState('');
  const reload=useCallback(async()=>{
    try{
      setError('');
      const result=await request<{workspace:Workspace;cloud:boolean}>('/api/workspace',undefined,t.common.requestFailed);
      setWorkspace(result.workspace);setCloud(result.cloud);setReady(true);
    }catch(e){setError((e as Error).message);}
  },[t.common.requestFailed]);
  // Recarrega ao trocar de idioma: a campanha demo é semeada no servidor, com a copy
  // já renderizada dentro do SVG, então traduzir só na tela não bastaria.
  useEffect(()=>{void reload();},[reload,locale]);
  return <Context.Provider value={{workspace,cloud,ready,error,reload,setWorkspace}}>{children}</Context.Provider>;
}

export function useWorkspace(){const context=useContext(Context);if(!context)throw new Error('Missing workspace provider');return context;}

export function Loading(){
  const {error,reload}=useWorkspace();const {t}=useI18n();
  return <div className="empty-state">{error
    ?<><h2>{t.workspace.unavailable}</h2><p role="alert">{error}</p><button className="button" onClick={()=>void reload()}>{t.common.tryAgain}</button></>
    :<><div className="spinner"/><p>{t.workspace.preparing}</p></>}</div>;
}

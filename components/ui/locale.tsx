'use client';
import { createContext,useCallback,useContext,useMemo,useState,type ReactNode } from 'react';
import { SegmentedControl } from '@mantine/core';
import { dictionary,localeCookie,type Dictionary,type Locale } from '@/lib/i18n';

type State={locale:Locale;t:Dictionary;setLocale:(next:Locale)=>void};
const Context=createContext<State|null>(null);

export function LocaleProvider({initialLocale,children}:{initialLocale:Locale;children:ReactNode}){
  const [locale,setLocaleState]=useState<Locale>(initialLocale);
  const setLocale=useCallback((next:Locale)=>{
    // O cookie é lido pelo servidor: o workspace demo e a copy do agente são
    // gerados no idioma escolhido, não apenas traduzidos na tela.
    document.cookie=`${localeCookie}=${next}; path=/; max-age=${60*60*24*365}; samesite=lax`;
    document.documentElement.lang=dictionary(next).htmlLang;
    setLocaleState(next);
  },[]);
  const value=useMemo(()=>({locale,t:dictionary(locale),setLocale}),[locale,setLocale]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useI18n(){
  const context=useContext(Context);
  if(!context)throw new Error('Missing locale provider');
  return context;
}

export function LocaleToggle(){
  const {locale,t,setLocale}=useI18n();
  return <SegmentedControl size="xs" radius="xl" value={locale} onChange={v=>setLocale(v as Locale)} aria-label={t.locale.label}
    data={[{value:'pt',label:'PT'},{value:'en',label:'EN'}]}/>;
}

import type { Dictionary } from '@/lib/i18n/pt';

export type ErrorKey = keyof Dictionary['errors'];
export type ErrorParams = Record<string,string|number>;

/**
 * Falhas esperadas carregam uma chave e seus parâmetros, não uma frase. A borda HTTP
 * resolve a chave no idioma do pedido, então as camadas puras (parser, renderer,
 * motor de regras) seguem sem saber nada sobre idioma.
 */
export class AppError extends Error {
  constructor(readonly key:ErrorKey,readonly params:ErrorParams={}){super(key);this.name='AppError';}
}

export const fail=(key:ErrorKey,params:ErrorParams={})=>new AppError(key,params);

export function describe(t:Dictionary,error:AppError){
  return (t.errors[error.key] as (p:ErrorParams)=>string)(error.params);
}

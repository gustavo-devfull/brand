import type { Dictionary } from './pt';
import type { Rationale, RuleParams, RuleResult, TemplateNameKey } from '@/types';
import type { Format } from '@/schemas';

/**
 * As regras chegam do servidor como `{ruleId, params}`. Cada entrada do dicionário
 * declara a forma exata dos seus params, então a união precisa de um cast aqui —
 * é o único ponto em que o par regra/params é remontado.
 */
export function ruleText(d:Dictionary,rule:RuleResult){
  const entry=d.rules[rule.ruleId];
  return {name:entry.name,message:(entry.message as (p:RuleParams)=>string)(rule.params)};
}

export function templateLabel(d:Dictionary,template:{name:string;nameKey?:TemplateNameKey}){
  return template.nameKey?d.templates.names[template.nameKey]:template.name;
}

export function formatLabel(d:Dictionary,format:Format){
  return d.formats[format];
}

export function rationaleText(d:Dictionary,variation:{rationale:Rationale;templateName:string;templateNameKey?:TemplateNameKey}){
  return d.rationale({
    template:templateLabel(d,{name:variation.templateName,nameKey:variation.templateNameKey}),
    theme:d.themes[variation.rationale.theme],
    onTheme:variation.rationale.onTheme,
  });
}

import { z } from 'zod';
import definitions from '../cms/catalog-definitions.json' with { type: 'json' };

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 });
const variant = z.object({
  id:z.union([z.string(),z.number()]),title:z.string(),sku:z.string(),size:z.string().nullish(),connection:z.string().nullish(),color:z.string().nullish(),
  specs:z.record(z.string(),z.number().nullish()).nullish(),
  gallery:z.array(z.object({role:z.string().nullish(),caption:z.string().nullish(),file:z.object({url:z.string().regex(/^(?:https?:\/\/|\/(?!\/))[^\s\\]+$/),alt:z.string().nullish()}).nullish().catch(undefined)})).nullish(),
});
const colors:Record<string,string>={green:'Зелёный',purple:'Фиолетовый',black:'Чёрный',red:'Красный',blue:'Синий',azure:'Голубой'};
export function mapCatalogVariant(value:unknown) {
  const result=variant.safeParse(value);if(!result.success)return null;
  const v=result.data;
  return {id:String(v.id),title:v.title,sku:v.sku,size:v.size||'',connection:v.connection||'',color:colors[v.color||'']||'',
    images:(v.gallery||[]).flatMap(r=>r.file?[{url:r.file.url,label:r.caption||(r.role==='technical'?'Чертёж':'Фото')}]:[]),
    specs:catalogSpecs(v.specs)};
}

export function catalogSpecs(specs?: Record<string, number | null | undefined> | null) {
  return definitions.fields.flatMap(field => {
    const value = specs?.[field.key];
    return value == null ? [] : [{ key: field.key, label: field.label, unit: field.unit, value, display: numberFormat.format(value) }];
  });
}
export type CatalogVariant = NonNullable<ReturnType<typeof mapCatalogVariant>>;
export function articleSummary(skus:string[]) {
  const values=[...new Set(skus.filter(s=>s&&s.toLowerCase()!=='по запросу'))].sort((a,b)=>a.localeCompare(b,'ru',{numeric:true}));
  return values.length===0?'':values.length===1?values[0]:`${values[0]} … ${values[values.length-1]}`;
}
export function variantRanges(variants:Pick<CatalogVariant, 'specs'>[]) {
  return definitions.fields.flatMap(f=>{
    const values=variants.flatMap(v=>v.specs.filter(s=>s.key===f.key).map(s=>s.value));if(!values.length)return [];
    const low=Math.min(...values),high=Math.max(...values);
    return [{key:f.key,label:f.label,value:low===high?numberFormat.format(low):`${numberFormat.format(low)}–${numberFormat.format(high)}`,unit:f.unit}];
  });
}

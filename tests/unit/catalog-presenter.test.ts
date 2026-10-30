import {describe,it,expect} from 'vitest';
import {articleSummary,mapCatalogVariant,variantRanges} from '@/content/catalog-presenter';

describe('imported catalog presentation',()=>{
  it('preserves SKU strings and zero-valued specifications without leaking migration metadata',()=>{
    const v=mapCatalogVariant({id:1,title:'Вариант',sku:'00100',specs:{maxTemperatureC:0,powerKw:1.5},legacyIds:[{value:'secret'}],reviewNotes:'private',packaging:{weightValue:100}})!;
    expect(v.sku).toBe('00100');expect(v.specs.find(x=>x.key==='maxTemperatureC')?.display).toBe('0');expect(v.specs.find(x=>x.key==='powerKw')?.display).toBe('1,5');
    expect(JSON.stringify(v)).not.toMatch(/secret|private|weightValue/);
  });
  it('uses only the supplied variants for ranges and does not invent missing hydraulic performance',()=>{
    const variants=[10,40].map((dn,id)=>mapCatalogVariant({id,title:'Насос',sku:String(id),specs:{dn}})!);
    expect(variantRanges(variants)).toEqual([{key:'dn',label:'Условный проход DN',value:'10–40',unit:''}]);
  });
  it('displays endpoints, preserves leading zeros and handles singleton and missing SKUs',()=>{
    expect(articleSummary(['00020','00001','00020'])).toBe('00001 … 00020');expect(articleSummary(['FO3353232'])).toBe('FO3353232');expect(articleSummary(['По запросу',''])).toBe('');
  });
});

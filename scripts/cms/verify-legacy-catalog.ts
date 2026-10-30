import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {getPayload} from 'payload';
import {mapCatalogVariant,variantRanges} from '../../src/content/catalog-presenter';
import obsoleteResourceCovers from '../../src/cms/import/obsolete-resource-covers.json';
const trial=process.argv.includes('--trial');
if(trial){const u=new URL(process.env.DATABASE_URL!);u.pathname='/heisskraft_catalog_trial';process.env.DATABASE_URL=u.toString();}
const {default:config}=await import('../../payload.config');
const payload=await getPayload({config});
const expected={products:255,'product-variants':2878,'catalog-documents':134,media:1147-obsoleteResourceCovers.externalIds.length} as const;
const report:{trial:boolean;checks:string[];counts:Record<string,{imported:number;public:number}>}={trial,checks:[],counts:{}};
try{
  for(const [name,count]of Object.entries(expected)){
    const collection=name as keyof typeof expected; console.log('Checking',collection);
    const [all,publicRows]=await Promise.all([
      payload.find({collection,pagination:false,depth:0,overrideAccess:true,where:collection==='media'?{externalId:{like:'asset-'}}:{externalId:{exists:true}}}),
      payload.find({collection,pagination:false,depth:0,overrideAccess:false}),
    ]);
    assert.equal(all.docs.length,count);assert.equal(new Set(all.docs.map(d=>d.externalId)).size,count);
    for(const r of publicRows.docs){assert.equal(r._status,'published');if('reviewState'in r)assert.equal(r.reviewState,'ready');}
    report.counts[collection]={imported:all.docs.length,public:publicRows.docs.length};
    report.checks.push(`${collection}: expected retained records present; stable IDs unique; anonymous reads only published records`);
  }
  assert.equal((await payload.count({collection:'media',overrideAccess:true,where:{externalId:{in:obsoleteResourceCovers.externalIds}}})).totalDocs,0);
  report.checks.push('Reviewed obsolete cover thumbnails absent; generated PDF covers excluded from original import counts');
  assert.equal(report.counts.products.public,221);assert.equal(report.counts['product-variants'].public,2619);
  const [products,variants]=await Promise.all([
    payload.find({collection:'products',where:{externalId:{exists:true}},pagination:false,depth:0,overrideAccess:true}),
    payload.find({collection:'product-variants',pagination:false,depth:0,overrideAccess:true}),
  ]);
  assert.equal(products.docs.reduce((n,p)=>n+(p.legacyIds?.length||0),0),255);
  assert.equal(variants.docs.reduce((n,p)=>n+(p.legacyIds?.length||0),0),2904);
  assert.equal(variants.docs.filter(v=>!v.product).length,2);
  assert(variants.docs.filter(v=>!v.product).every(v=>v._status==='draft'));
  const skuCounts=new Map<string,number>();for(const v of variants.docs)if(v.sku)skuCounts.set(v.sku,(skuCounts.get(v.sku)||0)+1);
  const duplicates=[...skuCounts].filter(([,n])=>n>1).map(([sku])=>sku);assert.equal(duplicates.length,8);
  assert(variants.docs.filter(v=>duplicates.includes(v.sku||'')).every(v=>v._status==='draft'));
  assert(products.docs.filter(p=>p.sourceActive===false).every(p=>p._status==='draft'));
  assert(variants.docs.filter(v=>v.sourceActive===false).every(v=>v._status==='draft'));
  report.checks.push('All 2904 original variant IDs retained; 8 SKU conflict groups, inactive records and 2 orphans remain drafts');
  const tank=variants.docs.find(v=>v.externalId==='variant-10804');assert.equal(tank?.specs?.maxTemperatureC,90);assert.equal(tank.specs.prechargeBar,1.9);
  const pipe=products.docs.find(p=>p.externalId==='product-434')!;
  const children=await payload.find({collection:'product-variants',where:{product:{equals:pipe.id}},pagination:false,depth:0,overrideAccess:false});
  const parsed=children.docs.map(mapCatalogVariant).filter(v=>v!==null);
  assert.equal(parsed.length,children.docs.length);assert(variantRanges(parsed).some(s=>s.key==='outerDiameterMm'));
  assert(!JSON.stringify(parsed).includes('legacyIds'));
  const document=await payload.findByID({collection:'products',id:pipe.id,depth:2,overrideAccess:false});
  assert(document.image&&typeof document.image==='object'&&document.image.url);
  assert(document.catalogDocuments?.some(x=>x.document&&typeof x.document==='object'&&x.document.file&&typeof x.document.file==='object'&&x.document.file.url));
  report.checks.push('Pipe specifications and verified tank values preserved; public card has accessible image and PDF relationships');
  const source=JSON.parse(await readFile('/Users/boris/Documents/Codex/2026-10-15/https-heisskraft-ru-bitrix-admin-iblock/outputs/payload-catalog/data/products.json','utf8'));
  const originalLinks=source.reduce((n:number,p:{documents:unknown[]})=>n+p.documents.length,0);
  assert(products.docs.reduce((n,p)=>n+(p.catalogDocuments?.length||0),0)>=originalLinks);
  const library=await payload.find({collection:'catalog-documents',pagination:false,depth:0,overrideAccess:true});
  const files=library.docs.map(d=>d.file).filter(Boolean);assert.equal(new Set(files).size,files.length);
  const pdfs=await payload.find({collection:'media',where:{mimeType:{equals:'application/pdf'}},pagination:false,depth:0,overrideAccess:true});
  assert.equal(pdfs.docs.length,133);
  const pdfIds=new Set(pdfs.docs.map(d=>d.id));
  assert(pdfs.docs.every(f=>files.includes(f.id)));
  assert(products.docs.every(p=>(p.resources||[]).every(r=>!pdfIds.has(r.file as number))));
  for(const old of source){
    const current=products.docs.find(p=>p.externalId===old.externalId)!;
    const oldLinks=old.documents.map((d:{document:string})=>d.document);
    const currentIds=new Set((current.catalogDocuments||[]).map(d=>d.document));
    assert(library.docs.filter(d=>oldLinks.includes(d.externalId)).every(d=>currentIds.has(d.id)));
  }
  report.checks.push('All 133 unique PDFs have one shared library entry each; no direct PDF resource attachments; original document links retained');
  assert.equal((await payload.count({collection:'categories',overrideAccess:true})).totalDocs,15);
  assert.equal((await payload.count({collection:'articles',overrideAccess:true})).totalDocs,21);
  assert.equal((await payload.count({collection:'pages',overrideAccess:true})).totalDocs,3);
  report.checks.push('All document links retained; existing 15 categories, 21 articles and 3 pages preserved');
  await writeFile(`.local/catalog-transfer/${trial?'trial':'live'}-verification.json`,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}finally{await payload.destroy();}
process.exit(0);

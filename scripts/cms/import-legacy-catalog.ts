/** Initial migration of the reviewed 2026-10-15 catalog. Existing records are never overwritten. */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload';
import obsoleteResourceCovers from '../../src/cms/import/obsolete-resource-covers.json';

type Rich = { root?: { children?: { children?: { text?: string }[] }[] } };
type Identity = { externalId:string;title:string;sourceActive:boolean;reviewState:'ready'|'review'|'blocked';reviewNotes:string;legacyIds:{value:string}[];slug:string;sortOrder:number };
type Asset = {externalId:string;title:string;mimeType:string;sha256:string;bytes:number;sourcePaths:string[];usedBy:string[]};
type MediaRow={asset:string;role:'main'|'preview'|'gallery'|'technical';caption:string};
type Product = Identity & {primaryCategory:string;additionalCategories:string[];profile:string;orderMode:string;media:MediaRow[];description:Rich;characteristics:Rich;summary:string;titleEn:string;descriptionEn:Rich;characteristicsEn:Rich;documentsTextEn:string;documentsText:string;videoText:string;documents:{document:string;visible:boolean;legacyLinkIds:{value:string}[]}[];resources:{label:string;asset:string|null;url:string;section:string;visible:boolean}[]};
type Variant = Identity & {product:string|null;profile:string;sku:string;size:string;connection:string;color:string;media:MediaRow[];specs:Record<string,number>;packaging:Record<string,unknown>};
type Document = Identity & {file:string|null;cover:string|null;kind:string;description:string;legacyLabels:unknown};
type Category={externalId:string;path:string};
const args=process.argv.slice(2);
const option=(key:string)=>args.find(a=>a.startsWith(`--${key}=`))?.slice(key.length+3);
const source=path.resolve(option('source')||'/Users/boris/Documents/Codex/2026-10-15/https-heisskraft-ru-bitrix-admin-iblock/outputs/payload-catalog');
const mediaRoot=path.resolve(option('media')||'.local/catalog-transfer/media');
const trial=args.includes('--trial'),apply=args.includes('--apply'),publish=args.includes('--publish-ready');
const url=new URL(process.env.DATABASE_URL!);
if(!['127.0.0.1','localhost'].includes(url.hostname)||url.pathname!=='/heisskraft')throw Error('This initial migration is restricted to the configured local Heisskraft database.');
if(trial){url.pathname='/heisskraft_catalog_trial';process.env.DATABASE_URL=url.toString();process.env.CMS_UPLOAD_DIR=path.resolve('.local/catalog-transfer/trial-uploads');}
const read=async<T>(name:string):Promise<T>=>JSON.parse(await readFile(path.join(source,'data',`${name}.json`),'utf8'));
const [products,variants,documents,assets,categories]=await Promise.all([read<Product[]>('products'),read<Variant[]>('variants'),read<Document[]>('documents'),read<Asset[]>('assets'),read<Category[]>('categories')]);
if(products.length!==255||variants.length!==2878||documents.length!==105||assets.length!==1147)throw Error('Unexpected source counts');
// Do not resurrect thumbnails removed after the 2026-10-30 catalog review.
// IDs are content hashes, not titles; certificate scans and useful links stay.
const retiredCovers = new Set(obsoleteResourceCovers.externalIds);
for (const p of products) p.resources = p.resources.filter(r => !r.asset || !retiredCovers.has(r.asset));
for (const d of documents) if (d.cover && retiredCovers.has(d.cover)) d.cover = null;
if ([...products, ...variants].some(p => p.media.some(m => retiredCovers.has(m.asset)))) throw Error('A retired cover is now used in a product gallery; review it before importing.');
for (let i = assets.length - 1; i >= 0; i--) if (retiredCovers.has(assets[i].externalId)) assets.splice(i, 1);
const plain=(value:Rich)=>(value?.root?.children||[]).map(p=>(p.children||[]).map(c=>c.text||'').join('')).join('\n\n');
const ready=(x:Identity)=>publish&&x.sourceActive&&x.reviewState==='ready';
const parentByID=new Map(products.map(p=>[p.externalId,p]));
const variantReady=(v:Variant)=>ready(v)&&!!v.product&&ready(parentByID.get(v.product)!);
const eligible=new Set([...products.filter(ready),...documents.filter(ready),...variants.filter(variantReady)].map(x=>x.externalId));
const hashFile=async(file:string)=>{const h=createHash('sha256');for await(const b of createReadStream(file))h.update(b);return h.digest('hex');};
// Verify the approved input files before any mutation.
const manifest=(await readFile(path.join(source,'checksums.sha256'),'utf8')).trim().split('\n');
for(const line of manifest){const [hash,name]=line.split('  ');if(name.startsWith('data/')&&await hashFile(path.join(source,name))!==hash)throw Error(`Source checksum mismatch: ${name}`);}
const files=new Map<string,string>();
for(const a of assets){
  for(const relative of a.sourcePaths){
    const f=path.resolve(mediaRoot,relative);if(!f.startsWith(mediaRoot+path.sep))throw Error('Unsafe media path');
    try{await stat(f);files.set(a.externalId,f);break;}catch{}
  }
  const f=files.get(a.externalId);if(!f||await hashFile(f)!==a.sha256)throw Error(`Missing or changed media: ${a.externalId}`);
}
// Every PDF has exactly one library entry, including PDFs formerly embedded
// in HTML resources. Products keep only references to that shared document.
const pdfAssets = assets.filter(a=>a.mimeType==='application/pdf');
const documentByFile = new Map(documents.filter(d=>d.file).map(d=>[d.file!,d.externalId]));
for(const a of pdfAssets){
  if(documentByFile.has(a.externalId))continue;
  const externalId=`document-pdf-${a.sha256}`;
  const linkedProducts=products.filter(p=>a.usedBy.includes(p.externalId));
  const filename=path.basename(a.sourcePaths.find(p=>p.toLowerCase().endsWith('.pdf'))||'').replace(/\.pdf$/i,'').replace(/_/g,' ');
  const title=filename||a.title.replace(/ — pdf$/,'');
  const sourceActive=linkedProducts.some(p=>p.sourceActive&&p.reviewState==='ready');
  documents.push({externalId,title,slug:externalId,sourceActive,reviewState:'ready',reviewNotes:'',legacyIds:[],sortOrder:500,file:a.externalId,cover:null,kind:'PDF',description:'',legacyLabels:linkedProducts.flatMap(p=>p.resources.filter(r=>r.asset===a.externalId).map(r=>r.label))});
  documentByFile.set(a.externalId,externalId);
}
for(const p of products){
  for(const r of p.resources){
    if(!r.asset||!documentByFile.has(r.asset))continue;
    const document=documentByFile.get(r.asset)!;
    const link=p.documents.find(d=>d.document===document);
    if(link)link.visible=link.visible||r.visible;
    else p.documents.push({document,visible:r.visible,legacyLinkIds:[]});
  }
  p.resources=p.resources.filter(r=>!r.asset||!documentByFile.has(r.asset));
}
const {default:config}=await import('../../payload.config');
const payload=await getPayload({config});
const lock=new pg.Client({connectionString:process.env.DATABASE_URL});await lock.connect();
const locked=(await lock.query('select pg_try_advisory_lock(20261015, 2878) as acquired')).rows[0].acquired;
if(!locked)throw Error('Another catalog migration is already running.');
const output=path.resolve('.local/catalog-transfer',trial?'trial-result.json':apply?'import-result.json':'preflight.json');
const result={mode:apply?'apply':'preflight',trial,publishReady:publish,source,startedAt:new Date().toISOString(),counts:{products:products.length,variants:variants.length,documents:documents.length,media:assets.length},plannedPublished:{products:products.filter(ready).length,variants:variants.filter(variantReady).length,documents:documents.filter(ready).length,media:assets.filter(a=>a.usedBy.some(id=>eligible.has(id))).length},created:{} as Record<string,number>,skipped:{} as Record<string,number>,ids:{} as Record<string,number>,complete:false};
const save=()=>writeFile(output,JSON.stringify(result,null,2)+'\n');
try{
  const user=(await payload.find({collection:'users',where:{role:{equals:'admin'}},limit:1,depth:0,overrideAccess:true})).docs[0];
  if(!user)throw Error('Administrator not found');
  const context={trustedMigration:true,legacyCatalogImport:true,skipContentHooks:true};
  const existing=new Map<string,number>(),catmap=new Map<string,number>();
  for(const collection of ['media','catalog-documents','products','product-variants'] as const){
    const rows=await payload.find({collection,pagination:false,depth:0,user,overrideAccess:false});
    for(const row of rows.docs)if(row.externalId){existing.set(row.externalId,row.id);result.ids[row.externalId]=row.id;}
  }
  const dbcategories=await payload.find({collection:'categories',pagination:false,depth:0,user,overrideAccess:false});
  for(const c of categories){const match=dbcategories.docs.find(x=>x.path===c.path.replace('/catalog/',''));if(!match)throw Error('Missing category '+c.path);catmap.set(c.externalId,match.id);}
  const slugs=new Set<string>();
  const slugFor=(p:Product)=>p.slug.toLowerCase().replace(/_/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'');
  for(const p of products){const slug=slugFor(p);if(!slug||slugs.has(slug))throw Error('Slug collision');slugs.add(slug);}
  console.log(JSON.stringify({mode:result.mode,trial,counts:result.counts,plannedPublished:result.plannedPublished,existing:existing.size}));
  if(apply){
    const id=(key:string|null)=>key?result.ids[key]??(()=>{throw Error('Missing reference '+key)})():null;
    const gallery=(rows:MediaRow[])=>rows.map(r=>({file:id(r.asset)!,role:r.role,caption:r.caption}));
    const count=(collection:string,skipped:boolean)=>{const bag=skipped?result.skipped:result.created;bag[collection]=(bag[collection]||0)+1;};
    for(const [index,a] of assets.entries()){
      if(existing.has(a.externalId)){count('media',true);continue;}
      const data=await readFile(files.get(a.externalId)!);
      const mime=data.subarray(0,5).toString()==='%PDF-'?'application/pdf':data[0]===255&&data[1]===216?'image/jpeg':data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':null;
      if(!mime)throw Error('Unsupported file signature '+a.externalId);
      const extension=mime==='application/pdf'?'pdf':mime==='image/png'?'png':'jpg';
      const doc=await payload.create({collection:'media',user,overrideAccess:false,context,depth:0,
        file:{data,mimetype:mime,name:`${a.sha256}.${extension}`,size:data.length},
        data:{externalId:a.externalId,sha256:a.sha256,title:a.title,alt:a.title,_status:publish&&a.usedBy.some(x=>eligible.has(x))?'published':'draft'}});
      result.ids[a.externalId]=doc.id;count('media',false);
      if((index+1)%100===0){console.log(`Media ${index+1}/${assets.length}`);await save();}
    }
    await save();
    for(const d of documents){
      if(existing.has(d.externalId)){count('documents',true);continue;}
      const doc=await payload.create({collection:'catalog-documents',user,overrideAccess:false,context,depth:0,data:{title:d.title,externalId:d.externalId,legacyIds:d.legacyIds,sourceActive:d.sourceActive,reviewState:d.reviewState,reviewNotes:d.reviewNotes,description:d.description,kind:d.kind,file:id(d.file),cover:id(d.cover),legacyLabels:d.legacyLabels as never,_status:ready(d)?'published':'draft'}});
      result.ids[d.externalId]=doc.id;count('documents',false);
    }
    await save();
    for(const p of products){
      if(existing.has(p.externalId)){
        if(trial&&args.includes('--refresh-trial-documents'))await payload.update({collection:'products',id:existing.get(p.externalId)!,user,overrideAccess:false,context,data:{catalogDocuments:p.documents.map(d=>({...d,document:id(d.document)!})),resources:p.resources.map(r=>({label:r.label,file:id(r.asset),url:r.url||null,section:r.section,visible:r.visible}))}});
        count('products',true);continue;
      }
      const data={externalId:p.externalId,title:p.title,slug:slugFor(p),sourceSlug:p.slug,sourceActive:p.sourceActive,legacyIds:p.legacyIds,reviewState:p.reviewState,reviewNotes:p.reviewNotes,productKind:p.orderMode==='request'?'request':'family',profile:p.profile,category:catmap.get(p.primaryCategory),additionalCategories:p.additionalCategories.map(c=>catmap.get(c)!),description:plain(p.description),characteristics:plain(p.characteristics),summary:p.summary,
        titleEn:p.titleEn,descriptionEn:plain(p.descriptionEn),characteristicsEn:plain(p.characteristicsEn),documentsTextEn:p.documentsTextEn,documentsText:p.documentsText,videoText:p.videoText,sortOrder:p.sortOrder,
        image:p.media[0]?id(p.media[0].asset):null,gallery:gallery(p.media),catalogDocuments:p.documents.map(d=>({...d,document:id(d.document)})),resources:p.resources.map(r=>({label:r.label,file:id(r.asset),url:r.url||null,section:r.section,visible:r.visible})),_status:ready(p)?'published':'draft'} as RequiredDataFromCollectionSlug<'products'>;
      const doc=await payload.create({collection:'products',user,overrideAccess:false,context,depth:0,data});
      result.ids[p.externalId]=doc.id;count('products',false);
      if(p.slug!==doc.slug)await payload.create({collection:'redirects',user,overrideAccess:false,context,data:{from:`/products/${p.slug}`,to:`/products/${doc.slug}`}});
    }
    await save();
    for(const [index,v]of variants.entries()){
      if(existing.has(v.externalId)){count('variants',true);continue;}
      const data={externalId:v.externalId,title:v.title,product:id(v.product),sourceSlug:v.slug,sourceActive:v.sourceActive,legacyIds:v.legacyIds,reviewState:v.reviewState,reviewNotes:v.reviewNotes,profile:v.profile,sku:v.sku,size:v.size,connection:v.connection,color:v.color||null,specs:v.specs,packaging:v.packaging,gallery:gallery(v.media),sortOrder:v.sortOrder,_status:variantReady(v)?'published':'draft'} as RequiredDataFromCollectionSlug<'product-variants'>;
      const doc=await payload.create({collection:'product-variants',user,overrideAccess:false,context,depth:0,data});result.ids[v.externalId]=doc.id;count('variants',false);
      if((index+1)%250===0){console.log(`Variants ${index+1}/${variants.length}`);await save();}
    }
    // Aliases include previously merged entities, not only current records.
    const aliases=await read<Record<string,string>>('id-aliases');
    for(const [old,current]of Object.entries(aliases)){const normalized=current.replace(/^variant-/,'variant-');if(result.ids[normalized])result.ids[old]=result.ids[normalized];}
  }
  result.complete=true;await save();console.log('Completed:',result.created,'Skipped:',result.skipped);
}finally{await save();await lock.query('select pg_advisory_unlock(20261015,2878)');await lock.end();await payload.destroy();}
process.exit(0);

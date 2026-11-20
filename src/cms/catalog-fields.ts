import { ValidationError, type CollectionConfig, type CollectionBeforeValidateHook, type Field, type TextField, type Where } from 'payload';
import { canEdit } from './access';
import definitions from './catalog-definitions.json';

type Factory = (slug: string, label: string, fields: Field[]) => CollectionConfig;
const staff = ({ req }: { req: { user?: unknown } }) => canEdit(req.user as { role?: unknown });
const text = (name: string, label: string): TextField => ({ name, label, type: 'text' });
const identity = (): Field[] => [
  { name: 'externalId', label: 'Стабильный внешний ID', type: 'text', unique: true, index: true },
  { name: 'legacyIds', label: 'Прежние ID', type: 'array', access: { read: staff }, fields: [text('value', 'ID')] },
  { name: 'sourceActive', label: 'Был активен в исходном каталоге', type: 'checkbox', access: { read: staff } },
];
export const reviewFields = (): Field[] => [
  { name: 'reviewState', label: 'Проверка данных', type: 'select', defaultValue: 'ready', options: [{ value: 'ready', label: 'Проверено' }, { value: 'review', label: 'Требуется проверка' }, { value: 'blocked', label: 'Есть конфликт' }] },
  { name: 'reviewNotes', label: 'Что нужно проверить', type: 'textarea', access: { read: staff } },
];
const profile = (): Field => ({ name: 'profile', label: 'Тип продукции', type: 'select', options: definitions.profiles, index: true });
const gallery = (): Field => ({ name: 'gallery', label: 'Фотографии и чертежи', labels: { singular: 'Фото', plural: 'Фото' }, type: 'array', fields: [
  { name: 'file', label: 'Файл', type: 'upload', relationTo: 'media', required: true },
  { name: 'role', label: 'Назначение', type: 'select', options: [{value:'main',label:'Основное фото'},{value:'gallery',label:'Фото'},{value:'technical',label:'Чертёж'}] }, text('caption','Подпись'),
] });
const rid = (v: unknown): string | number | null => typeof v === 'string' || typeof v === 'number' ? v : v && typeof v === 'object' && 'id' in v ? rid(v.id) : null;
const reviewed: CollectionBeforeValidateHook = ({ data, originalDoc, req, collection }) => {
  const record = { ...originalDoc, ...data };
  if (record._status === 'published' && record.reviewState && record.reviewState !== 'ready') throw new ValidationError({ collection: collection.slug, req, errors: [{path:'reviewState',message:'Завершите проверку перед публикацией.'}] });
  return data;
};

export function extendCatalog(products: CollectionConfig, media: CollectionConfig, factory: Factory): CollectionConfig[] {
  const tabs = products.fields.find(f => f.type === 'tabs');
  if (!tabs || tabs.type !== 'tabs') throw new Error('Product tabs missing');
  const main = tabs.tabs[0].fields;
  const sku = main.find(f => 'name' in f && f.name === 'sku');
  if (sku && sku.type === 'text') sku.required = false;
  main.splice(1, 0, { name: 'productKind', label: 'Карточка товара', type:'select', defaultValue:'family', options:[{value:'single',label:'Товар с одним артикулом'},{value:'family',label:'Товар с номенклатурой'},{value:'request',label:'Подбор по запросу'}] }, profile());
  main.push({name:'additionalCategories',label:'Также показывать в разделах',type:'relationship',relationTo:'categories',hasMany:true}, {name:'summary',label:'Краткое описание',type:'textarea'}, {name:'sortOrder',label:'Порядок',type:'number',defaultValue:500});
  // What the product is comes first; identifiers and ordering live in the collapsed service block.
  const named = (field: Field) => 'name' in field ? field.name : undefined;
  const service = main.find(f => f.type === 'collapsible');
  const order = ['title','category','additionalCategories','productKind','profile','sku','summary','description'];
  const sortOrder = main.find(f => named(f) === 'sortOrder');
  if (service?.type === 'collapsible' && sortOrder) service.fields.push(sortOrder);
  const rest = main.filter(f => f !== service && f !== sortOrder && !order.includes(named(f) ?? ''));
  main.splice(0, main.length, ...order.flatMap(name => main.filter(f => named(f) === name)), ...rest, ...(service ? [service] : []));
  tabs.tabs.splice(1,0,{label:'Номенклатура',fields:[{name:'variants',label:'Номенклатура товара',type:'join',collection:'product-variants',on:'product',defaultLimit:25,defaultSort:'sortOrder'}]});
  tabs.tabs.find(t=>t.label==='Изображения')!.fields.push(gallery());
  tabs.tabs.find(t=>t.label==='Характеристики')!.fields.unshift({name:'characteristics',label:'Общие технические характеристики',type:'textarea'});
  tabs.tabs.find(t=>t.label==='Документы')!.fields.push({name:'catalogDocuments',label:'Документы каталога',labels:{singular:'Документ',plural:'Документы'},type:'array',fields:[
    {name:'document',label:'Документ',type:'relationship',relationTo:'catalog-documents',required:true},
    {name:'visible',label:'Показывать у этого товара',type:'checkbox',defaultValue:true},
    {name:'legacyLinkIds',dbName:'cat_doc_ids',label:'Прежние ID связи',type:'array',access:{read:staff},fields:[text('value','ID')]},
  ]}, {name:'resources',label:'Архив дополнительных материалов',type:'array',access:{read:staff},fields:[text('label','Название'),{name:'file',label:'Файл',type:'upload',relationTo:'media',filterOptions:{mimeType:{not_equals:'application/pdf'}}},
    {name:'url',label:'Внешняя ссылка',type:'text',validate:(v:unknown)=>!v||typeof v==='string'&&/^https?:\/\//.test(v)||'Только HTTP/HTTPS ссылки.'},
    text('section','Раздел'),{name:'visible',label:'Показывать',type:'checkbox',defaultValue:true}]},
    {name:'documentsText',label:'Примечания к документам',type:'textarea'},{name:'videoText',label:'Примечания к видео',type:'textarea'});
  tabs.tabs.push({label:'English',fields:[text('titleEn','Название EN'),{name:'descriptionEn',label:'Описание EN',type:'textarea'}, {name:'characteristicsEn',label:'Характеристики EN',type:'textarea'},{name:'documentsTextEn',label:'Документы EN',type:'textarea'}]});
  const documentsTab = tabs.tabs.find(t=>t.label==='Документы')!;
  const archive = documentsTab.fields.findIndex(f=>'name'in f&&f.name==='resources');
  if(archive>=0)documentsTab.fields.splice(archive,1,{type:'collapsible',label:'Архив старого сайта',fields:[documentsTab.fields[archive]]});
  tabs.tabs.find(t=>t.label==='Проверка')!.fields.push(
    { name: 'publicationRequested', label: 'Запрос на публикацию', type: 'checkbox', defaultValue: false, index: true },
    ...reviewFields(),
    {type:'collapsible',label:'Служебное',fields:[...identity().filter(f=>'name' in f&&f.name!=='externalId'),{...text('sourceSlug','Прежний адрес'),access:{read:staff}}]},
  );
  products.hooks!.beforeValidate!.push(reviewed);
  media.fields.push(...identity(), {name:'sha256',label:'SHA-256',type:'text',unique:true,index:true,access:{read:staff}});

  const variants = factory('product-variants','Номенклатура товаров',[{type:'tabs',tabs:[
    {label:'Основное',fields:[{name:'title',label:'Название',type:'text',required:true},
      {name:'product',label:'Товар',type:'relationship',relationTo:'products',index:true},
      {name:'sku',label:'Артикул',type:'text',index:true},profile(),text('size','Размер'),text('connection','Присоединение'),
      {name:'color',label:'Цвет',type:'select',options:[['green','Зелёный'],['purple','Фиолетовый'],['black','Чёрный'],['red','Красный'],['blue','Синий'],['azure','Голубой']].map(([value,label])=>({value,label}))},
      {name:'sortOrder',label:'Порядок',type:'number',defaultValue:500}]},
    {label:'Характеристики',fields:[{name:'specs',label:'Параметры',type:'group',fields:definitions.fields.map(f=>({name:f.key,label:f.label+(f.unit?` (${f.unit})`:''),type:'number'}))}]},
    {label:'Изображения',fields:[gallery()]},
    {label:'Упаковка',fields:[{name:'packaging',label:'Параметры упаковки',type:'group',fields:[
      ...[['weight','Вес'],['amount','Количество'],['volume','Объём']].flatMap(([key,label]):Field[]=>[{name:key+'Value',label,type:'number',min:0},text(key+'Unit','Единица'),text(key+'Note','Примечание')]),
      {name:'unitsVerified',label:'Единицы проверены',type:'checkbox',defaultValue:false},
    ]}]},
    {label:'Проверка и история',fields:[...reviewFields(),...identity(),{name:'sourceSlug',label:'Прежний адрес',type:'text',access:{read:staff}}]},
  ]}]);
  variants.access = {...variants.access, read: async ({req}):Promise<boolean|Where> => {
    if(canEdit(req.user))return true;
    // Disable reverse joins while checking parent visibility, so this read
    // never expands variants or recursively evaluates their access rule.
    const parents=await req.payload.find({collection:'products',where:{_status:{equals:'published'}},pagination:false,depth:0,select:{_status:true},joins:false,overrideAccess:false,req});
    if(!parents.docs.length)return false;
    return {and:[{_status:{equals:'published'}},{product:{in:parents.docs.map(p=>p.id)}},{reviewState:{equals:'ready'}}]};
  }};
  variants.hooks!.beforeValidate = [reviewed,async ({data,originalDoc,req})=>{
    const record={...originalDoc,...data};
    if(record._status==='published'){
      const errors=[];
      if(!rid(record.product))errors.push({path:'product',message:'Свяжите позицию с товаром.'});
      if(!record.sku||record.sku.trim().toLowerCase()==='по запросу')errors.push({path:'sku',message:'Укажите настоящий артикул.'});
      if(record.sku){
        const conditions:import('payload').Where[]=[{sku:{equals:record.sku}}];if(originalDoc?.id)conditions.push({id:{not_equals:originalDoc.id}});
        const same=await req.payload.count({collection:'product-variants',where:{and:conditions},req,overrideAccess:true});
        if(same.totalDocs)errors.push({path:'sku',message:'Артикул повторяется. Исправьте конфликт перед публикацией.'});
      }
      if(errors.length)throw new ValidationError({collection:'product-variants',req,errors});
    }
    return data;
  }];
  const docs=factory('catalog-documents','Документы каталога',[
    {name:'title',label:'Название',type:'text',required:true},text('kind','Вид документа'),{name:'description',label:'Описание',type:'textarea'},
    {name:'file',label:'PDF-файл',type:'upload',relationTo:'media',filterOptions:{mimeType:{equals:'application/pdf'}}},{name:'cover',label:'Обложка',type:'upload',relationTo:'media'},
    ...reviewFields(),...identity(),{name:'legacyLabels',label:'Прежние названия',type:'json',access:{read:staff}},
  ]);
  docs.hooks!.beforeValidate=[reviewed,async({data,originalDoc,req})=>{
    const d={...originalDoc,...data};if(d._status==='published'&&!rid(d.file))throw new ValidationError({collection:'catalog-documents',req,errors:[{path:'file',message:'Добавьте документ.'}]});
    if(rid(d.file)){
      const conditions:Where[]=[{file:{equals:rid(d.file)}}];if(originalDoc?.id)conditions.push({id:{not_equals:originalDoc.id}});
      const same=await req.payload.count({collection:'catalog-documents',where:{and:conditions},req,overrideAccess:true});
      if(same.totalDocs)throw new ValidationError({collection:'catalog-documents',req,errors:[{path:'file',message:'Этот файл уже есть в библиотеке. Свяжите товар с существующим документом.'}]});
    }
    return data;
  }];
  return [variants, docs];
}

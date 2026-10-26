'use client';

import { useId, useState } from 'react';
import { useConfig, useField } from '@payloadcms/ui';
import type { JSONFieldClientProps } from 'payload';
import { solutionSchema, type SolutionContent } from '@/content/cms-schemas';
import { updateContentAtPath } from '../admin-form-utils';
import styles from './EditorFields.module.css';

const sections: { key: keyof SolutionContent; label: string }[] = [
  { key:'dcHero', label:'ЦОД — главный баннер' }, { key:'dcIntro', label:'ЦОД — о системе' },
  { key:'dcProducts', label:'ЦОД — решения' }, { key:'coolingProducts', label:'ЦОД — элементы модели' },
  { key:'fireHero', label:'Пожаротушение — главный баннер' }, { key:'fireIntro', label:'Пожаротушение — о системе' },
  { key:'firePageProducts', label:'Пожаротушение — решения' }, { key:'fireProducts', label:'Пожаротушение — элементы модели' },
  { key:'fireStations', label:'Пожаротушение — станции' },
];
const labels: Record<string,string> = {
  heading:'Заголовок', headingSecondLine:'Заголовок — вторая строка', headingAccent:'Акцент заголовка', description:'Описание', descriptionSecondLine:'Описание — вторая строка',
  definition:'Кратко о системе', growthHeading:'Заголовок о развитии', growthDescription:'Текст о развитии', systemDescription:'Текст о работе системы', statDescription:'Подпись к статистике',
  reliabilityHeading:'Заголовок о надёжности', reliabilityDescription:'Текст о надёжности', planningDescription:'Текст о проектировании', systemHeading:'Заголовок системы', solutionsDescription:'Текст о решениях',
  pipeTitle:'Название трубопровода', pipeDescription:'Описание трубопровода', pumpTitle:'Заголовок насосного оборудования', pumpTitleSecondLine:'Заголовок насосного оборудования — вторая строка', pumpDescription:'Описание насосного оборудования',
  projectNote:'Примечание к проекту', ctaTitle:'Заголовок обращения', ctaTitleSecondLine:'Заголовок обращения — вторая строка', pipeProperties:'Свойства трубопровода', pumpProperties:'Свойства насосов',
  pipeHeading:'Заголовок трубопровода', pipeHeadingSecondLine:'Заголовок трубопровода — вторая строка',
  label:'Краткое название', title:'Заголовок', text:'Описание', image:'Изображение', alt:'Описание изображения', detail:'Дополнительная подпись', badge:'Дополнительное изображение', name:'Название станции', application:'Применение',
};
type ContentPath = (string | number)[];
type MediaOption = { id: number; title?: string; filename?: string; url?: string; _status?: string };

function ImagePicker({ onChange, disabled }: { onChange:(value:string)=>void; disabled:boolean }) {
  const { config } = useConfig();
  const [files, setFiles] = useState<MediaOption[] | null>(null);
  const [state, setState] = useState<'idle'|'loading'|'error'>('idle');
  async function load() {
    setState('loading');
    try {
      const response = await fetch(`${config.routes.api}/media?limit=100&depth=0&sort=-updatedAt&where[mimeType][contains]=image/`, { credentials:'same-origin' });
      if (!response.ok) throw new Error();
      const data: { docs:MediaOption[] } = await response.json(); setFiles(data.docs); setState('idle');
    } catch { setState('error'); }
  }
  return <div>
    <button type="button" onClick={load} disabled={disabled || state === 'loading'}>{state === 'loading' ? 'Загрузка файлов…' : 'Выбрать из файлов'}</button>
    {state === 'error' && <p role="alert">Не удалось загрузить файлы. Повторите попытку; введённый адрес сохранён.</p>}
    {files && <label>Изображения из медиатеки<select disabled={disabled} value="" onChange={e => { if (e.target.value) onChange(e.target.value); }}><option value="">Выберите изображение</option>{files.filter(file => file.url).map(file => <option key={file.id} value={file.url}>{file.title || file.filename}{file._status !== 'published' ? ' (черновик)' : ''}</option>)}</select><small>Показаны последние 100 изображений. Для нового файла откройте раздел «Файлы». Черновик файла сначала нужно опубликовать.</small></label>}
  </div>;
}

export default function SolutionEditor({ path, readOnly }: JSONFieldClientProps) {
  const { value, setValue, formProcessing, formSubmitted, showError, errorMessage, disabled: fieldDisabled } = useField<SolutionContent>({ path,
    validate: candidate => solutionSchema.safeParse(candidate).success || 'Проверьте отмеченные поля текста решений.',
  });
  const prefix = useId();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const parsed = solutionSchema.safeParse(value);
  const errors = new Map(parsed.success ? [] : parsed.error.issues.map(issue => [issue.path.join('.'), issue.message]));
  const disabled = !!readOnly || fieldDisabled || formProcessing;
  if (!value || typeof value !== 'object') return <p role="alert">Содержимое не загружено. Обновите страницу; существующие тексты не будут заменены.</p>;
  if ((!parsed.success && parsed.error.issues.some(issue => issue.code === 'invalid_type')) || sections.some(({key}) => !value[key] || typeof value[key] !== 'object' || (Array.isArray(value[key]) && value[key].some(item => !item || typeof item !== 'object')))) return <p role="alert">Структура содержимого неполная. Обратитесь к администратору для восстановления версии. Сохранённые данные не изменены.</p>;
  const update = (keys:ContentPath, text:unknown) => setValue(updateContentAtPath(value, keys, text));

  function field(keys:ContentPath, current:string, label:string) {
    const key = keys.join('.'); const name = String(keys.at(-1)); const id = `${prefix}-${key}`;
    const image = name === 'image' || name === 'badge';
    const multiline = /description|text|note/i.test(name) && name !== 'alt';
    const error = (formSubmitted || showError || touched[key]) && errors.get(key);
    const props = { id, value:current, disabled, 'aria-invalid':!!error, 'aria-describedby':`${id}-hint${error ? ` ${id}-error` : ''}`, maxLength:image ? 2048 : 12000,
      onChange:(event:React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update(keys, name === 'badge' && !event.target.value ? undefined : event.target.value),
      onBlur:() => setTouched(previous => ({...previous, [key]:true})),
    };
    return <div className={styles.field} key={key}>
      <label htmlFor={id}>{label}</label>
      {multiline ? <textarea {...props} rows={3} /> : <input {...props} type="text" />}
      <small id={`${id}-hint`}>{image ? 'Путь /images/… или ссылка на изображение. Можно выбрать опубликованный файл из медиатеки.' : 'Обычный текст, без HTML. Переносы строк сохраняются.'}</small>
      {error && <span id={`${id}-error`} className={styles.error} role="alert">{error}</span>}
      {image && <><ImagePicker disabled={disabled} onChange={text => update(keys,text)} />{current && !errors.has(key) && <img className={styles.preview} src={current} alt="Предпросмотр выбранного изображения" loading="lazy" />}</>}
    </div>;
  }
  function objectFields(object:Record<string,unknown>, base:ContentPath) {
    return Object.entries(object).sort(([a], [b]) => Object.keys(labels).indexOf(a) - Object.keys(labels).indexOf(b)).filter(([name]) => name !== 'id').map(([name, current]) => {
      const keys = [...base, name];
      if (typeof current === 'string' || (current === undefined && ['detail','badge'].includes(name))) return field(keys, current as string || '', labels[name] || name);
      if (Array.isArray(current)) return <fieldset className={styles.group} key={name}><legend>{labels[name] || name}</legend>
        {current.map((row:string[], index:number) => <div className={styles.row} key={index}>{field([...keys,index,0],row[0],'Свойство')}{field([...keys,index,1],row[1],'Значение')}<button type="button" disabled={disabled} onClick={() => update(keys,current.filter((_, i) => i !== index))}>Удалить свойство {index + 1}</button></div>)}
        <button type="button" disabled={disabled || current.length >= 100} onClick={() => update(keys,[...current,['','']])}>Добавить свойство</button>
      </fieldset>;
      return null;
    });
  }
  return <div className={styles.editor}>
    <p>Выберите нужный раздел. Здесь можно менять тексты и изображения; состав элементов модели и их ракурсы сохраняются.</p>
    {showError && errorMessage && <p className={styles.error} role="alert">{errorMessage}</p>}
    {sections.map(({key,label}, index) => <details className={styles.section} key={key} open={index === 0 ? true : undefined}>
      <summary>{label}{[...errors.keys()].some(error => error.startsWith(key + '.')) && (formSubmitted || showError) ? ' — проверьте поля' : ''}</summary>
      <div className={styles.fields}>{Array.isArray(value[key]) ? (value[key] as {id:string;label?:string;name?:string}[]).map((item, row) => <fieldset className={styles.group} key={item.id}>
        <legend>{item.label || item.name || item.id}</legend>{objectFields(item,[key,row])}
        {'image' in item && !('detail' in item) && field([key,row,'detail'],'','Дополнительная подпись')}
        {'image' in item && !('badge' in item) && field([key,row,'badge'],'','Дополнительное изображение')}
      </fieldset>) : objectFields(value[key] as Record<string,unknown>,[key])}</div>
    </details>)}
  </div>;
}

import { describe, expect, it } from 'vitest';
import { searchSite, type SiteSearchEntry } from '@/lib/site-search';

const entry = (href: string, title: string, description = '', keywords = ''): SiteSearchEntry => ({ href, title, description, keywords, kind: 'Продукт' });

describe('site search ranking', () => {
  it('ranks exact names above title phrases and supporting copy, with at most three previews', () => {
    const data = [entry('/a', 'Насос', 'Для FireOff'), entry('/b', 'Труба FireOff'), entry('/c', 'FireOff 125'), entry('/d', 'FireOff')];
    expect(searchSite(data, 'fireoff').map(item => item.href)).toEqual(['/d', '/c', '/b']);
  });
  it('matches all words across names, descriptions and SKU without mutating input', () => {
    const data = [entry('/a', 'Насос HIP', 'Циркуляционный', 'HK-125'), entry('/b', 'Насос HIP', 'Дренажный', 'HK-126')];
    const before = JSON.stringify(data);
    expect(searchSite(data, 'насос цирк 125')).toEqual([data[0]]);
    expect(searchSite(data, 'HK 126')).toEqual([data[1]]);
    expect(JSON.stringify(data)).toBe(before);
  });
  it('normalizes Cyrillic ё, case and engineering punctuation', () => {
    expect(searchSite([entry('/a', 'Ёмкость PP-R/CT')], 'ЕМКОСТЬ pp r ct')).toHaveLength(1);
  });
  it('does not fill short result sets with irrelevant or duplicate links', () => {
    const match = entry('/a', 'Therm');
    expect(searchSite([match, match, entry('/b', 'Насос')], 'therm')).toEqual([match]);
    expect(searchSite([match], 'unknown')).toEqual([]);
    expect(searchSite([match], '  --- ')).toEqual([]);
  });
  it('uses a deterministic tie order regardless of CMS query order', () => {
    const data = [entry('/z', 'Насос Б'), entry('/a', 'Насос А')];
    expect(searchSite(data, 'насос')).toEqual(searchSite([...data].reverse(), 'насос'));
  });
});

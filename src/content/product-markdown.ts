// Split long imported prose only at full sentence boundaries. Keep engineering
// values, decimal separators and abbreviations within the original sentence.
function paragraphs(line: string) {
  if (line.length < 550) return [line];
  const output: string[] = [];
  let current = '';
  for (const sentence of line.split(/(?<=[.!?])\s+(?=[А-ЯЁA-Z])/u)) {
    if (current.length >= 280) {
      output.push(current);
      current = '';
    }
    current += (current ? ' ' : '') + sentence;
  }
  if (current) output.push(current);
  return output;
}

// Older imports use standalone section labels and literal bullets separated by blank lines.
export function productMarkdown(source: string, specifications = false): string {
  const text = source.trim().replace(/\r\n?/g, '\n');
  if (!text || /^(?: {0,3}(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s?|`{3}|~{3}|\|)| {4}\S)|^[^\n]+\n[| :]*-{3}[- :|]*$/m.test(text)) return text;

  const blocks: string[] = [];
  let bullets: string[] = [];
  let fields: { key: string; value: string }[] = [];
  function flushBullets() {
    if (bullets.length) blocks.push(bullets.join('\n'));
    bullets = [];
  }
  function flushFields() {
    if (fields.length > 1) {
      const escape = (cell: string) => cell.replace(/\|/g, '\\|');
      blocks.push(['| Параметр | Значение |', '| --- | --- |', ...fields.map(f => `| ${escape(f.key)} | ${escape(f.value)} |`)].join('\n'));
    } else if (fields.length) blocks.push(`**${fields[0].key}:** ${fields[0].value}`);
    fields = [];
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = /^[•●▪]\s*/.test(line);
    const content = line.replace(/^[•●▪]\s*/, '');
    const pair = /^([\p{L}][^:*|]{0,55}):\s+(.+)$/u.exec(content);
    if (specifications && pair) {
      flushBullets();
      fields.push({ key: pair[1], value: pair[2] });
      continue;
    }
    flushFields();
    if (bullet) {
      bullets.push(`- ${pair ? `**${pair[1]}:** ${pair[2]}` : content}`);
      continue;
    }
    flushBullets();
    if (/^[\p{L}][^:!?]{0,65}:$/u.test(content)) blocks.push('## ' + content.slice(0, -1).trimEnd());
    else if (pair) blocks.push(`**${pair[1]}:** ${pair[2]}`);
    else blocks.push(...paragraphs(content));
  }
  flushBullets();
  flushFields();
  return blocks.join('\n\n');
}

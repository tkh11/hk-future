import { describe, expect, it } from 'vitest';
import { productMarkdown } from '@/content/product-markdown';

describe('product Markdown', () => {
  it('groups imported section labels and bullets while preserving technical notation', () => {
    const formatted = productMarkdown('Применение:\n\n• ГВС\n\n• T < 80 °C\n\nКонструкция:\n\n• Корпус: чугун');
    expect(formatted).toBe('## Применение\n\n- ГВС\n- T < 80 °C\n\n## Конструкция\n\n- **Корпус:** чугун');
    expect(productMarkdown(formatted)).toBe(formatted);
  });
  it('groups successive specification fields into a table and retains author Markdown', () => {
    const formatted = productMarkdown('Материал: Чугун\n\nДавление: 10 бар', true);
    expect(formatted).toContain('| Материал | Чугун |\n| Давление | 10 бар |');
    expect(productMarkdown(formatted, true)).toBe(formatted);
    expect(productMarkdown('## Монтаж\n\n> **Важно:** соблюдать направление потока.')).toBe('## Монтаж\n\n> **Важно:** соблюдать направление потока.');
  });
});

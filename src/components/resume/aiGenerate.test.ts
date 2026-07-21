import { describe, it, expect } from 'vitest';
import { extractJson } from './aiGenerate';

describe('extractJson', () => {
  it('parses a bare JSON object', () => {
    const obj = extractJson('{"a":1,"b":"x"}') as Record<string, unknown>;
    expect(obj.a).toBe(1);
    expect(obj.b).toBe('x');
  });

  it('strips ```json code fences', () => {
    const obj = extractJson('```json\n{"a":2}\n```') as Record<string, unknown>;
    expect(obj.a).toBe(2);
  });

  it('extracts JSON embedded in surrounding prose', () => {
    const obj = extractJson(
      '这是结果：\n{"label":"x","basics":{"name":"R"}} 完成',
    ) as { label: string; basics: { name: string } };
    expect(obj.label).toBe('x');
    expect(obj.basics.name).toBe('R');
  });

  it('throws on invalid JSON', () => {
    expect(() => extractJson('not json at all')).toThrow();
  });
});

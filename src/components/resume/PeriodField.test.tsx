import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PeriodField, {
  parseYM,
  formatYM,
  parsePeriod,
  composePeriod,
} from './PeriodField';

describe('period parse/compose', () => {
  it('parses YYYY.MM / YYYY-MM / YYYY年M月 / YYYY', () => {
    expect(parseYM('2025.07')).toEqual({ year: 2025, month: 7 });
    expect(parseYM('2025-7')).toEqual({ year: 2025, month: 7 });
    expect(parseYM('2025年7月')).toEqual({ year: 2025, month: 7 });
    expect(parseYM('2026')).toEqual({ year: 2026, month: undefined });
    expect(parseYM('待填写')).toBeNull();
    expect(parseYM('2025.13')).toBeNull();
  });

  it('formats with zero-padded month', () => {
    expect(formatYM({ year: 2025, month: 7 })).toBe('2025.07');
    expect(formatYM({ year: 2026 })).toBe('2026');
  });

  it('round-trips existing resume formats', () => {
    for (const s of [
      '2025.07 - 至今',
      '2026.03 - 2026.04',
      '2025 - 2026',
      '2026',
    ]) {
      expect(composePeriod(parsePeriod(s))).toBe(s);
    }
  });

  it('returns empty parts for placeholders', () => {
    const empty = { start: null, end: null, toPresent: false };
    expect(parsePeriod('待填写（起止时间）')).toEqual(empty);
    expect(parsePeriod(undefined)).toEqual(empty);
  });

  it('tolerates numeric period from YAML (period: 2026)', () => {
    expect(parsePeriod(2026)).toEqual({
      start: { year: 2026, month: undefined },
      end: null,
      toPresent: false,
    });
    expect(composePeriod(parsePeriod(2026))).toBe('2026');
  });
});

describe('PeriodField', () => {
  it('edits start month via calendar panel, keeping 至今', () => {
    const onChange = vi.fn();
    render(
      <PeriodField label="时间" value="2025.07 - 至今" onChange={onChange} />,
    );
    expect(screen.getByText('2025.07')).toBeTruthy();
    expect(screen.getByText('至今', { selector: 'span' })).toBeTruthy();

    fireEvent.click(screen.getByText('2025.07'));
    expect(screen.getByText('2025 年')).toBeTruthy();
    fireEvent.click(screen.getByText('3月'));
    expect(onChange).toHaveBeenCalledWith('2025.03 - 至今');
  });

  it('toggles 至今 off', () => {
    const onChange = vi.fn();
    render(
      <PeriodField label="时间" value="2025.07 - 至今" onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith('2025.07');
  });

  it('picks end month when 至今 is off', () => {
    const onChange = vi.fn();
    render(
      <PeriodField
        label="时间"
        value="2025.07 - 2026.01"
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('2026.01'));
    fireEvent.click(screen.getByText('6月'));
    expect(onChange).toHaveBeenCalledWith('2025.07 - 2026.06');
  });

  it('clicking the selected month keeps year only', () => {
    const onChange = vi.fn();
    render(<PeriodField label="时间" value="2025.07" onChange={onChange} />);
    fireEvent.click(screen.getByText('2025.07'));
    fireEvent.click(screen.getByText('7月'));
    expect(onChange).toHaveBeenCalledWith('2025');
  });

  it('navigates years before picking', () => {
    const onChange = vi.fn();
    render(<PeriodField label="时间" value="2025.07" onChange={onChange} />);
    fireEvent.click(screen.getByText('2025.07'));
    fireEvent.click(screen.getByTitle('下一年'));
    fireEvent.click(screen.getByText('2月'));
    expect(onChange).toHaveBeenCalledWith('2026.02');
  });
});

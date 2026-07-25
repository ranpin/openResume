import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TagField from './TagField';

describe('TagField', () => {
  it('renders existing items as tags', () => {
    render(
      <TagField label="技能项" items={['C++', 'Python']} onChange={() => {}} />,
    );
    expect(screen.getByText('C++')).toBeTruthy();
    expect(screen.getByText('Python')).toBeTruthy();
  });

  it('adds a tag on Enter', () => {
    const onChange = vi.fn();
    render(<TagField label="技能项" items={['C++']} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Rust' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['C++', 'Rust']);
  });

  it('splits on comma while typing', () => {
    const onChange = vi.fn();
    render(<TagField label="技能项" items={[]} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Rust,' },
    });
    expect(onChange).toHaveBeenCalledWith(['Rust']);
  });

  it('removes a tag via its × button', () => {
    const onChange = vi.fn();
    render(
      <TagField label="技能项" items={['C++', 'Python']} onChange={onChange} />,
    );
    fireEvent.click(screen.getAllByTitle('移除')[0]);
    expect(onChange).toHaveBeenCalledWith(['Python']);
  });

  it('Backspace on empty input removes last tag', () => {
    const onChange = vi.fn();
    render(
      <TagField label="技能项" items={['C++', 'Python']} onChange={onChange} />,
    );
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Backspace' });
    expect(onChange).toHaveBeenCalledWith(['C++']);
  });

  it('bulk-adds from pasted list and dedupes', () => {
    const onChange = vi.fn();
    render(<TagField label="技能项" items={['C++']} onChange={onChange} />);
    fireEvent.paste(screen.getByRole('textbox'), {
      clipboardData: { getData: () => 'C++, Go; Rust\nTS' },
    });
    expect(onChange).toHaveBeenCalledWith(['C++', 'Go', 'Rust', 'TS']);
  });
});

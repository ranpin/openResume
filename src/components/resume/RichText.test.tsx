import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RichText from './RichText';

describe('RichText', () => {
  it('renders bold, arrow list and ordered list', () => {
    const { container } = render(
      <RichText>{'**粗** \n- 一\n- 二'}</RichText>,
    );
    expect(container.querySelector('strong')).not.toBeNull();
    expect(screen.getAllByRole('listitem').length).toBe(2);
    expect(container.querySelector('ul')).not.toBeNull();
  });

  it('renders ordered list markers', () => {
    const { container } = render(<RichText>{'1. 甲\n2. 乙'}</RichText>);
    expect(container.querySelector('ol')).not.toBeNull();
  });

  it('allows whitelisted font-size span', () => {
    const { container } = render(
      <RichText>{'<span class="rt-lg">大字</span>'}</RichText>,
    );
    expect(container.querySelector('span.rt-lg')).not.toBeNull();
  });

  it('sanitizes script tags (no XSS)', () => {
    const { container } = render(
      <RichText>{'<script>alert(1)</script>安全'}</RichText>,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText(/安全/)).toBeInTheDocument();
  });
});

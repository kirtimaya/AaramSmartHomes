/**
 * FUNCTIONAL TESTS — Phase 1.2: NeoSurface component
 *
 * What's tested:
 *   - Renders children correctly
 *   - Applies the correct CSS variable for each variant (out, out-sm, in)
 *   - Uses default 'out' variant when none is supplied
 *   - Applies custom radius via inline style
 *   - Spreads extra style props onto the container
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NeoSurface } from '../NeoSurface';

describe('NeoSurface', () => {
  it('renders its children', () => {
    render(<NeoSurface>Hello NeoSurface</NeoSurface>);
    expect(screen.getByText('Hello NeoSurface')).toBeInTheDocument();
  });

  it('applies out-shadow CSS variable for variant=out (default)', () => {
    const { container } = render(<NeoSurface>content</NeoSurface>);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.boxShadow).toBe('var(--neo-out-shadow)');
  });

  it('applies out-sm-shadow CSS variable for variant=out-sm', () => {
    const { container } = render(<NeoSurface variant="out-sm">content</NeoSurface>);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.boxShadow).toBe('var(--neo-out-shadow-sm)');
  });

  it('applies in-shadow CSS variable for variant=in', () => {
    const { container } = render(<NeoSurface variant="in">content</NeoSurface>);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.boxShadow).toBe('var(--neo-in-shadow)');
  });

  it('applies custom border radius', () => {
    const { container } = render(<NeoSurface radius={24}>content</NeoSurface>);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.borderRadius).toBe('24px');
  });

  it('merges extra style props', () => {
    const { container } = render(<NeoSurface style={{ padding: '16px' }}>content</NeoSurface>);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.padding).toBe('16px');
  });
});

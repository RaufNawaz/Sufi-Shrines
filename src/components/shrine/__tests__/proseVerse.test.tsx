import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ProseParagraphs } from '../ProseParagraphs';

const same = (t: string) => t;

describe('verse in the prose', () => {
  it('sets a one-line quotation inside English prose as verse, split at ٭', () => {
    const { container } = render(
      <ProseParagraphs
        text={
          'He is remembered for one line.\n\nحیدریم قلندرم مستم ٭ بندۂ مرتضیٰ علی ہستم\n\nThe shrine stands at Sehwan.'
        }
        localize={same}
      />,
    );
    const verse = container.querySelectorAll('blockquote.article-verse');
    expect(verse).toHaveLength(1);
    expect(verse[0]!.querySelectorAll('.article-verse-line')).toHaveLength(2);
  });

  it('leaves a one-line paragraph as prose in an Urdu section', () => {
    const { container } = render(
      <ProseParagraphs
        text={'یہ مزار سہون میں ہے۔\n\nحیدریم قلندرم مستم ٭ بندۂ مرتضیٰ علی ہستم'}
        localize={same}
      />,
    );
    expect(container.querySelectorAll('blockquote')).toHaveLength(0);
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  it('still sets a two-line couplet as verse in either view', () => {
    const { container } = render(
      <ProseParagraphs text={'بُلھیا! کی جاݨاں میں کوݨ\nنہ میں مومن وچ مسیتاں'} localize={same} />,
    );
    expect(container.querySelectorAll('blockquote .article-verse-line')).toHaveLength(2);
  });
});

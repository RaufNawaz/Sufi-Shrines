import { useLang } from '../../lib/i18n/LanguageContext';
import {
  TEXT_SIZES,
  applyTextSize,
  textSizeAt,
  writeTextSize,
  type TextSize,
} from '../../lib/textSizePreference';
import type { UiStringKey } from '../../lib/i18n/uiStrings';

/**
 * The reading size, as one slider rather than a row of named buttons.
 *
 * **Why a slider.** It was three radios — Small, Medium, Large — and a reader
 * asked for a bar they could drag. Rendering three stops as a slider would have
 * been the letter of that and none of the point: the reason to reach for a
 * slider is finer adjustment than named steps give, so the scale went to five
 * (`textSizePreference.ts`). The three original values are still members, so
 * nothing stored needs migrating.
 *
 * **A native `input[type=range]`**, which brings the keyboard (arrows, Home,
 * End), the pointer, and the platform's own touch handling for free — none of
 * which a div with a drag handler gets right. What it does not bring is an
 * accessible *name for the value*: a screen reader announces "3 of 5" unless
 * told otherwise, and "3" is not a reading size. `aria-valuetext` carries the
 * step's own label, in the reader's language.
 *
 * The value is applied on every input event rather than on release, because the
 * whole page is the preview — this is the one control whose effect is the thing
 * the reader is looking at while they drag it.
 */
const STEP_LABEL_KEYS: Record<TextSize, UiStringKey> = {
  xsmall: 'settingsTextSizeXsmall',
  small: 'settingsTextSizeSmall',
  medium: 'settingsTextSizeMedium',
  large: 'settingsTextSizeLarge',
  xlarge: 'settingsTextSizeXlarge',
};

export function ReadingSizeSlider({
  value,
  onChange,
  id,
  labelledBy,
}: {
  value: TextSize;
  onChange: (size: TextSize) => void;
  id?: string;
  labelledBy?: string;
}) {
  const { t } = useLang();
  const index = Math.max(0, TEXT_SIZES.indexOf(value));

  const choose = (next: number) => {
    const size = textSizeAt(next);
    if (size === value) return;
    writeTextSize(size);
    /* Straight to the document rather than waiting for a render: the reader is
       watching the page they are resizing, and a step that lands a frame late
       reads as a control that missed the drag. */
    applyTextSize(size, document.documentElement);
    onChange(size);
  };

  return (
    <div className="reading-size">
      {/* The ends, marked in the type they set, so the bar says what it does
          without a legend.

          From `t()` rather than a literal `A`: in the Urdu view a Latin `A` is
          an English letter in a Nastaliq interface, which the no-leak guard
          counts and would be right to — the Urdu edition sets alif instead.
          `aria-hidden` because the slider already announces its range and its
          current step, and a reader hearing "A … A" either side learns
          nothing. */}
      <span className="reading-size-end reading-size-end--min" aria-hidden="true">
        {t('settingsTextSizeScaleMark')}
      </span>
      <input
        id={id}
        type="range"
        className="reading-size-input"
        min={0}
        max={TEXT_SIZES.length - 1}
        step={1}
        value={index}
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : t('settingsTextSizeLabel')}
        /* The step's name, not its number. Eastern numerals would be wrong here
           for the same reason: it is a label, not a quantity. */
        aria-valuetext={t(STEP_LABEL_KEYS[value])}
        onChange={(event) => choose(Number(event.target.value))}
      />
      <span className="reading-size-end reading-size-end--max" aria-hidden="true">
        {t('settingsTextSizeScaleMark')}
      </span>
      {/* The current step in words, for everyone — the bar alone tells a sighted
          reader roughly where they are and never which step that is. No
          `fmtNum` anywhere near it: this is a name, not a quantity. */}
      <span className="reading-size-value">{t(STEP_LABEL_KEYS[value])}</span>
    </div>
  );
}

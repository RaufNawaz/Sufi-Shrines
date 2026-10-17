/**
 * A recorded value isolated in the text around it, declared English only when
 * it is.
 *
 * A Location or figure cell can come back from the dictionary in Urdu or stay
 * the English the source wrote. Wrapping every one in `lang="en"` made a
 * screen reader read 170 Urdu place names in the map's directory with an
 * English voice (Urdu council, 17 October 2026); not declaring the English
 * ones would hide them from the no-leak guard. The run carries Latin letters
 * or it does not, and that decides.
 */
export function RecordedRun({ text }: { text: string }) {
  return /[A-Za-z]/.test(text) ? (
    <bdi lang="en" data-latin>
      {text}
    </bdi>
  ) : (
    <bdi>{text}</bdi>
  );
}

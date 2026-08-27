/**
 * The measured pixel dimensions of a photograph the archive points at.
 *
 * Read at first paint so an `<img>` can carry `width`/`height` and the browser
 * can reserve the box before the bytes arrive. Without it a hero measures 0px
 * and then its real height about a second later, and everything under it —
 * including the infobox, which is on screen — moves down: `/shrine`'s whole
 * CLS 0.1115.
 *
 * The alternative was one CSS `aspect-ratio` for every image, and the
 * measurement ruled it out: 31 of the archive's 239 measurable photographs are
 * portrait, so any single landscape box crops one image in eight to a band.
 * Details in `pipeline/measure_image_shapes.py` and
 * `scripts/data/build-image-shapes.mjs`.
 *
 * A miss returns null and the caller renders exactly what it rendered before,
 * which is the point of hashing the URL rather than keying on the shrine: a
 * photograph the sheet has changed since the last measurement gets no box
 * instead of the wrong one.
 */
import shapeData from '../../data/image-shapes.json';
import { imageShapeKey } from './imageShapeKey';

/* `number[]`, not `[number, number]`: TypeScript infers the JSON's arrays as
   variable-length, and asserting the tuple would be asserting something the file
   does not prove. The length is checked below instead, where a malformed entry
   becomes a miss — which renders as it did before — rather than a NaN box. */
const SHAPES = shapeData.shapes as Record<string, number[] | undefined>;

export interface ImageShape {
  width: number;
  height: number;
}

export function imageShape(url: string | null | undefined): ImageShape | null {
  if (!url) return null;
  const measured = SHAPES[imageShapeKey(url)];
  if (!measured || measured.length !== 2) return null;
  const [width, height] = measured;
  if (!(width > 0) || !(height > 0)) return null;
  return { width, height };
}

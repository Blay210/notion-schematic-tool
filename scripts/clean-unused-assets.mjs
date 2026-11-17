// These generated assets belonged to retired tools, not the schematic editor.
import {rm} from 'node:fs/promises';
for (const name of ['workers', 'pulse']) {
  await rm(new URL(`../public/${name}/`, import.meta.url), {recursive:true, force:true});
}

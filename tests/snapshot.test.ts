import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProject,encodeSnapshot,decodeSnapshot,parseProject} from '../lib/projects.ts';
test('snapshots round-trip Unicode for all tools',()=>{for(const kind of ['diagram','schematic','verilog'] as const){const p=createProject(kind);p.data.title='회로 · 한글 🐧';assert.deepEqual(decodeSnapshot(encodeSnapshot(p)),parseProject(p));}});
test('invalid and oversized snapshots are rejected',()=>{assert.throws(()=>decodeSnapshot('%%%'));assert.throws(()=>decodeSnapshot('a'.repeat(24001)));assert.throws(()=>parseProject({version:1,id:'x',kind:'unknown'}));});

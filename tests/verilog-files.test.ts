import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyHDL,parseHDL} from '../lib/verilog/project.ts';
import {addProjectFolder,moveProjectFiles,renameProjectFile,rangeSelection} from '../lib/verilog/files.ts';
test('empty nested folders survive project serialization and reject invalid paths',()=>{
 const p=addProjectFolder(emptyHDL(),'rtl','cores');
 assert.ok(parseHDL(JSON.parse(JSON.stringify(p))).folders?.includes('rtl/cores'));
 assert.throws(()=>addProjectFolder(p,'rtl','../escape'));
 assert.throws(()=>addProjectFolder(p,'rtl','cores'));
 assert.throws(()=>parseHDL({...p,folders:['rtl/design.sv']}));
});
test('rename accepts only a filename, preserves directory and source, and rejects collisions',()=>{
 const p=emptyHDL(),result=renameProjectFile(p,'rtl/design.sv','counter.sv');
 assert.equal(result.project.files[0].name,'rtl/counter.sv');assert.equal(result.project.files[0].source,p.files[0].source);
 assert.equal(p.files[0].name,'rtl/design.sv');
 assert.throws(()=>renameProjectFile(p,'rtl/design.sv','tb/other.sv'));
 assert.throws(()=>renameProjectFile(p,'rtl/design.sv','..'));
});
test('multi-file moves are atomic, preserve source and return all path mappings',()=>{
 const p=addProjectFolder(emptyHDL(),'','shared'),before=JSON.stringify(p);
 const result=moveProjectFiles(p,p.files.map(f=>f.name),'shared');
 assert.deepEqual(result.project.files.map(f=>f.name),['shared/design.sv','shared/tb.sv']);
 assert.equal(result.paths.get('tb/tb.sv'),'shared/tb.sv');assert.equal(JSON.stringify(p),before);
 assert.equal(moveProjectFiles(result.project,['shared/design.sv'],'').project.files[0].name,'design.sv');
 const collision={...p,files:[...p.files,{name:'shared/design.sv',source:'do not overwrite'}]};
 assert.throws(()=>moveProjectFiles(collision,['rtl/design.sv','tb/tb.sv'],'shared'));
 assert.equal(collision.files[2].source,'do not overwrite');
 assert.throws(()=>moveProjectFiles(p,['missing.sv'],'rtl'));
 const sameNames={...p,files:[{name:'rtl/same.sv',source:'a'},{name:'tb/same.sv',source:'b'}]};
 assert.throws(()=>moveProjectFiles(sameNames,sameNames.files.map(f=>f.name),'shared'));
});
test('shift selection follows visible order and ctrl-shift preserves existing selection',()=>{
 const order=['rtl/a.sv','rtl/b.sv','tb/a.sv','tb/b.sv'];
 assert.deepEqual(rangeSelection(order,'tb/a.sv','rtl/a.sv',[],false),order.slice(0,3));
 assert.deepEqual(rangeSelection(order,'rtl/a.sv','rtl/b.sv',['tb/b.sv'],true),['tb/b.sv','rtl/a.sv','rtl/b.sv']);
 assert.deepEqual(rangeSelection(order,'hidden.sv','tb/a.sv',[],false),['tb/a.sv']);
});

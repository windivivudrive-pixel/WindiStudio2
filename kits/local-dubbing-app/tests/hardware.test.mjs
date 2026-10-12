import test from 'node:test';
import assert from 'node:assert/strict';
import {hardwarePlan,assertModelCapacity,GB} from '../hardware.mjs';
test('hardware plan and capacity gates cover weak CPUs, RAM, disk and unknown storage',()=>{
 const weak={ramBytes:6*GB,cores:4,freeBytes:20*GB};
 assert.deepEqual(hardwarePlan(weak).config,{mode:'v3nano',whisperModel:'tiny',resolution:720});
 assert.doesNotThrow(()=>assertModelCapacity(weak,'vieneu','v3nano'));
 assert.throws(()=>assertModelCapacity(weak,'vieneu','v3turbo'),/chưa tải model/);
 assert.throws(()=>assertModelCapacity(weak,'whisper','small'),/RAM/);
 const strong={ramBytes:32*GB,cores:16,freeBytes:40*GB};
 assert.deepEqual(hardwarePlan(strong).config,{mode:'v3turbo',whisperModel:'small',resolution:720});
 assert.throws(()=>assertModelCapacity({...strong,freeBytes:GB},'whisper','medium'),/dung lượng/);
 assert.match(hardwarePlan({...weak,freeBytes:null}).warnings.join(' '),/Chưa đo/);
 assert.equal(hardwarePlan({...strong,cores:2}).config.mode,'v3turbo');assert.ok(hardwarePlan({...strong,cores:2}).warnings.length);
 assert.equal(hardwarePlan({...strong,ramBytes:8*GB}).config.mode,'v3turbo');
});

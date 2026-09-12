import {describe,expect,it} from 'vitest';
import {arcadeReducer as reduce,initialArcadeState as initial} from '../windi/arcade-state';
describe('Pocket Studio demo state',()=>{
 it('manual navigation cancels rendering and never implies an approval',()=>{
   let s={...initial,stage:8,acting:true,progress:.8};s=reduce(s,{type:'move',direction:1});
   expect(s.stage).toBe(9);expect(s.progress).toBe(0);expect(s.acting).toBe(false);expect(s.auto).toBe(false);expect(s.approved).toEqual({});
 });
 it('records explicit approval and invalidates it when selection changes',()=>{
   let s=reduce({...initial,stage:3},{type:'act'});expect(s.approved[3]).toBe(true);
   s=reduce(s,{type:'choose',direction:1});expect(s.choices[3]).toBe(1);expect(s.approved[3]).toBeUndefined();
 });
 it('does not record demo approval as user approval',()=>{
   let s={...initial,stage:2};for(let i=0;i<60;i++)s=reduce(s,{type:'tick',dt:100});
   expect(s.stage).toBe(3);expect(s.approved).toEqual({});expect(s.progress).toBe(0);
 });
 it('render takes four active seconds and resets cleanly',()=>{
   let s=reduce({...initial,stage:8},{type:'act'});for(let i=0;i<20;i++)s=reduce(s,{type:'tick',dt:100});
   expect(s.progress).toBeCloseTo(.5);for(let i=0;i<20;i++)s=reduce(s,{type:'tick',dt:100});expect(s.stage).toBe(9);expect(s.acting).toBe(true);
   s=reduce(s,{type:'reset'});expect(s.progress).toBe(0);expect(s.acting).toBe(false);
 });
 it('wraps navigation and preserves choices across scene transitions',()=>{
   let s=reduce(initial,{type:'move',direction:-1});expect(s.stage).toBe(9);
   s=reduce({...s,stage:3},{type:'select',index:2});s=reduce(s,{type:'move',direction:1});expect(s.choices[3]).toBe(2);
   s=reduce(s,{type:'replay'});expect(s.choices).toEqual({});expect(s.auto).toBe(true);expect(s.stage).toBe(0);
 });
});

it('pause freezes an in-flight render and resume preserves its progress',()=>{
 let s=reduce({...initial,stage:8,elapsed:2400,progress:.3,acting:true},{type:'toggle'});
 expect(s.paused).toBe(true);s=reduce(s,{type:'tick',dt:100});expect(s.progress).toBe(.3);
 s=reduce(s,{type:'toggle'});s=reduce(s,{type:'tick',dt:100});expect(s.progress).toBeGreaterThan(.3);
});
it('reduced motion actions complete without an animation timer',()=>{
 const s=reduce({...initial,stage:8},{type:'act',instant:true});expect(s.stage).toBe(9);expect(s.progress).toBe(1);expect(s.acting).toBe(false);expect(s.auto).toBe(false);
});

it('demo modules do not call production or billable APIs',async()=>{
 const {readFileSync}=await import('node:fs');
 for(const name of ['arcade-state.ts','workflow-arcade.tsx','arcade-canvas.tsx']){
   const source=readFileSync(new URL('../windi/'+name,import.meta.url),'utf8');
   expect(source).not.toMatch(/fetch\s*\(|\/api\/|supabase|voice\/generate/);
 }
});

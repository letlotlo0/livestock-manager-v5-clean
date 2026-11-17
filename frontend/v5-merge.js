/* Pure, tested three-way merge. Shared by browser and Node test harness. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.LMV5Merge=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const ABSENT=Symbol('absent'),SIG='__lm_v5_photo_digest__';
 function fingerprint(s){
  let a=2166136261,b=2246822519;
  for(let i=0;i<s.length;i++){let c=s.charCodeAt(i);a=Math.imul(a^c,16777619)>>>0;b=Math.imul((b+c+(b<<6)+(b>>>2))>>>0,3266489917)>>>0;}
  return s.length+':'+a.toString(16)+':'+b.toString(16);
 }
 function snap(value){
  if(typeof value==='string'&&value.length>2048)return {[SIG]:fingerprint(value)};
  if(Array.isArray(value))return value.map(snap);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,snap(v)]));
  return value;
 }
 function isSig(x){return x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===1&&typeof x[SIG]==='string';}
 function eq(a,b){
  if(a===b)return true;
  if(a===ABSENT||b===ABSENT)return false;
  if(isSig(a))return isSig(b)?a[SIG]===b[SIG]:typeof b==='string'&&a[SIG]===fingerprint(b);
  if(isSig(b))return typeof a==='string'&&b[SIG]===fingerprint(a);
  if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return false;
  if(Array.isArray(a)!==Array.isArray(b))return false;
  if(Array.isArray(a))return a.length===b.length&&a.every((v,i)=>eq(v,b[i]));
  let ka=Object.keys(a),kb=Object.keys(b);return ka.length===kb.length&&ka.every(k=>Object.prototype.hasOwnProperty.call(b,k)&&eq(a[k],b[k]));
 }
 function index(list){
  if(!Array.isArray(list))return null;
  const m=new Map();for(const x of list){if(!x||typeof x!=='object'||Array.isArray(x)||!(typeof x.id==='string'||typeof x.id==='number')||!String(x.id)||m.has(String(x.id)))return null;m.set(String(x.id),x);}return m;
 }
 function merge(base,local,remote,path='value'){
  if(eq(local,remote))return {ok:true,value:local};
  if(eq(base,local))return {ok:true,value:remote};
  if(eq(base,remote))return {ok:true,value:local};
  if(base!==ABSENT&&local!==ABSENT&&remote!==ABSENT&&Array.isArray(base)&&Array.isArray(local)&&Array.isArray(remote)){
   const bm=index(base),lm=index(local),rm=index(remote);
   if(bm&&lm&&rm){const output=[];for(const id of new Set([...rm.keys(),...lm.keys(),...bm.keys()])){
    const r=merge(bm.has(id)?bm.get(id):ABSENT,lm.has(id)?lm.get(id):ABSENT,rm.has(id)?rm.get(id):ABSENT,path+'['+id+']');
    if(!r.ok)return r;if(r.value!==ABSENT)output.push(r.value);
   }return {ok:true,value:output};}
   if(base.length<=local.length&&base.length<=remote.length&&base.every((v,i)=>eq(v,local[i])&&eq(v,remote[i]))){
    const out=remote.slice();for(const x of local.slice(base.length))if(!out.some(y=>eq(x,y)))out.push(x);return {ok:true,value:out};
   }
  }
  if(base!==ABSENT&&local!==ABSENT&&remote!==ABSENT&&base&&local&&remote&&
   typeof base==='object'&&typeof local==='object'&&typeof remote==='object'&&
   !Array.isArray(base)&&!Array.isArray(local)&&!Array.isArray(remote)&&!isSig(base)&&!isSig(local)&&!isSig(remote)){
    const out=Object.create(null);for(const k of new Set([...Object.keys(remote),...Object.keys(local),...Object.keys(base)])){
     const get=o=>Object.prototype.hasOwnProperty.call(o,k)?o[k]:ABSENT;
     const r=merge(get(base),get(local),get(remote),path+'.'+k);if(!r.ok)return r;if(r.value!==ABSENT)out[k]=r.value;
    }return {ok:true,value:out};
  }
  return {ok:false,path,reason:'Both devices changed the same value'};
 }
 return {ABSENT,SIG,fingerprint,snap,eq,merge,index};
});

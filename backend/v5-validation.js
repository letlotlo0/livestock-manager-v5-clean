'use strict';
const MAX_ANIMAL_BYTES=128*1024;
const MAX_PHOTO_BYTES=2*1024*1024;
const idRe=/^[A-Za-z0-9_-]{1,80}$/;
const blocked=new Set(['__proto__','constructor','prototype','id','farmerId','photo','photoVersion','version']);
function plain(o){return o!==null&&typeof o==='object'&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype;}
function idOk(id){return typeof id==='string'&&idRe.test(id);}
function validFields(obj){
 if(!plain(obj))return false;
 if(Object.keys(obj).some(k=>blocked.has(k)||k.length>80))return false;
 try{return Buffer.byteLength(JSON.stringify(obj),'utf8')<=MAX_ANIMAL_BYTES;}catch(_){return false;}
}
function validRemoved(v){return Array.isArray(v)&&v.length<=100&&v.every(k=>typeof k==='string'&&k.length<=80&&!blocked.has(k));}
function validPhoto(p){
 if(p==='')return true;
 if(typeof p!=='string'||p.length>MAX_PHOTO_BYTES*1.38+100)return false;
 const m=p.match(/^data:image\/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/);
 if(!m)return false;
 const b64=m[2],bytes=Buffer.byteLength(b64,'base64');
 return bytes>0&&bytes<=MAX_PHOTO_BYTES&&b64.length%4===0;
}
module.exports={MAX_ANIMAL_BYTES,MAX_PHOTO_BYTES,idOk,validFields,validRemoved,validPhoto};

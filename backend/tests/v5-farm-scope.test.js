'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {installV5Routes}=require('../v5-routes');
const handlers={};const app={get:(p,...fn)=>handlers['GET '+p]=fn.at(-1),post:(p,...fn)=>handlers['POST '+p]=fn.at(-1),patch:(p,...fn)=>handlers['PATCH '+p]=fn.at(-1),delete:(p,...fn)=>handlers['DELETE '+p]=fn.at(-1),put:(p,...fn)=>handlers['PUT '+p]=fn.at(-1)};
const queries=[];const pool={query:async(sql,params)=>{queries.push({sql,params});return {rowCount:0,rows:[]};}};
const requireAuth=()=>{},asyncRoute=f=>f,fail=(res,s,e)=>res.status(s).json({error:e}),limit=()=>{};
installV5Routes(app,{pool,requireAuth,asyncRoute,fail,limit});
function response(){return {status(s){this.statusCode=s;return this;},json(x){this.body=x;return this;}};}
const owner='11111111-1111-4111-8111-111111111111',farm='22222222-2222-4222-8222-222222222222';
test('state request filters animals by authenticated owner AND selected farm',async()=>{
 queries.length=0;const res=response();await handlers['GET /api/v5/state']({authUser:{id:owner},farmId:farm},res);
 assert.equal(res.body.apiVersion,5);assert.match(queries[0].sql,/a\.farm_id=\$2/);assert.deepEqual(queries[0].params,[owner,farm]);
});
test('new animal INSERT binds authorized farm, never accepts owner from input',async()=>{
 queries.length=0;const res=response();await handlers['POST /api/v5/animals']({authUser:{id:owner},farmId:farm,body:{id:'a-1',data:{name:'Cow'}}},res);
 assert.match(queries[0].sql,/farm_id\)/);assert.equal(queries[0].params[0],owner);assert.equal(queries[0].params[3],farm);
});
test('existing animal photo UPDATE requires ownership in selected farm',async()=>{
 queries.length=0;const res=response();await handlers['PUT /api/v5/animals/:id/photo']({authUser:{id:owner},farmId:farm,params:{id:'cow-1'},body:{expectedVersion:1,photo:''}},res);
 assert.match(queries[0].sql,/EXISTS \(SELECT 1 FROM lm_v5_animals/);assert.equal(queries[0].params[4],farm);
});

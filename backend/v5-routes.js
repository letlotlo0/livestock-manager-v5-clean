'use strict';
const {idOk,validFields,validRemoved,validPhoto}=require('./v5-validation');
// Required auth middleware is passed from app.js. All IDs are scoped to req.authUser.id.
function installV5Routes(app,{pool,requireAuth,asyncRoute,fail,limit}) {
 app.get('/api/v5/state',requireAuth,asyncRoute(async(req,res)=>{
  const id=req.authUser.id;
  const [a,d]=await Promise.all([
   pool.query(`SELECT a.animal_id AS id,a.data,a.version,a.updated_at,
      COALESCE(p.photo,'') AS photo,COALESCE(p.version,0) AS photo_version
      FROM lm_v5_animals a LEFT JOIN lm_v5_animal_photos p
      ON p.user_id=a.user_id AND p.animal_id=a.animal_id
      WHERE a.user_id=$1 ORDER BY a.created_at,a.animal_id`,[id]),
   pool.query(`SELECT record_key,data,version,updated_at FROM lm_farm_records
      WHERE user_id=$1 AND record_key<>'livestockAnimals' ORDER BY record_key`,[id])
  ]);
  res.json({apiVersion:5,animals:a.rows.map(x=>({id:x.id,data:x.data,version:Number(x.version),
    photo:x.photo,photoVersion:Number(x.photo_version),updatedAt:x.updated_at})),
    records:d.rows.map(x=>({key:x.record_key,data:x.data,version:Number(x.version),updatedAt:x.updated_at}))});
 }));
 app.post('/api/v5/animals',requireAuth,limit(180),asyncRoute(async(req,res)=>{
  const id=req.body?.id,data=req.body?.data;
  if(!idOk(id)||!validFields(data))return fail(res,400,'Invalid animal identifier or details.');
  const q=await pool.query(`INSERT INTO lm_v5_animals(user_id,animal_id,data,version)
   VALUES($1,$2,$3::jsonb,1) ON CONFLICT (user_id,animal_id) DO NOTHING RETURNING version`,
    [req.authUser.id,id,JSON.stringify(data)]);
  if(!q.rowCount)return res.status(409).json({code:'ANIMAL_CONFLICT',error:'Another device already created this animal.'});
  res.status(201).json({id,version:Number(q.rows[0].version)});
 }));
 app.patch('/api/v5/animals/:id',requireAuth,limit(240),asyncRoute(async(req,res)=>{
  const id=req.params.id,expected=req.body?.expectedVersion,changes=req.body?.changes,removed=req.body?.removed||[];
  if(!idOk(id)||!Number.isSafeInteger(expected)||expected<1||!validFields(changes)||!validRemoved(removed))
   return fail(res,400,'Invalid animal update.');
  const q=await pool.query(`UPDATE lm_v5_animals
    SET data=(data - $5::text[]) || $3::jsonb,version=version+1,updated_at=now()
    WHERE user_id=$1 AND animal_id=$2 AND version=$4 RETURNING version`,
    [req.authUser.id,id,JSON.stringify(changes),expected,removed]);
  if(!q.rowCount)return res.status(409).json({code:'ANIMAL_CONFLICT',error:'This animal was updated on another device. Reload and merge safely.'});
  res.json({id,version:Number(q.rows[0].version)});
 }));
 app.delete('/api/v5/animals/:id',requireAuth,limit(120),asyncRoute(async(req,res)=>{
  const id=req.params.id,expected=req.body?.expectedVersion;
  if(!idOk(id)||!Number.isSafeInteger(expected)||expected<1)return fail(res,400,'Invalid animal deletion request.');
  const q=await pool.query(`DELETE FROM lm_v5_animals WHERE user_id=$1 AND animal_id=$2
    AND version=$3 RETURNING animal_id`,[req.authUser.id,id,expected]);
  if(!q.rowCount)return res.status(409).json({code:'ANIMAL_CONFLICT',error:'The animal changed or was removed on another device.'});
  res.json({id,deleted:true});
 }));
 app.put('/api/v5/animals/:id/photo',requireAuth,limit(120),asyncRoute(async(req,res)=>{
  const id=req.params.id,expected=req.body?.expectedVersion,photo=req.body?.photo;
  if(!idOk(id)||!Number.isSafeInteger(expected)||expected<0||!validPhoto(photo))
   return fail(res,400,'Invalid photo; choose JPEG, PNG, WebP or GIF under 2 MB.');
  // The photo belongs to an existing animal. This foreign key makes the operation
  // safe if another device deletes the animal during the upload.
  let q;
  if(expected===0){
   q=await pool.query(`INSERT INTO lm_v5_animal_photos(user_id,animal_id,photo,version)
     SELECT user_id,animal_id,$3,1 FROM lm_v5_animals WHERE user_id=$1 AND animal_id=$2
     ON CONFLICT (user_id,animal_id) DO NOTHING RETURNING version`,[req.authUser.id,id,photo]);
  }else{
   q=await pool.query(`UPDATE lm_v5_animal_photos SET photo=$3,version=version+1,updated_at=now()
    WHERE user_id=$1 AND animal_id=$2 AND version=$4 RETURNING version`,[req.authUser.id,id,photo,expected]);
  }
  if(!q.rowCount)return res.status(409).json({code:'PHOTO_CONFLICT',error:'The animal photo changed on another device.'});
  res.json({id,photoVersion:Number(q.rows[0].version)});
 }));
}
module.exports={installV5Routes};

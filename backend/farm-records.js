'use strict';

// Existing browser-storage document names. Account identity and auth data never belong here.
const DOCUMENT_TYPES = Object.freeze({
  livestockAnimals:'array', livestockProfiles:'array', farmerProfile:'object',
  growthRecords:'array', healthRecords:'array', animalHealthStatuses:'object',
  livestockHealthRecords:'array', livestockVaccinations:'array', soldLivestock:'array',
  farmFeedPurchases:'array', livestockGrowth:'array', weaningRecords:'array',
  farmExpenses:'array', farmOperations:'array'
});
const MAX_DOCUMENT_BYTES = 6 * 1024 * 1024;
function validDocument(key,data) {
  if(!Object.prototype.hasOwnProperty.call(DOCUMENT_TYPES,key))return false;
  const type=DOCUMENT_TYPES[key];
  if(data===null)return true; // delete a document
  if(type==='array' && !Array.isArray(data))return false;
  if(type==='object' && (typeof data!=='object' || Array.isArray(data) || data===null))return false;
  try { return Buffer.byteLength(JSON.stringify(data),'utf8') <= MAX_DOCUMENT_BYTES; }
  catch (_) { return false; }
}
module.exports={DOCUMENT_TYPES,MAX_DOCUMENT_BYTES,validDocument};

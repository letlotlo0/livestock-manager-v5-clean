'use strict';
/* Livestock Manager V5.3 — authoritative server-side plan rules.
 * The browser may display feature labels; only these entitlements determine access.
 * Never delete user data on downgrade. Existing secondary farm records remain readable.
 */
const RIGHTS = Object.freeze({
 free: Object.freeze({
   animalLimit: 25, farmLimit: 1,
   features: Object.freeze({basicHealth:true,rawDataExport:true,financialPdf:false,portfolioPdf:false,multiFarm:false,advancedPedigree:false,advancedStudAnalytics:false,advancedHerdAnalytics:false})
 }),
 pro: Object.freeze({
   animalLimit: 100, farmLimit: 1,
   features: Object.freeze({basicHealth:true,rawDataExport:true,financialPdf:true,portfolioPdf:false,multiFarm:false,advancedPedigree:false,advancedStudAnalytics:false,advancedHerdAnalytics:false})
 }),
 proplus: Object.freeze({
   animalLimit: null, farmLimit: 3,
   features: Object.freeze({basicHealth:true,rawDataExport:true,financialPdf:true,portfolioPdf:true,multiFarm:true,advancedPedigree:true,advancedStudAnalytics:true,advancedHerdAnalytics:true})
 })
});
const PAGE_FEATURES = Object.freeze({
 'digital-pedigree':'advancedPedigree',
 'stud-management':'advancedStudAnalytics',
 'stud':'advancedStudAnalytics',
 'herd-intelligence':'advancedHerdAnalytics'
});
const HEALTH_DOCS = new Set(['healthRecords','animalHealthStatuses','livestockHealthRecords','livestockVaccinations']);
function features(plan){return RIGHTS[plan]?.features||RIGHTS.free.features;}
function entitled(e,key){return Boolean(e?.features?.[key]);}
function mayWriteFarm(e,farmId){return farmId==='main'||entitled(e,'multiFarm');}
function mayWriteDocument(e,farmId,key){return mayWriteFarm(e,farmId)||HEALTH_DOCS.has(key);}
module.exports={RIGHTS,PAGE_FEATURES,HEALTH_DOCS,features,entitled,mayWriteFarm,mayWriteDocument};

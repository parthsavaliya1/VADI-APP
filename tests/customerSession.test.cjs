/* global __dirname */
const {test,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const axios=require('axios');
const values=new Map();
const storage={async getItem(key){return values.get(key)||null;},async setItem(key,value){values.set(key,value);},async removeItem(key){values.delete(key);}};
function load(file,imports,dev=true){const module={exports:{}};const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(compiled,{module,exports:module.exports,require:name=>imports[name]||require(name),__DEV__:dev,console,Set},{filename:file});return module.exports;}
const session=load('utils/customerSession.ts',{'@react-native-async-storage/async-storage':storage});
const {API}=load('utils/api.ts',{'./customerSession':session});
function rejectStatus(status){API.defaults.adapter=async config=>{const response={status,data:{},headers:{},config};throw new axios.AxiosError('Request rejected','ERR_BAD_REQUEST',config,null,response);};}
beforeEach(async()=>{await session.setCustomerToken(null);values.clear();});
test('customer session persists and restores',async()=>{await session.setCustomerToken('customer');assert.equal(await session.loadCustomerToken(),'customer');});
test('expired customer session clears saved login and notifies the provider',async()=>{await session.setCustomerToken('customer');let expired=false;const unsubscribe=session.subscribeCustomerSession(value=>{if(!value)expired=true;});rejectStatus(401);await assert.rejects(API.get('/cart'));assert.equal(session.getCustomerToken(),null);assert.equal(values.size,0);assert.equal(expired,true);unsubscribe();});
test('driver authentication failures do not log out a customer',async()=>{await session.setCustomerToken('customer');rejectStatus(401);await assert.rejects(API.get('/api/driver/deliveries',{headers:{Authorization:'Bearer driver'}}));assert.equal(session.getCustomerToken(),'customer');});
test('wrong review credentials do not clear an existing customer session',async()=>{await session.setCustomerToken('customer');rejectStatus(401);await assert.rejects(API.post('/api/auth/review-login',{}));assert.equal(session.getCustomerToken(),'customer');});
test('temporary backend errors preserve the saved customer session',async()=>{await session.setCustomerToken('customer');rejectStatus(503);await assert.rejects(API.get('/cart'));assert.equal(session.getCustomerToken(),'customer');});
test('an older failed request cannot invalidate a newer login',async()=>{await session.setCustomerToken('old');let fail,ready;const started=new Promise(resolve=>{ready=resolve;});API.defaults.adapter=config=>new Promise((resolve,reject)=>{fail=()=>reject(new axios.AxiosError('Expired','ERR_BAD_REQUEST',config,null,{status:401,config}));ready();});const pending=API.get('/cart');await started;await session.setCustomerToken('new');fail();await assert.rejects(pending);assert.equal(session.getCustomerToken(),'new');});

test('release build ignores a local HTTP override and uses the production remote URL',()=>{
  const release=load('utils/api.ts',{'./customerSession':session},false);
  assert.equal(release.resolveStartupApiUrl('http://192.168.1.2:5000','https://production.example.test'),'https://production.example.test');
  assert.equal(release.resolveStartupApiUrl('https://configured.example.test','https://production.example.test'),'https://configured.example.test');
});
test('development still supports the local HTTP backend',()=>{
  const dev=load('utils/api.ts',{'./customerSession':session});
  assert.equal(dev.resolveStartupApiUrl('http://192.168.1.2:5000','https://production.example.test'),'http://192.168.1.2:5000');
});

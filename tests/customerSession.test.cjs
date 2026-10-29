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
function load(file,imports,dev=true){const module={exports:{}};const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(compiled,{module,exports:module.exports,require:name=>imports[name]||require(name),__DEV__:dev,process:{env:{}},URL,console,Set},{filename:file});return module.exports;}
const firebase={getApiUrl:()=> 'https://api.product.vadindia.com',normalizeApiUrl:value=>{try{const url=new URL(value);return url.protocol==='https:'?url.toString().replace(/\/+$/,''):null;}catch{return null;}}};
const session=load('utils/customerSession.ts',{'@react-native-async-storage/async-storage':storage});
const {API}=load('utils/api.ts',{'./customerSession':session,'../firebase':firebase});
function rejectStatus(status){API.defaults.adapter=async config=>{const response={status,data:{},headers:{},config};throw new axios.AxiosError('Request rejected','ERR_BAD_REQUEST',config,null,response);};}
beforeEach(async()=>{await session.setCustomerToken(null);values.clear();});
test('customer session persists and restores',async()=>{await session.setCustomerToken('customer');assert.equal(await session.loadCustomerToken(),'customer');});
test('expired customer session clears saved login and notifies the provider',async()=>{await session.setCustomerToken('customer');let expired=false;const unsubscribe=session.subscribeCustomerSession(value=>{if(!value)expired=true;});rejectStatus(401);await assert.rejects(API.get('/cart'));assert.equal(session.getCustomerToken(),null);assert.equal(values.size,0);assert.equal(expired,true);unsubscribe();});
test('driver authentication failures do not log out a customer',async()=>{await session.setCustomerToken('customer');rejectStatus(401);await assert.rejects(API.get('/api/driver/deliveries',{headers:{Authorization:'Bearer driver'}}));assert.equal(session.getCustomerToken(),'customer');});
test('wrong review credentials do not clear an existing customer session',async()=>{await session.setCustomerToken('customer');rejectStatus(401);await assert.rejects(API.post('/api/auth/review-login',{}));assert.equal(session.getCustomerToken(),'customer');});
test('temporary backend errors preserve the saved customer session',async()=>{await session.setCustomerToken('customer');rejectStatus(503);await assert.rejects(API.get('/cart'));assert.equal(session.getCustomerToken(),'customer');});
test('an older failed request cannot invalidate a newer login',async()=>{await session.setCustomerToken('old');let fail,ready;const started=new Promise(resolve=>{ready=resolve;});API.defaults.adapter=config=>new Promise((resolve,reject)=>{fail=()=>reject(new axios.AxiosError('Expired','ERR_BAD_REQUEST',config,null,{status:401,config}));ready();});const pending=API.get('/cart');await started;await session.setCustomerToken('new');fail();await assert.rejects(pending);assert.equal(session.getCustomerToken(),'new');});

test('API starts with the Firebase URL in development and release',()=>{
  for (const dev of [true,false]) {
    const client=load('utils/api.ts',{'./customerSession':session,'../firebase':firebase},dev);
    assert.equal(client.getApiBaseURL(),firebase.getApiUrl());
    client.setBaseUrl('http://192.168.1.2:5000');
    assert.equal(client.getApiBaseURL(),dev ? 'http://192.168.1.2:5000' : firebase.getApiUrl());
    client.setBaseUrl('https://remote.example.test/');
    assert.equal(client.getApiBaseURL(),'https://remote.example.test');
  }
});

test('local testing requires explicit opt-in and is ignored in release builds',()=>{
  const remote='https://api.product.vadindia.com';
  for (const dev of [true,false]) {
    const client=load('utils/api.ts',{'./customerSession':session,'../firebase':firebase},dev);
    assert.equal(client.resolveStartupApiUrl(remote,'http://192.168.1.2:5000','true'),dev ? 'http://192.168.1.2:5000' : remote);
    assert.equal(client.resolveStartupApiUrl(remote,'https://staging.example.test','true'),dev ? 'https://staging.example.test' : remote);
    assert.equal(client.resolveStartupApiUrl(remote,'http://192.168.1.2:5000','false'),remote);
    assert.equal(client.resolveStartupApiUrl(remote,'http://192.168.1.2:5000'),remote);
    assert.equal(client.resolveStartupApiUrl(remote,'invalid','true'),remote);
    assert.equal(client.resolveStartupApiUrl(remote,'http:192.168.1.2:5000','true'),remote);
  }
});

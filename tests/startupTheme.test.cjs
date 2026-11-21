/* global __dirname */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function harness({cached='winter',remote='summer',storageError=false,offline=false,stalledStorage=false}={}) {
  const timers=new Set();
  let reads=0;
  const writes=[];
  const modules=new Map();
  const clock={
    setTimeout(fn,ms){const token={fn,ms};timers.add(token);return token;},
    clearTimeout(token){timers.delete(token);},
  };
  const storage={
    async getItem(){reads++;if(storageError)throw new Error('storage unavailable');if(stalledStorage)return new Promise(()=>{});return cached;},
    async setItem(key,value){writes.push([key,value]);},
  };
  function compile(relative,requireFn){
    const filename=path.join(__dirname,'..',relative);
    const source=fs.readFileSync(filename,'utf8');
    const exports={};
    const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    vm.runInNewContext(code,{exports,module:{exports},require:requireFn,console:{log(){},warn(){}},process:{env:{}},...clock},{filename});
    return exports;
  }
  function load(relative){
    if(modules.has(relative))return modules.get(relative);
    const result=compile(relative,request=>{
      if(request==='react-native')return{Platform:{select:values=>values.default}};
      if(request==='@/constants/theme')return load('constants/theme.ts');
      if(request==='@react-native-async-storage/async-storage')return{__esModule:true,default:storage};
      if(request==='@/utils/api')return{API:{get:async()=>{
        if(offline)throw new Error('offline');
        return{data:{data:{theme:remote}}};
      }}};
      throw new Error(request);
    });
    modules.set(relative,result);
    return result;
  }
  const theme=load('constants/theme.ts');
  const startup=load('utils/appTheme.ts');
  return {theme,startup,compile,clock,writes,get reads(){return reads;},flush(ms){for(const timer of Array.from(timers))if(timer.ms===ms){timers.delete(timer);timer.fn();}}};
}

test('saved admin palette is restored before network refresh and survives offline startup',async()=>{
  const h=harness({cached:'winter',offline:true});
  await h.startup.loadCachedAppTheme();
  assert.equal(h.theme.C.page,h.theme.THEMES.winter.page);
  await h.startup.loadAppTheme({restoreCached:false});
  assert.equal(h.theme.getThemeKey(),'winter');
  assert.equal(h.reads,1,'No second cache read during refresh');
});

test('new admin palette notifies the loader and is saved for the next launch',async()=>{
  const h=harness({cached:'winter',remote:'summer'});
  await h.startup.loadCachedAppTheme();
  const backgrounds=[];
  const unsubscribe=h.theme.subscribeTheme(()=>backgrounds.push(h.theme.C.page));
  await h.startup.loadAppTheme({restoreCached:false});
  assert.deepEqual(backgrounds,[h.theme.THEMES.summer.page]);
  assert.deepEqual(h.writes,[['vadi-theme','summer']]);
  unsubscribe();
  h.theme.setTheme('terracotta');
  assert.equal(backgrounds.length,1);
});

test('invalid or unavailable saved themes use the default without blocking startup',async()=>{
  for(const options of [{cached:'invalid'},{cached:null},{storageError:true}]){
    const h=harness(options);
    await h.startup.loadCachedAppTheme();
    assert.equal(h.theme.getThemeKey(),h.theme.DEFAULT_THEME);
  }
});

test('a stalled theme-cache read times out so the app can show its loader',async()=>{
  const h=harness({stalledStorage:true});
  const restoring=h.startup.loadCachedAppTheme();
  h.flush(1500);
  await restoring;
  assert.equal(h.theme.getThemeKey(),h.theme.DEFAULT_THEME);
  await h.startup.loadAppTheme({restoreCached:false});
  assert.equal(h.theme.getThemeKey(),'summer');
});

test('startup shows the saved-theme loader while Remote Config is still pending',async()=>{
  const h=harness({cached:'winter'});
  const states=[];
  let stateIndex=0;
  let effect;
  let subscribed=false;
  let output;
  let root;
  let splashHidden=0;
  let networkStarted=false;
  const render=()=>{stateIndex=0;output=root();};
  const react={
    useState(initial){const i=stateIndex++;if(!(i in states))states[i]=initial;return[states[i],value=>{states[i]=value;render();}];},
    useEffect(callback){effect??=callback;},
    useSyncExternalStore(subscribe){if(!subscribed){subscribed=true;subscribe(render);}},
  };
  const noop=()=>null;
  const module=h.compile('app/_layout.tsx',request=>{
    if(request==='@/constants/theme')return h.theme;
    if(request==='@/utils/appTheme')return h.startup;
    if(request==='react')return react;
    if(request==='react/jsx-runtime')return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
    if(request==='react-native')return{View:'View',Text:'Text'};
    if(request==='@/firebase')return{loadRemoteConfig:()=>{networkStarted=true;assert.equal(h.theme.getThemeKey(),'winter');return new Promise(()=>{});}};
    if(request==='expo-splash-screen')return{preventAutoHideAsync:async()=>{},hide:()=>splashHidden++};
    if(request==='expo-router')return{Stack:noop,router:{}};
    if(request==='expo-status-bar')return{StatusBar:noop};
    if(request==='@/components/AnimatedLoader')return{AnimatedLoader:'Loader'};
    return new Proxy({default:noop},{get:()=>noop});
  });
  root=module.default;
  render();
  assert.equal(output,null,'Native splash remains during local cache restoration');
  effect();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(networkStarted,true);
  assert.equal(output.props.style.backgroundColor,h.theme.THEMES.winter.page);
  assert.equal(output.props.children.type,'Loader');
  output.props.onLayout();
  assert.equal(splashHidden,1,'Themed loader releases the native splash before network setup completes');
});

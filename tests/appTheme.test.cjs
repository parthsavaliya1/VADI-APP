/* global __dirname */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const app = path.resolve(__dirname, '..');
const cache = new Map();
const rn = {
  StyleSheet: {create: value => value, hairlineWidth: 1},
  Platform: {select: value => value.default},
  Dimensions: {get: () => ({width:390,height:844})},
};
function load(relative) {
  if (cache.has(relative)) return cache.get(relative);
  const filename = path.join(app, relative);
  const source = fs.readFileSync(filename,'utf8');
  const exports = {};
  cache.set(relative,exports);
  const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(compiled, {exports,module:{exports},require:request => {
    if(request==='react-native')return rn;
    if(request==='@/constants/theme')return load('constants/theme.ts');
    if(request==='@/constants/homeDesign')return load('constants/homeDesign.ts');
    if(request.endsWith('.png'))return 1;
    if(request==='@expo/vector-icons')return {Ionicons:()=>null};
    if(request==='react/jsx-runtime')return {jsx:()=>null,jsxs:()=>null};
    throw new Error('Unexpected dependency: '+request);
  }},{filename});
  return exports;
}
const theme = load('constants/theme.ts');
const home = load('constants/homeDesign.ts');
const auth = load('constants/authScreenTheme.ts');
const cards = load('components/ProductCardVisuals.tsx').productCardStyles;

function screenStyles(relative) {
  const source=fs.readFileSync(path.join(app,relative),'utf8');
  const file=ts.createSourceFile(relative,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let expression;
  for(const stmt of file.statements){
    if(ts.isVariableStatement(stmt)) for(const decl of stmt.declarationList.declarations){
      if(['styles','s'].includes(decl.name.getText(file))&&decl.initializer)expression=decl.initializer.getText(file);
    }
  }
  assert.ok(expression,relative);
  return vm.runInNewContext(expression, {
    StyleSheet:rn.StyleSheet,Platform:rn.Platform,C:theme.C,GalleryColors:theme.C,
    Fonts:theme.Fonts,themed:theme.themed,cardStyles:cards,
    screenWidth:390,SCREEN_WIDTH:390,
  },{filename:relative});
}

test('every main screen, authentication screen and shared card follows all nine admin palettes',()=>{
  const routes=[
    ['app/(tabs)/index.tsx','safe'],['app/(tabs)/categories.tsx','safe'],
    ['app/(tabs)/profile.tsx','safe'],['app/(tabs)/orders.tsx','safe'],
    ['app/all-products.tsx','safe'],['app/category.tsx','safe'],
    ['app/search.tsx','screen'],['app/cart.tsx','safe'],
    ['app/product-detail.tsx','safe'],['app/wishlist.tsx','screen'],
    ['app/(auth)/login.tsx','safe'],['app/(auth)/signup.tsx','safe'],
    ['app/(auth)/verify-otp.tsx','safe'],['app/(auth)/login-otp.tsx','safe'],
  ].map(([route,key])=>({route,key,styles:screenStyles(route)}));
  for(const key of theme.THEME_KEYS){
    theme.setTheme(key);
    assert.equal(home.HomeColors,theme.C,'No separate home palette');
    for(const screen of routes)assert.equal(screen.styles[screen.key].backgroundColor,theme.C.page,`${key}/${screen.route}`);
    assert.equal(cards.prodCard.backgroundColor,theme.C.card,key);
    assert.equal(cards.imageArch.backgroundColor,theme.C.soft,key);
    assert.equal(cards.addBtn.backgroundColor,theme.C.primary,key);
    assert.equal(cards.prodName.color,theme.C.ink,key);
    assert.deepEqual(Array.from(auth.getAuthBackgroundColors()),[theme.C.page,theme.C.page,theme.C.page]);
  }
  theme.setTheme(theme.DEFAULT_THEME);
});

function luminance(hex){
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
  return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
}
function contrast(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
test('body text, offer labels and primary buttons remain readable in every admin theme',()=>{
  for(const [key,palette]of Object.entries(theme.THEMES)){
    assert.ok(contrast(palette.ink,palette.page)>=4.5,`${key}: body text`);
    assert.ok(contrast('#FFFFFF',palette.primary)>=4.5,`${key}: primary-button text`);
    assert.ok(contrast(palette.badgeText,palette.badge)>=4.5,`${key}: offer labels`);
    assert.ok(contrast(palette.card,palette.primaryDark)>=4.5,`${key}: deal panel text`);
  }
});

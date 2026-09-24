// CalcDeck 回归测试：node test.mjs （部署前必须通过）
import {readFileSync} from 'node:fs';
const html=readFileSync('index.html','utf8');
const js=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
const elems={}; for(const id of ids) elems[id]={value:"",innerHTML:"",addEventListener(){},click(){},classList:{add(){},remove(){}},querySelectorAll:()=>({forEach(){}}),scrollIntoView(){}};
globalThis.document={ documentElement:{dataset:{}}, getElementById:(id)=>{if(!(id in elems))throw new Error("getElementById null: "+id);return elems[id];},
  querySelector:(sel)=>{if(sel.startsWith("."))return{textContent:""};const id=sel.replace(/^#/,"");if(!(id in elems))throw new Error("querySelector null: "+sel);return elems[id];},
  querySelectorAll:()=>({forEach(){}})};
Object.defineProperty(globalThis,"navigator",{value:{clipboard:{writeText:async()=>{}}},configurable:true});
globalThis.URL=class{static createObjectURL(){return "x"}static revokeObjectURL(){}};
globalThis.Blob=class{};

const boot=(patch)=>{for(const k in patch)Object.assign(elems[k],patch[k]);
  return new Function(js+"\n;return{unitChanged,compute,fulfillment};")();};

let fail=0;
const ok=(cond,msg)=>{console.log((cond?"✅ ":"❌ ")+msg); if(!cond)fail++;};
const IMP={unit:{value:"imperial"},price:{value:"29.99"},cat:{value:"standard"},months:{value:"1"},
  L:{value:"10"},W:{value:"6"},H:{value:"2"},wt:{value:"0.8"},peak:{value:"no"},tier:{value:"auto"}};

// 1) 初始：29.99 标准件 10x6x2in 0.8lb → 1lb 档 4.75×1.035
let api=boot({...IMP});
ok(elems.out.innerHTML.includes("Profit / unit"),"初始计算出 KPI");
ok(elems.out.innerHTML.includes("$4.92"),"配送费 4.92");
ok(elems.adout.innerHTML.includes("Break-even ACOS"),"广告段输出 CPA/ACOS/maxCPC");

// 2) hazmat：mid 档 ≤1lb → 5.19×1.035
api=boot({...IMP,cat:{value:"hazmat"}});
ok(elems.out.innerHTML.includes("$5.37"),"hazmat 配送费 5.37");

// 3) 大号大件：25x20x15in 30lb → 体积重 53.96lb → (10.07+53×0.38)×1.035
api=boot({...IMP,L:{value:"25"},W:{value:"20"},H:{value:"15"},wt:{value:"30"}});
ok(elems.out.innerHTML.includes("largebulky"),"大号大件识别（长+围95≤130 且 ≤70lb）");
ok(elems.out.innerHTML.includes("$30.79"),"大号大件费 30.79（standard mid：9.61+53×0.38，计费重=体积重 53.96）");

// 3b) 真超大件：同尺寸 80lb → >70lb → (58.45+9×0.75)×1.035
api=boot({...IMP,L:{value:"25"},W:{value:"20"},H:{value:"15"},wt:{value:"80"}});
ok(elems.out.innerHTML.includes("oversize"),"超大件识别");
ok(elems.out.innerHTML.includes("$63.71"),"超大件分段费 63.71（standard mid：54.81+9×0.75）");

// 4) 大号大件（20x12x10in 8lb）→ (9.61+7×0.38)×1.035
api=boot({...IMP,L:{value:"20"},W:{value:"12"},H:{value:"10"},wt:{value:"8"}});
ok(elems.out.innerHTML.includes("largebulky"),"大号大件识别 2");
ok(elems.out.innerHTML.includes("$16.63"),"大号大件费 16.63（计费重=体积重 17.27）");

// 5)【最后】单位切换：imperial→metric→imperial 往返
api=boot({...IMP});
elems.unit.value="metric"; api.unitChanged();
ok(Math.abs(parseFloat(elems.L.value)-25.4)<0.05,"10in→25.4cm");
elems.unit.value="imperial"; api.unitChanged();
ok(Math.abs(parseFloat(elems.L.value)-10)<0.05,"25.4cm→10in（往返无损）");

if(fail){console.log(`\n${fail} 项失败`);process.exit(1);}
console.log("\n全部通过");

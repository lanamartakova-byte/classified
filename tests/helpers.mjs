import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {guests, defaultGreeting, event} from '../config.js';
import {imageAssets, sceneImages} from '../assets.js';
import {safeKeys, safeDisplay, safeGeometry, safeFit} from '../safe-controls.js';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
export function boot(search='',persist=new Map(),loader=null,clock=performance,options={}){
 const elements=new Map(),calls=[],documentListeners={};
 const el=()=>({innerHTML:'',textContent:'',hidden:false,disabled:false,dataset:{},classList:{values:new Set(),add(x){this.values.add(x)},remove(x){this.values.delete(x)},contains(x){return this.values.has(x)}},focus(){},setAttribute(){},querySelectorAll(){return[]},style:{setProperty(){}},listeners:{},addEventListener(name,fn){this.listeners[name]=fn},insertAdjacentHTML(_,html){this.innerHTML+=html}});
 const get=s=>{if(!elements.has(s))elements.set(s,el());return elements.get(s)};
 const ctx=vm.createContext({guests,defaultGreeting,event,sceneImages,safeKeys,safeDisplay,safeGeometry,safeFit,performance:clock,ImageLoader:class{constructor(){return loader || {ready:()=>true,url:id=>imageAssets[id][0],warm(){},ensure:id=>Promise.resolve(imageAssets[id][0]),prepare:()=>Promise.resolve()}}},AudioController:class{enabled=true;sfx(x){calls.push(x||'click')}start(x){calls.push(x)}toggle(){this.enabled=!this.enabled}},document:{querySelector:get,querySelectorAll:()=>[],body:el(),addEventListener(name,fn){documentListeners[name]=fn}},localStorage:{getItem:k=>persist.get(k),setItem:(k,v)=>persist.set(k,v)},location:{search},URLSearchParams,matchMedia:()=>({matches:options.reducedMotion??true}),Image:class{},console,window:{scrollTo(){}},setTimeout:options.setTimeout||((fn)=>{fn();return 1}),clearTimeout:options.clearTimeout||(()=>{})});
 vm.runInContext(source,ctx);return {run:s=>vm.runInContext(s,ctx),elements,get,calls,persist,documentListeners};
}

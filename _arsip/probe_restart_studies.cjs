const http=require('http');
http.get('http://127.0.0.1:9222/json',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{
const t=JSON.parse(d).find(x=>x.url&&x.url.includes('/chart/'));
const ws=new (require('ws'))(t.webSocketDebuggerUrl);let id=1;
function send(m,p){return new Promise(r=>{const mid=id++;const h=raw=>{const j=JSON.parse(raw.toString());if(j.id===mid){ws.removeListener('message',h);r(j.result)}};ws.on('message',h);ws.send(JSON.stringify({id:mid,method:m,params:p||{}}))})}
ws.on('open',async()=>{
await send('Runtime.enable');
const r=await send('Runtime.evaluate',{expression:`(function(){
var out={studies:{}};
try{
var wv=window.TradingViewApi._activeChartWidgetWV.value();
var pane=wv._chartWidget._controlBarNavigation._targetPaneWidget;
var st=pane._state;
out.url=location.href;
out.symbolSrc=String(wv.symbol());
out.res=String(wv.resolution());
out.isMainPane=st._isMainPane;
var ss=st._studySources;
for(var k in ss){
  var s=ss[k];
  var ent={id:(s._id&&s._id._value!=null)?String(s._id._value):null};
  try{var tc=s._titleInPartsCache;ent.titles=[];if(tc){var tcf=Object.values(tc);for(var i=0;i<tcf.length;i++){var parts=tcf[i];if(Array.isArray(parts)&&typeof parts[0]==='string')ent.titles.push(parts[0])}}}catch(e){ent.tErr=e.message}
  try{ent.legendItems=s._legendView&&s._legendView._items?s._legendView._items.length:0}catch(e){ent.lErr=e.message}
  try{ent.isStarted=s._isStarted}catch(e){}
  try{ent.status=s._status&&s._status._value?String(s._status._value.type):null}catch(e){}
  ent.pcKeys=Object.keys(s._graphics._primitivesCollection).length;
  out.studies[k]=ent;
}
}catch(e){out.err=e.message}
const safe = new function(){this._s={}};
function strip(o,depth){
  if(o===null||typeof o!=='object')return o;
  if(depth>2)return '[obj]';
  if(Array.isArray(o))return o.map(function(x){return strip(x,depth+1)}).slice(0,10);
  var r={};
  try{var ks=Object.keys(o);for(var i=0;i<ks.length&&i<8;i++){var v=o[ks[i]];r[ks[i]]=typeof v==='function'?'fn':strip(v,depth+1)}}catch(e){r.E=e.message}
  return r;
}
return JSON.stringify(strip(out,0));
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
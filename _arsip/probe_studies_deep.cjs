const http=require('http');
http.get('http://127.0.0.1:9222/json',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{
const t=JSON.parse(d).find(x=>x.url&&x.url.includes('/chart/'));
const ws=new (require('ws'))(t.webSocketDebuggerUrl);let id=1;
function send(m,p){return new Promise(r=>{const mid=id++;const h=raw=>{const j=JSON.parse(raw.toString());if(j.id===mid){ws.removeListener('message',h);r(j.result)}};ws.on('message',h);ws.send(JSON.stringify({id:mid,method:m,params:p||{}}))})}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function e(x){const r=await send('Runtime.evaluate',{expression:x,returnByValue:true});return r.result&&r.result.value}
ws.on('open',async()=>{
await send('Runtime.enable');
await sleep(20000);
const r=await send('Runtime.evaluate',{expression:`(function(){
var out={};
try{
var wv=window.TradingViewApi._activeChartWidgetWV.value();
var model=wv._chartWidget._model;
var studies=model._studies;if(!studies)studies=[];
var list=[];
for(var i=0;i<studies.length;i++){
  var st=studies[i];var meta=st.metaInfo();
  var name=meta?(meta.longName||meta.shortId||''):'';
  var ent={i:i,name:name};
  try{ent.isStarted=st._isStarted}catch(e){}
  try{var v=st.getStudyLastValues();if(v&&v.plots){var p={};for(var k in v.plots)p[k]=v.plots[k].value;ent.plots=p}}catch(e){ent.plotsErr=e.message}
  try{var g=st._graphics;var pc=g._primitivesCollection;ent.dwglabels=pc.dwglabels?Object.keys(pc.dwglabels.get(false)._primitivesDataById||{}).length:0}catch(e){}
  list.push(ent);
}
out.list=list;
}catch(e){out.err=e.message}
return JSON.stringify(out);
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
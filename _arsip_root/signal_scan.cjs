const http=require('http');
http.get('http://127.0.0.1:9222/json',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{
const t=JSON.parse(d).find(x=>x.url&&x.url.includes('/chart/'));
const ws=new (require('ws'))(t.webSocketDebuggerUrl);let id=1;
function send(m,p){return new Promise(r=>{const mid=id++;const h=raw=>{const j=JSON.parse(raw.toString());if(j.id===mid){ws.removeListener('message',h);r(j.result)}};ws.on('message',h);ws.send(JSON.stringify({id:mid,method:m,params:p||{}}))})}
ws.on('open',async()=>{
await send('Runtime.enable');
const r=await send('Runtime.evaluate',{expression:`(function(){
var out={};
try{
var chart=window.TradingViewApi._activeChartWidgetWV.value();
var st=chart.getStudyById('PTdIuB');
var src=st._study||st;
var g=src._graphics||(src._source&&src._source._graphics);
var pc=g._primitivesCollection;
var bars=chart._chartWidget._paneWidgets._value[0]._state.m_dataSources[0]._seriesSource._data.m_bars._items;
var times=[];
for(var bi=0;bi<bars.length;bi++){times[bi]=bars[bi].value[0]}
var idx=g._indexes||[];
function barOf(x){return idx[x]!=null&&idx[x]>0?idx[x]:x}
function dt(b){var tm=times[b];return tm!=null?new Date(tm*1000).toISOString().slice(11,16)+' '+new Date(tm*1000).toISOString().slice(0,10):null}
var col=pc.dwglabels.get('labels').get(false)._primitivesDataById;
var labels=[];
col.forEach(function(l){var b=barOf(l.x);labels.push({x:l.x,b:b,dt:dt(b),y:l.y,t:l.t})});
labels.sort(function(a,b){return a.x-b.x});
var pd=null;
for(var i=labels.length-1;i>=0;i--){if(labels[i].t.indexOf('PINE_DATA')===0){pd=labels[i];break}}
out.pineData=pd;
var bos=labels.filter(function(l){return /^BOS|^CHOCH/.test(l.t)});
out.bosLast=bos.slice(-8);
var dl=pc.dwglines.get('lines').get(false)._primitivesDataById;
var lines=[];
dl.forEach(function(l){lines.push({x1:l.x1,x2:l.x2,b1:barOf(l.x1),b2:barOf(l.x2),y1:l.y1,y2:l.y2,st:l.st,ci:l.ci,w:l.w})});
lines.sort(function(a,b){return Math.max(a.b2,a.x2)-Math.max(b.b2,b.x2)});
out.swingsLast=lines.slice(-6);
var db=pc.dwgboxes.get('boxes').get(false)._primitivesDataById;
var boxes=[];
db.forEach(function(bx){boxes.push({x1:bx.x1,x2:bx.x2,b1:barOf(bx.x1),b2:barOf(bx.x2),y1:bx.y1,y2:bx.y2})});
boxes.sort(function(a,b){return a.x1-b.x1});
out.boxesLast=boxes.slice(-6);
out.nBars=bars.length;
out.lastBarClose=bars[bars.length-1].value[4];
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
const v=r.result.value||'';
console.log(JSON.stringify(JSON.parse(v),null,1));
      ws.close();
      process.exit(0);
    });
  });
});
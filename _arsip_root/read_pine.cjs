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
out.barLen=bars.length;
out.lastBar=bars[bars.length-1].value;
var times=[];
for(var bi=0;bi<bars.length;bi++){times[bi]=bars[bi].value[0]}
var idx=g._indexes||[];
out.idxLen=idx.length;
var col=pc.dwglabels.get('labels').get(false)._primitivesDataById;
var labels=[];
col.forEach(function(l){
  var bar=idx[l.x]!=null&&idx[l.x]>0?idx[l.x]:l.x;
  var time=times[bar]!=null?times[bar]:null;
  var d=time!=null?new Date(time*1000).toISOString():null;
  labels.push({id:l.id,x:l.x,bar:bar,time:time,dt:d,y:l.y,t:l.t});
});
labels.sort(function(a,b){return a.x-b.x});
var dl=pc.dwglines.get('lines').get(false)._primitivesDataById;
var lines=[];
dl.forEach(function(l){
  var b1=idx[l.x1]!=null&&idx[l.x1]>0?idx[l.x1]:l.x1;
  var b2=idx[l.x2]!=null&&idx[l.x2]>0?idx[l.x2]:l.x2;
  var t1=times[b1]!=null?times[b1]:null;
  var t2=times[b2]!=null?times[b2]:null;
  lines.push({id:l.id,x1:l.x1,x2:l.x2,b1:b1,b2:b2,t1:t1,t2:t2,y1:l.y1,y2:l.y2,st:l.st,ci:l.ci});
});
lines.sort(function(a,b){return a.x1-b.x1});
var db=pc.dwgboxes.get('boxes').get(false)._primitivesDataById;
var boxes=[];
var bCnt=0;
if(db){db.forEach(function(b){bCnt++;boxes.push({id:b.id,x1:b.x1,x2:b.x2,y1:b.y1,y2:b.y2})})}
out.nLabels=labels.length;
out.nLines=lines.length;
out.nBoxes=bCnt;
out.labels=labels;
out.lines=lines;
out.boxes=boxes;
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
const v=r.result.value||'';
const j=JSON.parse(v);
const out={
  err:j.err||null,
  barLen:j.barLen,
  lastBar:j.lastBar,
  nLabels:j.nLabels,nLines:j.nLines,nBoxes:j.nBoxes,
  lastLabel:j.labels&&j.labels.length?j.labels.slice(-12):[],
  pineData:(j.labels||[]).filter(l=>l.t&&l.t.indexOf('PINE_DATA')!==-1).slice(-2),
  allLabels:j.labels
};
console.log(JSON.stringify(out,null,1));
      ws.close();
      process.exit(0);
    });
  });
});
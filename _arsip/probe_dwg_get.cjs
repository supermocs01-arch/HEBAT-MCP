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
var wv=window.TradingViewApi._activeChartWidgetWV.value();
var pw=wv._chartWidget._paneWidgets._value[0];
var s=pw._state._studySources['0'];
var pc=s._graphics._primitivesCollection;
function dumpColl(mapName,subKey){
  var m=pc[mapName];
  if(!m)return null;
  var sub=m.get(subKey);
  if(!sub)return {exists:false};
  var rec={exists:true,type:typeof sub};
  if(sub&&typeof sub==='object'){
    rec.subKeys=Object.keys(sub).slice(0,12);
    var data=sub._primitivesDataById||sub._items||sub._data||sub;
    if(data&&typeof data==='object'){
      rec.dataType=typeof data;
      var ids=Object.keys(data);
      rec.count=ids.length;
      rec.ids=ids.slice(0,6);
      if(ids.length){rec.firstType=typeof data[ids[0]];}
    }
  }
  return rec;
}
out.lines=dumpColl('dwglines','lines');
out.labels=dumpColl('dwglabels','labels');
out.boxes=dumpColl('dwgboxes','boxes');
out.performance=dumpColl('performance','performance');
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
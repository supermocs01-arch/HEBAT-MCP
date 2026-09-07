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
var state=window.TradingViewApi._activeChartWidgetWV.value()._chartWidget._controlBarNavigation._targetPaneWidget._state;
var s=state._studySources['4'];
var pc=s._graphics._primitivesCollection;
var coll=pc.dwglabels;
out.collType=typeof coll;
out.collKeys=coll?Object.keys(coll):null;
var lm=coll&&coll.get?coll.get(false):coll;
out.lmType=typeof lm;
if(lm){out.lmKeys=Object.keys(lm).slice(0,30);}
var map=lm&&(lm._primitivesDataById||lm._items);
out.mapType=typeof map;
if(map){out.mapCount=Object.keys(map).length;out.mapKeys=Object.keys(map).slice(0,5)}
var all=pc.dwglabels?null:'no coll';
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
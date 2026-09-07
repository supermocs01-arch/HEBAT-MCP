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
var main=state.m_dataSources[0];
var bars=main._seriesSource._data.m_bars;
var items=bars._items;
out.itemsType=typeof items;
out.itemsLen=items&&items.length!==undefined?items.length:null;
if(items&&items.length){
  var last=items[items.length-1];
  out.lastKeys=Object.keys(last).slice(0,15);
  try{out.last=JSON.stringify(last).slice(0,200)}catch(e){out.last='circular'}
}
try{out.start=bars._start;out.end=bars._end}catch(e){}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
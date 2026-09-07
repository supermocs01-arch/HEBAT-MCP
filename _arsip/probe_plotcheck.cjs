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
var pane=window.TradingViewApi._activeChartWidgetWV.value()._chartWidget._controlBarNavigation._targetPaneWidget;
var s=pane._state._studySources['4'];
var g=s._graphics;
var ix=g._indexes;
out.indexesLen=ix.length;
out.indexesSample=ix.slice(0,20);
out.hhistKeys=Object.keys(g._hhistsByTimePointIndex).slice(0,10);
// legend items
try{var li=s._legendView._items;out.legendItems=li.length;var ls=[];for(var i=0;i<Math.min(li.length,8);i++){var it=li[i];ls.push({text:it._text&&it._text(),val:it._value!==undefined?it._value():null})}out.legend=ls}catch(e){out.legendErr=e.message}
// plot values
try{var pv=s._plotSources;out.plotSources=pv?pv.length:null}catch(e){out.psErr=e.message}
try{var graphs=s._graphicsPriceAxisViews;out.gpa=g&&g._graphics?Object.keys(g._graphics):null}catch(e){}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
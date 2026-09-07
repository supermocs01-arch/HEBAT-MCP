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
var g=s._graphics;
out.gKeys=Object.keys(g).slice(0,20);
try{out.paneViews=s._paneViews?s._paneViews.length:null}catch(e){}
try{out.prim=g._primitives!=null?Object.keys(g._primitives).slice(0,10):null}catch(e){}
try{out.gpKeys=Object.keys(g._graphics||{}).slice(0,10)}catch(e){}
try{
var pc=g._primitivesCollection;
var d1=pc.dwglines&&pc.dwglines.get?pc.dwglines.get(false):null;
out.dwglines=null;
if(d1){var m=d1._primitivesDataById||d1._items||d1;out.dwglines={count:Object.keys(m).length,keys:Object.keys(m).slice(0,5)}}
}catch(e){out.dwgErr=e.message}
try{
var hf=s._graphicsIndexes||s._haystack? 'has':'no';
out.hf=hf;
}catch(e){}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
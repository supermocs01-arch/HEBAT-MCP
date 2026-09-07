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
var pane=window.TradingViewApi._activeChartWidgetWV.value()._chartWidget._controlBarNavigation._targetPaneWidget._state;
var s=pane._studySources['4'];
var pc=s._graphics._primitivesCollection;
out.pcKeys=Object.keys(pc);
var det={};
for(var k in pc){
  var v=pc[k];
  if(v&&typeof v.get==='function'){
    try{var lm=v.get(false);var map=(lm&&(lm._primitivesDataById||lm._items))||{};det[k]={getOk:true,count:Object.keys(map).length,mapKeys:Object.keys(map).slice(0,5)};}catch(e){det[k]={getErr:e.message};}
  } else {
    det[k]={type:typeof v, keys: v?Object.keys(v).slice(0,8):null};
  }
}
out.det=det;
}catch(e){out.err=e.message}
return JSON.stringify(out);
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
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
var cw=wv._chartWidget;
var ap=cw._activePaneWidget;
out.activePaneSame=ap===cw._paneWidgets._value[0];
var pws=cw._paneWidgets._value;
out.pwsLen=pws.length;
for(var i=0;i<pws.length;i++){
  var p=pws[i];
  var ent={i:i,isMain:!!(p._state&&p._state._isMainPane&&p._state._isMainPane._value)};
  try{ent.studies=p._state?Object.keys(p._state._studySources):[]}catch(e){ent.sErr=e.message}
  try{ent.visible=p._isVisible!==undefined?String(p._isVisible):null}catch(e){}
  try{ent.h=p._height!=null?String(p._height):null}catch(e){}
  out['p'+i]=ent;
}
// paneWidgetsSharedState
try{var sh=cw._paneWidgetsSharedState;out.shKeys=sh?Object.keys(sh).slice(0,20):null}catch(e){out.shErr=e.message}
// chart visible size
try{out.screen=cw._availableScreen?JSON.stringify(cw._availableScreen).slice(0,120):null}catch(e){}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
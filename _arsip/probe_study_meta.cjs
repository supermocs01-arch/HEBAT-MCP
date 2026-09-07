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
out.sKeys=Object.keys(s).slice(0,80);
try{out.title=s._title!==undefined?String(s._title):null}catch(e){}
try{out.studyName=s._studyName!==undefined?String(s._studyName):null}catch(e){}
try{out.leafId=s._leafId!==undefined?String(s._leafId):null}catch(e){}
try{out.isInvisible=s._isInvisible}catch(e){}
try{out.isVisible=s._isVisible}catch(e){}
try{out.alive=s._alive!==undefined?s._alive:[s._isDestroyed]}catch(e){}
try{out.destroyed=s._isDestroyed}catch(e){}
try{out.panes=s._panes?s._panes.length:null}catch(e){}
try{out.graphicsKeys=s._graphics?Object.keys(s._graphics).slice(0,15):null}catch(e){}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
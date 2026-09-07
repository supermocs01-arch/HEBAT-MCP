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
var ds=state.m_dataSources;
var main=ds[0];
out.isSeries=main.isSeries;
out.instanceId=main._instanceId;
out.id=main._id;
try{out.symbolInfo=main._symbolInfo?(main._symbolInfo._symbol||main._symbolInfo.name):null}catch(e){}
try{out.tf=main._timeframeInfo?String(main._timeframeInfo._resolution):null}catch(e){}
try{var recs=main._symbolSource?main._symbolSource._seriesSource._records:null;out.recs=recs?recs.length:null}catch(e){out.recsErr=e.message}
try{out.cursorIndex=main._cursorIndex}catch(e){}
try{out.replay=main._replayMode}catch(e){}
try{out.paused=main._isPaused}catch(e){}
try{out.crosshairPos=main._crosshairPos}catch(e){}
// dataRange
try{out.dataRange=main._dataRange?JSON.stringify(main._dataRange):null}catch(e){out.dataRangeErr=e.message}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
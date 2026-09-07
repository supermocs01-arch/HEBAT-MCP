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
out.restarting=s._restarting;
out.wasCompleted=s._wasCompletedBefore;
out.isStarted=s._isStarted;
out.statusRaw=new Object();try{out.statusVal=(s._status&&s._status._value)}catch(e){}
try{out.hibernation=s._hibernationState!==undefined?s._hibernationState:null}catch(e){}
try{out.dataUpdateS=s._ongoingDataUpdate}catch(e){}
try{out.turn=s._turnaround}catch(e){}
// pane views inspection
try{var pvs=s._paneViews;out.pvTypes=pvs.map(function(p){return typeof p});}catch(e){out.pvErr=e.message}
// legend
try{out.legend=s._legendView?Object.keys(s._legendView).slice(0,10):null}catch(e){}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
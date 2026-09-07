const http=require('http');
http.get('http://127.0.0.1:9222/json',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{
const t=JSON.parse(d).find(x=>x.url&&x.url.includes('/chart/'));
const ws=new (require('ws'))(t.webSocketDebuggerUrl);let id=1;
function send(m,p){return new Promise(r=>{const mid=id++;const h=raw=>{const j=JSON.parse(raw.toString());if(j.id===mid){ws.removeListener('message',h);r(j.result)}};ws.on('message',h);ws.send(JSON.stringify({id:mid,method:m,params:p||{}}))})}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
ws.on('open',async()=>{
await send('Runtime.enable');
await sleep(12000);
const r=await send('Runtime.evaluate',{expression:`(function(){
var out={};
try{
var paneState=window.TradingViewApi._activeChartWidgetWV.value()._chartWidget._controlBarNavigation._targetPaneWidget._state;
var s=paneState._studySources['4'];
out.isStarted=s._isStarted;
try{out.status=s._status._value}catch(e){out.status='E'}
try{out.compileErr=s._compileErrorStatus._value}catch(e){out.compileErr='E'}
try{out.id=s._id}catch(e){}
try{out.meta=(s._meta&&s._meta.title)||null}catch(e){}
try{var g=s._graphics;var pc=g._primitivesCollection;
out.dwg=pc.dwglabels?Object.keys(pc.dwglabels.get(false)._primitivesDataById||{}).length:0;
out.boxes=pc.dwgboxes?Object.keys(pc.dwgboxes.get(false)._primitivesDataById||{}).length:0;
out.hlines=pc.hlines?Object.keys(pc.hlines.get(false)._primitivesDataById||{}).length:0;
out.lines=pc.lines?Object.keys(pc.lines.get(false)._primitivesDataById||{}).length:0;
}catch(e){out.gErr=e.message}
try{
var last=s._lastValues||s._lastValue;out._lve=last?JSON.stringify(last).slice(0,300):null;
}catch(e){}
try{out.colors=s._colors?Object.keys(s._colors):null}catch(e){}
return JSON.stringify(out);
}catch(e){out.err=e.message}
return JSON.stringify(out);
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
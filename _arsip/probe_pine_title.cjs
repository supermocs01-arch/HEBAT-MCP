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
try{out.titleCache=JSON.stringify(s._titleInPartsCache).slice(0,300)}catch(e){}
try{out.splitTitle=JSON.stringify(s._splitTitleCache).slice(0,300)}catch(e){}
try{out.sourcesCount=s._sources?s._sources.length:null}catch(e){}
try{out.src=s._pineSourceCodeModel?Object.keys(s._pineSourceCodeModel):null}catch(e){}
try{out.scriptSource=s.pineScript!=null?JSON.stringify(s.pineScript).slice(0,200):null}catch(e){}
try{out.isCustom=s._isCustom}catch(e){}
try{out.idStr=JSON.stringify(s._id)}catch(e){}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
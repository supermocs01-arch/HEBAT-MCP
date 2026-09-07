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
var data=main._seriesSource._data;
out.barsKeyType=typeof data.m_bars;
try{out.barCount=data.m_bars._bars?data.m_bars._bars.length:null}catch(e){out.barCountErr=e.message}
try{var b=main._seriesSource._data.m_bars;out.barKeys=Object.keys(b).slice(0,20)}catch(e){out.barKeysErr=e.message}
try{var src=main._seriesSource;out.srcKeys2=Object.keys(src).slice(0,60)}catch(e){}
try{out.resolution=src._resolution!=null?String(src._resolution):null}catch(e){}
try{out.extSym=src._extSymbol!=null?String(src._extSymbol):null}catch(e){}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
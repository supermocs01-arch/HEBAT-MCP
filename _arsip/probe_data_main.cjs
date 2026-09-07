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
out.containsData=state._containsData!==undefined?state._containsData:null;
try{var d=main._data;out.dataType=typeof d;if(d&&typeof d!=='string'&&typeof d!=='number'){out.dataKeys=Object.keys(d).slice(0,30);try{out.recs=d._records?d._records.length:null}catch(e){}}}catch(e){out.dataErr=e.message}
try{var ss=main._seriesSource;out.ssType=typeof ss;if(ss&&typeof ss==='object'){out.ssDataKeys=Object.keys(ss._data||{}).slice(0,20);try{out.ssRecs=ss._data._records?ss._data._records.length:null}catch(e){}}}catch(e){out.ssErr=e.message}
try{out.symbolInfo=main._symbolInfo?JSON.stringify(main._symbolInfo).slice(0,200):null}catch(e){}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
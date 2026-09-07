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
out.dsCount=ds.length;
var first=ds[0];
out.ds0Keys=Object.keys(first).slice(0,50);
try{out.sym=first._symbolId!=null?first._symbolId:String(first._symbolText!=null?first._symbolText:'')}catch(e){out.sym='ERR'}
try{out.tf=first._timeframe!=null?String(first._timeframe):null}catch(e){}
try{
var src=state.m_mainDataSource&&state.m_mainDataSource._source;
if(src&&src._records)out.records=src._records.length;
if(src&&src._index!==undefined)out.index=src._index;
}catch(e){out.srcErr=e.message}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
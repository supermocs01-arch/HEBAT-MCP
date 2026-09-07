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
var chart=window.TradingViewApi._activeChartWidgetWV.value();
var pw=chart._chartWidget._paneWidgets._value[0];
var bars=pw._state.m_dataSources[0]._seriesSource._data.m_bars._items;
var sel=[269,270,271,272,273,290,295,296,297,298,299];
var rows=[];
for(var i=0;i<sel.length;i++){var b=bars[sel[i]];rows.push({i:sel[i],t:b.value[0],c:b.value[4],v:b.value[5]})}
out.rows=rows;
var s=pw._state._studySources['0'];
out.hiber=s._isHibernated;
out.subState=s._subState?s._subState._value:null;
out.subStateRaw=s._subState?JSON.stringify(s._subState):null;
var st2=chart.getStudyById('PTdIuB');
var src=st2._study||st2;
out.srcHiber=src._isHibernated;
out.srcSub=src._subState?JSON.stringify(src._subState):null;
out.srcStatus=src._status?JSON.stringify(src._status._value):null;
var g=src._graphics;
out.gHiber=g._isHibernated;
out.indexesSample=(g._indexes||[]).slice(0,10);
out.indexesAll=(g._indexes||[]).slice(-10);
out.indexesLen=(g._indexes||[]).length;
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
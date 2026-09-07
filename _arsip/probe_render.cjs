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
var s=chart.getStudyById('PTdIuB');
var src=s._study||s;
out.pvCount=src._paneViews?src._paneViews.length:null;
if(src._paneViews){
  out.pv=[];
  for(var i=0;i<src._paneViews.length;i++){
    var pv=src._paneViews[i];
    var itemInfo={i:i,ctor:pv.constructor.name};
    if(pv._items)itemInfo.items=typeof pv._items.length==='number'?pv._items.length:Object.keys(pv._items).length;
    if(pv._renderer){
      var rn=pv._renderer;
      itemInfo.rendCtor=rn.constructor.name;
      var cands=['_items','_primitivesDataById','_data','_entries'];
      for(var c=0;c<cands.length;c++){if(rn[cands[c]]){var v=rn[cands[c]];itemInfo['rend_'+cands[c]]=typeof v.length==='number'?v.length:(v.size!=null?v.size:Object.keys(v).length)}}
    }
    out.pv.push(itemInfo);
  }
}
var pw=chart._chartWidget._paneWidgets._value[0];
var ts=pw._state.m_dataSources[0]._seriesSource;
out.dsLen=pw._state.m_dataSources.length;
out.seriesType=ts&&ts.constructor?ts.constructor.name:null;
var b=ts&&ts._data&&ts._data.m_bars?ts._data.m_bars:null;
out.barsLen=b&&b._items?b._items.length:null;
var bb=ts&&ts._bars;
out.bb=bb?typeof bb.size==='function'?bb.size():bb.length:null;
var res=chart._chartWidget._resolution||ts._resolution;
out.res=res;
out.sym=ts&&ts.symbol?ts.symbol():null;
var ts2=chart._chartWidget.model().mainSeries()._timeScale;
out.timeScale=!!ts2;
if(ts2){
  out.left=ts2._leftOffset!=null?ts2._leftOffset:null;
  out.right=ts2._rightOffset!=null?ts2._rightOffset:null;
  out.range=ts2._barRange!=null?JSON.stringify(ts2._barRange):null;
  out.visibleRange=ts2._visibleRange!=null?JSON.stringify(ts2._visibleRange):null;
  out.barSpacing=ts2._barSpacing;
}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
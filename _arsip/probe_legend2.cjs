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
var pane=window.TradingViewApi._activeChartWidgetWV.value()._chartWidget._controlBarNavigation._targetPaneWidget;
var s=pane._state._studySources['0'];
// legend items text
var li=s._legendView&&s._legendView._items;
out.legendCount=li?li.length:0;
var texts=[];
if(li){for(var i=0;i<li.length;i++){try{texts.push(String(li[i]._text&&li[i]._text()))}catch(e){texts.push('E')}}}
out.legendTexts=texts;
// last plot values
try{
var vals=s._plotSources&&s._plotSources.length;
out.plotCount=vals;
}catch(e){out.plotsErr=e.message}
// graphics deep: _hhistsByTimePointIndex, _indexes
out.ixLen=(s._graphics._indexes&&s._graphics._indexes.length)||0;
out.hhistCount=Object.keys(s._graphics._hhistsByTimePointIndex||{}).length;
// check pane views for graph markers
try{out.pvCount=s._paneViews?s._paneViews.length:0}catch(e){}
// check whether study has overlay=true placement
try{out.priceScale=s._priceScale?s._priceScale._id:null}catch(e){}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
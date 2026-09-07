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
var wv=window.TradingViewApi._activeChartWidgetWV.value();
var cw=wv._chartWidget;
out.isMultipleLayout=!!cw._isMultipleLayout;
try{out.chartWidgetCollection=cw._chartWidgetCollection?Object.keys(cw._chartWidgetCollection).slice(0,20):null}catch(e){}
try{var subs=cw._chartWidgetCollection&&cw._chartWidgetCollection._subscribedChartWidget;out.subscribed=subs?String(subs===cw):null}catch(e){}
// all chart widget instances in collection
try{
var coll=cw._chartWidgetCollection;
if(coll&&coll._widgets){out.widgetsCount=coll._widgets.length}
}catch(e){}
// DOM: count chart-widget and pane elements with size
var domCw=document.querySelectorAll('.chart-widget');
out.domChartWidgets=domCw.length;
var sizes=[];
for(var i=0;i<domCw.length;i++){
  var r=domCw[i].getBoundingClientRect();
  sizes.push(Math.round(r.width)+'x'+Math.round(r.height));
}
out.domSizes=sizes;
// canvas visibility
var cvs=document.querySelectorAll('.chart-widget canvas');
out.canvasInChart=cvs.length;
// legend in any chart widget
var lg=document.querySelectorAll('.chart-widget .tv-legend, .chart-widget [data-name="legend-source-item"]');
out.legendsInChart=lg.length;
// tabs
var tbs=document.querySelectorAll('[data-name="tab"], .tab');
out.tabs=tbs.length;
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
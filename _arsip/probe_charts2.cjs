const http=require('http');
http.get('http://127.0.0.1:9222/json',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{
const t=JSON.parse(d).find(x=>x.url&&x.url.includes('/chart/'));
const ws=new (require('ws'))(t.webSocketDebuggerUrl);let id=1;
function send(m,p){return new Promise(r=>{const mid=id++;const h=raw=>{const j=JSON.parse(raw.toString());if(j.id===mid){ws.removeListener('message',h);r(j.result)}};ws.on('message',h);ws.send(JSON.stringify({id:mid,method:m,params:p||{}}))})}
ws.on('open',async()=>{
await send('Runtime.enable');
const r=await send('Runtime.evaluate',{expression:`(function(){
var out={};
var cws=document.querySelectorAll('.chart-widget');
out.chartWidgets=cws.length;
var rects=[];
for(var i=0;i<cws.length;i++){var r=cws[i].getBoundingClientRect();rects.push({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)})}
out.rects=rects;
var legends=document.querySelectorAll('[class*="legend"]');
var legInfo=[];
for(var j=0;j<legends.length;j++){
  var t=(legends[j].textContent||'').trim().slice(0,120);
  var r2=legends[j].getBoundingClientRect();
  if(t&&r2.width>0)legInfo.push({txt:t,visible:legends[j].offsetParent!==null});
}
out.legends=legInfo.slice(0,10);
var wv=window.TradingViewApi._activeChartWidgetWV.value();
out.wvLayout=wv._chartWidget._isMultipleLayout;
out.wvCharts=wv._chartWidget._chartWidgets?wv._chartWidget._chartWidgets.length:null;
out.wvActiveIdx=wv._chartWidget._activeChartIndex;
var gate=window.TradingViewApi._activeChartWidgetGate;
out.gateType=typeof gate;
if(gate){var g=gate.value&&gate.value();out.gateChart=g?g._chartWidget._isMultipleLayout:null}
var tabs=document.querySelectorAll('[class*="chart-tab"], [data-name*="tab"], [role="tab"]');
out.tabs=tabs.length;
var tabsInfo=[];
for(var k=0;k<Math.min(tabs.length,10);k++){
  var t2=(tabs[k].textContent||'').trim().slice(0,40);
  var r3=tabs[k].getBoundingClientRect();
  if(t2&&r3.width>0)tabsInfo.push({txt:t2,active:!!(tabs[k].getAttribute('aria-selected')==='true'||tabs[k].classList.toString().match(/active/i))});
}
out.tabsInfo=tabsInfo;
return JSON.stringify(out);
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
const http=require('http');
http.get('http://127.0.0.1:9222/json',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{
const t=JSON.parse(d).find(x=>x.url&&x.url.includes('/chart/'));
const ws=new (require('ws'))(t.webSocketDebuggerUrl);let id=1;
function send(m,p){return new Promise(r=>{const mid=id++;const h=raw=>{const j=JSON.parse(raw.toString());if(j.id===mid){ws.removeListener('message',h);r(j.result)}};ws.on('message',h);ws.send(JSON.stringify({id:mid,method:m,params:p||{}}))})}
ws.on('open',async()=>{
await send('Runtime.enable');
const r=await send('Runtime.evaluate',{expression:`(function(){
var out={};
var eds=document.querySelectorAll('.monaco-editor.pine-editor-monaco');
out.n=eds.length;
var rects=[];
for(var i=0;i<eds.length;i++){var r=eds[i].getBoundingClientRect();rects.push({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)})}
out.editorRects=rects;
var bwb=window.TradingView&&window.TradingView.bottomWidgetBar;
out.bwbType=typeof bwb;
if(bwb){out.bwbKeys=Object.keys(bwb).slice(0,20)}
var bottom=document.querySelector('[class*="layout__area--bottom"]');
if(bottom){var r2=bottom.getBoundingClientRect();out.bottomArea={h:Math.round(r2.height),w:Math.round(r2.width),y:Math.round(r2.y)}}
var chartEl=document.querySelector('.chart-widget');
if(chartEl){var r3=chartEl.getBoundingClientRect();out.chartWidget={x:Math.round(r3.x),y:Math.round(r3.y),w:Math.round(r3.width),h:Math.round(r3.height)}}
var panel=document.querySelector('[class*="bottom-widgetbar"]');
out.panel=!!panel;
var modals=document.querySelectorAll('.tv-modal, [class*="dialog"], [role="dialog"]');
out.modals=modals.length;
return JSON.stringify(out);
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
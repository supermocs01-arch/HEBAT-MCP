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
var legends=document.querySelectorAll('.tv-legend');
out.legendCount=legends.length;
var texts=[];
for(var i=0;i<Math.min(legends.length,10);i++){try{texts.push(legends[i].textContent.replace(/\s+/g,' ').trim().slice(0,100))}catch(e){texts.push('E')}}
out.legends=texts;
var panes=document.querySelectorAll('.pane-legend');
out.paneLegendCount=panes.length;
var ptexts=[];
for(var j=0;j<Math.min(panes.length,10);j++){try{ptexts.push(panes[j].textContent.replace(/\s+/g,' ').trim().slice(0,80))}catch(e){ptexts.push('E')}}
out.paneLegends=ptexts;
// loading indicators
out.loading=!!document.querySelector('.tv-load-indicator')||!!document.querySelector('[data-name="loading"]');
out.waiting=document.querySelectorAll('.tv-symbol-status-waiting').length;
// error / no data overlays
var nos=document.querySelectorAll('.tv-chart-error');
out.chartErrors=Array.prototype.slice.call(nos).map(function(x){return x.textContent.slice(0,100)});
// data window row count
var dw=document.querySelectorAll('.data-window-item');
out.dwCount=dw.length;
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
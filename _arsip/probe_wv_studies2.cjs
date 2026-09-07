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
var st=wv._studies;
out.studiesType=typeof st;
if(st&&typeof st==='object'&&st.length!==undefined){out.studiesLen=st.length}
if(st&&typeof st==='object'&&!Array.isArray(st)){out.studiesKeys=Object.keys(st).slice(0,15)}
var panes=wv._panes;
out.panesType=typeof panes;
if(panes&&typeof panes==='object'){out.panesKeys=Object.keys(panes).slice(0,15);if(panes.length!==undefined)out.panesLen=panes.length}
// try studies API accessor
try{var stApi=wv.studies?wv.studies():null;out.stApi=stApi?Object.keys(stApi).slice(0,15):null}catch(e){out.stApiErr=e.message}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
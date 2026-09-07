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
var pw=wv._chartWidget._paneWidgets._value[0];
var s=pw._state._studySources['0'];
var pvs=s._paneViews;
out.pvCount=pvs.length;
var details=[];
for(var i=0;i<pvs.length;i++){
  var pv=pvs[i];
  var rec={i:i,ctor:pv.constructor?pv.constructor.name:null,keys:Object.keys(pv).slice(0,15)};
  try{rec.graphics=pv._graphics?Object.keys(pv._graphics).slice(0,10):null}catch(e){}
  details.push(rec);
}
out.pvs=details;
// graphicsPriceAxisViews
try{out.gpa=s._graphicsPriceAxisViews?s._graphicsPriceAxisViews.length:0}catch(e){}
// labelPaneViews
try{out.lpv=s._labelPaneViews?s._labelPaneViews.length:0}catch(e){}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
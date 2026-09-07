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
var pv=s._paneViews[2];
var gp=pv._graphicsProvider;
out.gpType=typeof gp;
out.gpCtor=gp&&gp.constructor?gp.constructor.name:null;
out.gpKeys=gp?Object.keys(gp).slice(0,30):null;
if(gp){
  for(var k in gp){
    var v=gp[k];
    if(v&&typeof v==='object'&&v.constructor&&/Map|Collection/i.test(v.constructor.name)){
      out[k]={ctor:v.constructor.name,size:v.size!=null?v.size:null};
    }
  }
}
// also try paneViews[3], [4]
var pv3=s._paneViews[3];
out.gp3Type=typeof pv3._graphicsProvider;
var gp3=pv3._graphicsProvider;
if(gp3){out.gp3Keys=Object.keys(gp3).slice(0,20)}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
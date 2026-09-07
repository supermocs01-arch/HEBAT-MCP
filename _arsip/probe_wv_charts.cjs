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
var api=window.TradingViewApi;
var wv=api._activeChartWidgetWV.value();
out.wvKeys=Object.keys(wv).slice(0,30);
out.wvType=wv._type;
try{out.chartCtor=wv.constructor.name}catch(e){}
try{
var coll=wv._chartWidgetCollection;
out.collKeys=coll?Object.keys(coll).slice(0,20):null;
var subs=coll&&coll._subscribedChartWidget;
out.subsKeys=subs?Object.keys(subs).slice(0,20):null;
if(subs){
  out.subsSame=subs===wv;
  out.subsId=subs._id;
}
}catch(e){out.collErr=e.message}
try{var cw=wv._chartWidget;out.cwKeys=Object.keys(cw).filter(function(k){return /widget|pane|layout|screen/i.test(k)}).slice(0,20)}catch(e){}
// look for chart widgets list
try{var cwl=wv._chartWidgets||wv._chartWidgetList;out.cwl=cwl?Object.keys(cwl).slice(0,10):null}catch(e){}
// layout widget
try{out.layout=wv._layoutWidget?Object.keys(wv._layoutWidget).slice(0,15):null}catch(e){}
// check how many paneWidgets
try{var pws=wv._chartWidget._paneWidgets;out.paneWidgetsKeys=Object.keys(pws);var arr=pws._value;out.paneCount=Array.isArray(arr)?arr.length:(arr&&typeof arr==='object'?Object.keys(arr).length:null)}catch(e){out.pwsErr=e.message}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
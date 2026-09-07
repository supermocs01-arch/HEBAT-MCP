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
var pc=s._graphics._primitivesCollection;
function deep(map,sub,label){
  try{
    var x=map.get(sub);
    out[label+'_type']=typeof x;
    if(x&&typeof x.get==='function'){
      var y=x.get(false);
      out[label+'_getType']=typeof y;
      if(y){out[label+'_getKeys']=Object.keys(y).slice(0,10);
        var m=y._primitivesDataById||y._items||y._primitives||y;
        out[label+'_count']=m?Object.keys(m).length:-1;
      }
    } else if(x){
      var m2=x._primitivesDataById||x._items||x;
      out[label+'_directCount']=m2?Object.keys(m2).length:-1;
    }
  }catch(e){out[label+'_err']=e.message}
}
deep(pc.dwglines,'lines','lines');
deep(pc.dwglabels,'labels','labels');
deep(pc.dwgboxes,'boxes','boxes');
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
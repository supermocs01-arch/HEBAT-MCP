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
var ss=pw._state._studySources;
out.keys=Object.keys(ss);
var arr=[];
for(var k in ss){
  var s=ss[k];
  var el={k:k,id:s._id,title:s._title,
    started:s._isStarted,status:s._status?s._status._value:null,
    compileErr:s._compileErrorStatus?s._compileErrorStatus._value:null,
    sourceLen:s._source?s._source.length:-1,
    err:s._lastPineError||s._runtimeError||(s._errorStatus?s._errorStatus._value:null)||null};
  var pc=s._graphics&&s._graphics._primitivesCollection;
  el.gfx={};
  if(pc){
    for(var g in pc){
      var c=pc[g];
      if(c&&typeof c.get==='function'){var sc=c.get(false);el.gfx[g]=sc&&sc._primitivesDataById?Object.keys(sc._primitivesDataById).length:-1}
      else if(c&&c._primitivesDataById){el.gfx[g]=Object.keys(c._primitivesDataById).length}
      else el.gfx[g]='no';
    }
  }
  // hibernation / pause
  el.hiber=s._isHibernated;
  el.paused=s._isPaused;
  el.visible=s._visible;
  arr.push(el);
}
out.studies=arr;
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
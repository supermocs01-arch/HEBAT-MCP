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
var pane=window.TradingViewApi._activeChartWidgetWV.value()._chartWidget._controlBarNavigation._targetPaneWidget;
var state=pane._state;
var s=state._studySources['4'];
var g=s._graphics;
var ix=g._indexes;
out.ixCtor=ix&&ix.constructor?ix.constructor.name:null;
out.ixKeys=ix&&ix._keys?ix._keys.length:null;
if(ix&&typeof ix.size==='number')out.ixSize=ix.size;
// try iterate
var samples=[];
try{
  var it=ix.values?ix.values():null;
  if(it){var c=0;var v=it.next();while(!v.done&&c<5){samples.push(typeof v.value);v=it.next();c++;}}
}catch(e){out.itErr=e.message}
out.samples=samples;
// primitivesCollection - check each with get
var pc=g._primitivesCollection;
var pcInfo={};
for(var k in pc){
  try{
    var coll=pc[k];
    if(coll&&typeof coll.get==='function'){
      var lm=coll.get(false);
      var m=lm&&(lm._primitivesDataById||lm._items||lm._dataById);
      var cnt=m&&typeof m==='object'?Object.keys(m).length:(m&&m.size!=null?m.size:0);
      pcInfo[k]=cnt;
    } else {pcInfo[k]='no-get'}
  }catch(e){pcInfo[k]='ERR'}
}
out.pcInfo=pcInfo;
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
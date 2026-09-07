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
// dump dwglines Map entries
var dl=pc.dwglines;
var keys=[];var vals=[];
try{
  var it=dl.keys();var v=it.next();
  while(!v.done&&keys.length<20){keys.push(String(v.value));v=it.next();}
}catch(e){out.keysErr=e.message}
out.dlKeys=keys;
try{
  var it2=dl.entries();var e2=it2.next();
  while(!e2.done&&vals.length<10){
    var val=e2.value[1];
    var rec={k:String(e2.value[0]),type:typeof val};
    if(val&&typeof val==='object'){rec.vKeys=Object.keys(val).slice(0,10);}
    vals.push(rec);
    e2=it2.next();
  }
}catch(e){out.entriesErr=e.message}
out.dlVals=vals;
// same for dwgboxes, dwglabels, dwgtables, dwgpolylines
var mapNames=['dwglabels','dwgboxes','dwgtables','dwgpolylines','dwgtablecells','dwglinefills','tpos','performance','logs'];
out.maps={};
for(var n=0;n<mapNames.length;n++){
  var m=pc[mapNames[n]];
  if(m&&typeof m==='object'){
    var rec={ctor:m.constructor?m.constructor.name:null,size:m.size!=null?m.size:null,keys:[]};
    try{var kIt=m.keys?m.keys():null;if(kIt){var kv=kIt.next();while(!kv.done&&rec.keys.length<8){rec.keys.push(String(kv.value));kv=kIt.next();}}}catch(e){}
    out.maps[mapNames[n]]=rec;
  }
}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
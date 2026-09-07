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
if(!pw){out.noPW=true;return JSON.stringify(out)}
var st=pw._state;
out.studyKeys=Object.keys(st._studySources);
var s=st._studySources['0'];
if(s){
  out.id0=String(s._id&&s._id._value);
  out.titleCache=JSON.stringify(s._titleInPartsCache).slice(0,150);
  out.isStarted=s._isStarted;
  out.status=s._status&&s._status._value?s._status._value.type:null;
  out.compileErr=JSON.stringify(s._compileErrorStatus&&s._compileErrorStatus._value).slice(0,80);
  var g=s._graphics;
  out.ixLen=g._indexes?g._indexes.length:0;
  out.hhistCount=Object.keys(g._hhistsByTimePointIndex||{}).length;
  var pc=g._primitivesCollection;
  var info={};
  for(var k in pc){var c=pc[k];if(c&&typeof c.get==='function'){try{var lm=c.get(false);var m=lm&&(lm._primitivesDataById||lm._items||lm);info[k]=m&&typeof m==='object'?Object.keys(m).length:0}catch(e){info[k]='E'}}else{info[k]='noget'}}
  out.pc=info;
}
// also check mainPaneWidget vs targetPaneWidget identity
var tgt=wv._controlBarNavigation._targetPaneWidget;
out.sameAsTarget= pw===tgt;
out.tgtIsMain=tgt._state._isMainPane&&tgt._state._isMainPane._value;
out.pwIsMain=pw._state._isMainPane&&pw._state._isMainPane._value;
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
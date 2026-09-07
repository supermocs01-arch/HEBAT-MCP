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
// legend items detailed
var li=s._legendView&&s._legendView._items;
out.legendCount=li?li.length:0;
if(li){
  var texts=[];
  for(var i=0;i<li.length;i++){
    var it=li[i];
    var rec={keys:Object.keys(it).slice(0,12)};
    try{rec.text=String(it._text&&it._text())}catch(e){}
    try{rec.title=String(it._title&&it._title())}catch(e){}
    try{rec.name=String(it._name)}catch(e){}
    try{rec.value=String(it._valueProvider&&it._valueProvider())}catch(e){}
    texts.push(rec);
  }
  out.legend=texts;
}
// graphics hhists structure
var g=s._graphics;
var hh=g._hhistsByTimePointIndex;
out.hhistType=typeof hh;
out.hhistCtor=hh&&hh.constructor?hh.constructor.name:null;
out.hhistKeys=Object.keys(hh||{}).slice(0,10);
out.hhistKeysLen=hh?Object.keys(hh).length:0;
// primitivesCollection dwglines Map internals
var pc=g._primitivesCollection;
var dl=pc.dwglines;
out.dlCtor=dl&&dl.constructor?dl.constructor.name:null;
try{out.dlSize=dl&&dl.size!=null?dl.size:null}catch(e){}
try{out.dlInternal=dl&&dl._internalData?Object.keys(dl._internalData).slice(0,8):null}catch(e){}
// check _graphics._indexes entries type via JSON of one
out.ix0=JSON.stringify(g._indexes&&g._indexes.slice(0,3));
// primitivesCollection hhists
try{var hc=pc.hhists;out.hcCtor=hc&&hc.constructor?hc.constructor.name:null;out.hcKeys=Object.keys(hc||{}).slice(0,8)}catch(e){}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
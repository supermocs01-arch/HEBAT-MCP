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
var chart=window.TradingViewApi._activeChartWidgetWV.value();
var s=chart.getStudyById('PTdIuB');
var src=s._study||s;
if(src._paneViews){
  out.pv=[];
  for(var i=2;i<5;i++){
    var pv=src._paneViews[i];
    var rn=pv._renderer;
    var info={i:i,ctor:pv.constructor.name};
    if(rn){
      info.rendCtor=rn.constructor.name;
      for(var k in rn){
        var v=rn[k];
        if(k==='_items'||/data|primit|entry/i.test(k)){
          if(v&&typeof v==='object'){
            info[k]=v.length!=null?v.length:(v.size!=null?v.size:(Array.isArray(v)?v.length:Object.keys(v).length));
          }
        }
      }
      if(rn._items&&rn._items.length!=null){var its=[];for(var j=0;j<Math.min(rn._items.length,6);j++){var it=rn._items[j];if(it&&typeof it==='object'){var pk=Object.keys(it).slice(0,12);var brief={};for(var p2=0;p2<pk.length;p2++){var val=it[pk[p2]];if(typeof val!=='object')brief[pk[p2]]=val}its.push(brief)}}info.itemsSample=its}
    }
    out.pv.push(info);
  }
}
var pw=chart._chartWidget._paneWidgets._value[0];
var s2=pw._state._studySources['0'];
out.visible2=s2._isVisible!=null?s2._isVisible:s2._visible;
out.legend=s2._legendView?s2._legendView._items.length:null;
var legDom=document.querySelectorAll('.tv-legend, [class*="legend"]');
out.legendDom=legDom.length;
var texts=[];
var all=[].slice.call(document.querySelectorAll('*'));
for(var z=0;z<all.length;z++){
  var el=all[z];
  var t=(el.childElementCount===0?el.textContent:'').trim();
  if(t&&/SMC|SWING|PATEN|BOS|PINE_DATA/.test(t)&&t.length<60){texts.push(t);if(texts.length>12)break}
}
out.domTexts=texts;
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
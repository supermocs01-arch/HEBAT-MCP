const http=require('http');
http.get('http://127.0.0.1:9222/json',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{
const t=JSON.parse(d).find(x=>x.url&&x.url.includes('/chart/'));
const ws=new (require('ws'))(t.webSocketDebuggerUrl);let id=1;
function send(m,p){return new Promise(r=>{const mid=id++;const h=raw=>{const j=JSON.parse(raw.toString());if(j.id===mid){ws.removeListener('message',h);r(j.result)}};ws.on('message',h);ws.send(JSON.stringify({id:mid,method:m,params:p||{}}))})}
ws.on('open',async()=>{
await send('Runtime.enable');
const r=await send('Runtime.evaluate',{expression:`(function(){
var out={};
var all=[].slice.call(document.querySelectorAll('div,span,a,button,li'));
var found=[];
for(var i=0;i<all.length;i++){
  var el=all[i];
  var t=(el.childElementCount===0?el.textContent:'').trim();
  if(t==='SMC SWING PATEN v1'||t==='Manual SNR RSI SMC Scalping + Target Profit Ray 1'){
    var r=el.getBoundingClientRect();
    var chain=[];var p=el;
    for(var j=0;j<5&&p;j++){chain.push(p.tagName+'.'+String(p.className).slice(0,30));p=p.parentElement}
    found.push({txt:t.slice(0,40),x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),chain:chain.join(' < ')});
  }
}
out.found=found;
var wv=window.TradingViewApi._activeChartWidgetWV.value();
var pw=wv._chartWidget._paneWidgets._value[0];
var ss=pw._state._studySources;
out.studyTitles=[];
for(var k in ss){
  var s=ss[k];
  var ttl=null;
  try{ttl=s._title||(s._chartState&&s._chartState._title)||null}catch(e){}
  if(!ttl&&s._titleCache)ttl=s._titleCache._value;
  out.studyTitles.push({k:k,id:s._id?s._id._value:null,title:ttl});
}
return JSON.stringify(out);
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
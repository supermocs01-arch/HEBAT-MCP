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
var cw=wv._chartWidget;
var coll=cw._chartWidgetCollection;
out.activeIndex=coll._activeIndex;
var defs=coll._chartWidgetsDefs;
out.defsType=typeof defs;
out.defsLen=defs&&defs.length!=null?defs.length:(defs&&typeof defs==='object'?Object.keys(defs).length:null);
try{out.defs=JSON.stringify(defs).slice(0,400)}catch(e){out.defsErr='circular'}
try{out.layoutType=coll._layoutType!=null?String(coll._layoutType):null}catch(e){}
try{out.activeChartWidget=coll._activeChartWidget?String(coll._activeChartWidget===cw):null}catch(e){}
// dom: does pane exist with legend? check any element with "SMC" text
var smc=[];
var all=document.querySelectorAll('*');
for(var i=0;i<all.length&&smc.length<5;i++){
  var el=all[i];
  if(el.children.length===0&&el.textContent&&el.textContent.indexOf('SMC')>=0){
    smc.push(el.tagName+':'+el.textContent.trim().slice(0,50));
  }
}
out.smcEls=smc;
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});
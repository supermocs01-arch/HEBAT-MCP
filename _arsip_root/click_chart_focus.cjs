const http=require('http');
http.get('http://127.0.0.1:9222/json',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{
const t=JSON.parse(d).find(x=>x.url&&x.url.includes('/chart/'));
const ws=new (require('ws'))(t.webSocketDebuggerUrl);let id=1;
function send(m,p){return new Promise(r=>{const mid=id++;const h=raw=>{const j=JSON.parse(raw.toString());if(j.id===mid){ws.removeListener('message',h);r(j.result)}};ws.on('message',h);ws.send(JSON.stringify({id:mid,method:m,params:p||{}}))})}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function e(x){const r=await send('Runtime.evaluate',{expression:x,returnByValue:true});return r.result&&r.result.value}
async function mouse(x,y,type){
  await send('Input.dispatchMouseEvent',{type:type,x:x,y:y,button:'left',clickCount:1});
}
ws.on('open',async()=>{
await send('Page.enable');await send('Runtime.enable');
// find chart canvas rect
const rect=await e(`(function(){
  var cv=document.querySelector('.chart-widget canvas');
  if(!cv)return null;
  var r=cv.getBoundingClientRect();
  return JSON.stringify({x:r.x,y:r.y,w:r.width,h:r.height});
})()`);
console.log('chart rect:',rect);
// click center of chart
if(rect){
  const r=JSON.parse(rect);
  await mouse(r.x+r.w/2, r.y+r.h/2, 'mousePressed');
  await sleep(150);
  await mouse(r.x+r.w/2, r.y+r.h/2, 'mouseReleased');
}
await sleep(3000);
// now check editor state and graphics
console.log('editors:',await e('document.querySelectorAll(".pine-editor-monaco").length'));
const g=await e(`(function(){
  var wv=window.TradingViewApi._activeChartWidgetWV.value();
  var pw=wv._chartWidget._paneWidgets._value[0];
  var s=pw._state._studySources['0'];
  var pc=s._graphics._primitivesCollection;
  function c(map,sub){try{var m=pc[map];var x=m&&m.get(sub);if(!x)return -2;var d=x._primitivesDataById||x._items||x;return Object.keys(d).length}catch(err){return 'E'}}
  var out={lines:c('dwglines','lines'),labels:c('dwglabels','labels'),boxes:c('dwgboxes','boxes')};
  out.status=s._status&&s._status._value?s._status._value.type:null;
  out.isStarted=s._isStarted;
  return JSON.stringify(out);
})()`);
console.log('graphics:',g);
      ws.close();
      process.exit(0);
    });
  });
});
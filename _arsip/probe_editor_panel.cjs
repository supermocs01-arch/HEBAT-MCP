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
out.hasApi=!!chart;
out.res=chart._chartWidget._resolution||chart._chartWidget._chartData||null;
var pw=chart._chartWidget._paneWidgets._value[0];
out.paneStateKeys=pw._state?Object.keys(pw._state).slice(0,12):null;
var paneEl=document.querySelector('.pane');
out.paneDom=!!paneEl;
out.editors=document.querySelectorAll('.monaco-editor.pine-editor-monaco').length;
var editorPanel=document.querySelector('.monaco-editor.pine-editor-monaco');
if(editorPanel){
  var root=editorPanel.closest('[class*=container]')||editorPanel.parentElement;
  var chain=[];
  var el=editorPanel;
  for(var i=0;i<4&&el;i++){chain.push(el.tagName+'.'+String(el.className).slice(0,40));el=el.parentElement}
  out.editorChain=chain;
  var closeBtns=[];
  var scope=root;
  if(scope){
    var bs=scope.querySelectorAll('button,[data-name],[aria-label]');
    for(var i2=0;i2<bs.length;i2++){
      var b=bs[i2];
      var lbl=(b.getAttribute('aria-label')||b.getAttribute('data-name')||b.getAttribute('title')||'').toString();
      if(/close|tutup|hide|×|x/i.test(lbl)){var rc=b.getBoundingClientRect();closeBtns.push({lbl:lbl.slice(0,40),x:Math.round(rc.x),y:Math.round(rc.y),w:Math.round(rc.width)})}
    }
  }
  out.closeBtnsInPanel=closeBtns.slice(0,10);
  var allIcons=document.querySelectorAll('[data-name="close"],[aria-label*="close" i],[aria-label*="tutup" i]');
  var icons=[];
  for(var j=0;j<allIcons.length;j++){var r2=allIcons[j].getBoundingClientRect();icons.push(allIcons[j].getAttribute('data-name')||allIcons[j].getAttribute('aria-label')+'@'+Math.round(r2.x)+','+Math.round(r2.y))}
  out.closeIcons=icons.slice(0,15);
}
out.toolbarBtns=[];
var tb=document.querySelectorAll('button[data-name]');
for(var k=0;k<Math.min(tb.length,60);k++){
  var dn=tb[k].getAttribute('data-name')||'';
  var tt=tb[k].getAttribute('title')||'';
  if(/pine|editor|source|indicator/i.test(dn+tt)){var r3=tb[k].getBoundingClientRect();out.toolbarBtns.push({dn:dn,tt:tt.slice(0,40),x:Math.round(r3.x),y:Math.round(r3.y)})}
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
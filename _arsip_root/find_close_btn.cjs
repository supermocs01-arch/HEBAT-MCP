const http=require('http');
http.get('http://127.0.0.1:9222/json',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{
const t=JSON.parse(d).find(x=>x.url&&x.url.includes('/chart/'));
const ws=new (require('ws'))(t.webSocketDebuggerUrl);let id=1;
function send(m,p){return new Promise(r=>{const mid=id++;const h=raw=>{const j=JSON.parse(raw.toString());if(j.id===mid){ws.removeListener('message',h);r(j.result)}};ws.on('message',h);ws.send(JSON.stringify({id:mid,method:m,params:p||{}}))})}
ws.on('open',async()=>{
await send('Runtime.enable');
const r=await send('Runtime.evaluate',{expression:`(function(){
var out={};
var btns=document.querySelectorAll('button');
var hits=[];
for(var i=0;i<btns.length;i++){
  var b=btns[i];
  var tt=(b.getAttribute('title')||'').trim();
  var txt=(b.textContent||'').trim().slice(0,20);
  var dn=b.getAttribute('data-name')||'';
  if(/pine/i.test(tt+dn+txt)||/close/i.test(tt+dn)||/editor/i.test(tt+dn)){
    var r=b.getBoundingClientRect();
    hits.push({i:i,title:tt.slice(0,40),dn:dn,txt:txt,cls:b.className.slice(0,40),x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width)});
  }
}
out.buttons=hits.slice(0,25);
// panel headers with close icon
var ic=document.querySelectorAll('[data-name="close"], [data-name="close-button"], .ui-close, [aria-label*="close" i]');
out.closeIcons=ic.length;
var icons=[];
for(var j=0;j<Math.min(ic.length,10);j++){
  var r2=ic[j].getBoundingClientRect();
  icons.push(ic[j].tagName+':'+ic[j].className.slice(0,30)+'@'+Math.round(r2.x)+','+Math.round(r2.y));
}
out.icons=icons;
return JSON.stringify(out);
})()`,returnByValue:true});
console.log(r.result.value);
      ws.close();
      process.exit(0);
    });
  });
});
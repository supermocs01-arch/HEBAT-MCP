const http=require('http');
http.get('http://127.0.0.1:9222/json',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{
const t=JSON.parse(d).find(x=>x.url&&x.url.includes('/chart/'));
const ws=new (require('ws'))(t.webSocketDebuggerUrl);let id=1;
function send(m,p){return new Promise(r=>{const mid=id++;const h=raw=>{const j=JSON.parse(raw.toString());if(j.id===mid){ws.removeListener('message',h);r(j.result)}};ws.on('message',h);ws.send(JSON.stringify({id:mid,method:m,params:p||{}}))})}
ws.on('open',async()=>{
await send('Runtime.enable');
const r=await send('Runtime.evaluate',{expression:`(function(){
var el=document.getElementById('smc_overlay');
if(!el)return JSON.stringify({exists:false});
var r=el.getBoundingClientRect();
return JSON.stringify({exists:true,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),title:(document.getElementById('smc_title')||{}).textContent,clock:(document.getElementById('smc_clock')||{}).textContent,vis:el.offsetParent!==null});
})()`,returnByValue:true});
console.log(r.result.value);
      ws.close();
      process.exit(0);
    });
  });
});
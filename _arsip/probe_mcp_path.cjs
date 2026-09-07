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
var studies=chart.getAllStudies();
out.nStudies=studies.length;
out.list=studies.map(function(s){return {name:s.name,id:s.id}});
var results=[];
for(var i=0;i<studies.length;i++){
  var s=studies[i];
  if((s.name||'').toLowerCase().indexOf('smc')===-1) continue;
  var st=chart.getStudyById(s.id);
  var src=st._study||st;
  out['srcKeys'+i]=src?Object.keys(src).slice(0,15):null;
  var g=src._graphics||(src._source&&src._source._graphics);
  out['hasG'+i]=!!g;
  if(g){
    var pc=g._primitivesCollection;
    var dg=pc&&pc.dwglabels;
    out['pc'+i]=pc?Object.keys(pc).length:null;
    out['dg'+i]=!!dg;
    if(dg){
      var lm=dg.get('labels');
      out['lm'+i]=!!lm;
      if(lm){
        var data=lm.get(false);
        out['data'+i]=!!data;
        if(data&&data._primitivesDataById){
          out['cnt'+i]=data._primitivesDataById.size!=null?data._primitivesDataById.size:Object.keys(data._primitivesDataById).length;
          var texts=[];
          data._primitivesDataById.forEach(function(l){
            texts.push(String(l.text||'').slice(0,50)+'@'+(l.points&&l.points[0]?l.points[0].price:'?'));
          });
          out['txt'+i]=texts.slice(0,15);
        }
      }
    }
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
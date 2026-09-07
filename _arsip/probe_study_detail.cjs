const http=require('http');
http.get('http://127.0.0.1:9222/json',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{
const t=JSON.parse(d).find(x=>x.url&&x.url.includes('/chart/'));
const ws=new (require('ws'))(t.webSocketDebuggerUrl);let id=1;
function send(m,p){return new Promise(r=>{const mid=id++;const h=raw=>{const j=JSON.parse(raw.toString());if(j.id===mid){ws.removeListener('message',h);r(j.result)}};ws.on('message',h);ws.send(JSON.stringify({id:mid,method:m,params:p||{}}))})}
ws.on('open',async()=>{
await send('Runtime.enable');
const r=await send('Runtime.evaluate',{expression:`(function(){
var api=window.TradingViewApi;var wv=api._activeChartWidgetWV.value();
var pane=wv._chartWidget._controlBarNavigation._targetPaneWidget;
var s=pane._state._studySources['4'];
var out={};
try{out.name=s._studyDescription&&s._studyDescription.title}catch(e){out.name='ERR'}
try{out.isStarted=s._isStarted}catch(e){out.isStarted='E'}
try{out.status=s._status._value}catch(e){out.status='E'}
try{out.compileErr=s._compileErrorStatus._value}catch(e){out.compileErr='E'}
try{out.graphHF=s._graphic._values?Object.keys(s._graphic._values).length:null}catch(e){out.graphHF='E'}
try{out.alive=s.alive===undefined?null:s.alive}catch(e){out.alive='E'}
try{out.pip=[s._pip,s._pipScale]}catch(e){out.pip='E'}
try{out.legendTitle=s._legend&&s._legend._title?''+s._legend._title:null}catch(e){out.legendTitle='E'}
return JSON.stringify(out);
})()`,returnByValue:true});
console.log(r.result.value);
      ws.close();
      process.exit(0);
    });
  });
});
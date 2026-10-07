// Run with Node.js: node regression.js. No browser, network, or packages required.
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
vm.runInThisContext(['engine.js','world.js','flight.js'].map(f=>fs.readFileSync(__dirname+'/'+f,'utf8')).join('\n'));
const results=[];function test(name,fn){try{let details=fn();results.push({name,status:'PASS',details});console.log('PASS',name,JSON.stringify(details||{}))}catch(e){results.push({name,status:'FAIL',error:e.message});console.error('FAIL',name,e.message)}}
const advance=(f,seconds,control={})=>{for(let i=0;i<Math.round(seconds*120);i++){f.step(1/120,control);if(f.crashed)break}};
for(const type of ['light','jet']){
 test(type+' takeoff and climb',()=>{let f=new Flight(type,'runway');f.power=1;let tookOff=false,at;
  for(let i=0;i<120*120;i++){let pitch=!tookOff&&f.ias>f.spec.vr&&f.pitch<8*DEG?.30:0;f.step(1/120,{pitch});if(!f.grounded&&!tookOff){tookOff=true;at={seconds:+f.t.toFixed(2),knots:+(f.ias*1.94384).toFixed(1),runwayZ:+f.p[2].toFixed(1)};f.toggleAP();f.ap.alt=350;f.ap.speed=f.spec.cruise;}if(tookOff&&f.agl>45){f.flaps=0;if(type==='jet')f.gear=false}if(f.crashed)break;}
  assert(tookOff,'Must leave ground');assert(!f.crashed,f.crashReason);assert(f.p[1]>290,'Must climb');assert(f.ias>f.spec.vr,'Must retain flyable airspeed');return {...at,finalAltitudeM:+f.p[1].toFixed(1)};
 });
 test(type+' autopilot altitude/speed/heading',()=>{let f=new Flight(type,'free');f.toggleAP();let desiredSpeed=f.ap.speed;f.ap.heading=45*DEG;advance(f,90);assert(!f.crashed);assert(Math.abs(f.p[1]-550)<12);assert(Math.abs(wrapAngle(f.yaw-45*DEG))<3*DEG);assert(Math.abs(f.ias-desiredSpeed)<3);return {altitudeErrorM:+(f.p[1]-550).toFixed(2),headingDeg:+(f.yaw/DEG).toFixed(2),speedErrorMps:+(f.ias-desiredSpeed).toFixed(2)}});
 test(type+' manual input disconnects autopilot',()=>{let f=new Flight(type,'free');f.toggleAP();f.step(1/120,{roll:.5});assert(!f.ap.on)});
 test(type+' stall uses angle of attack',()=>{let f=new Flight(type,'free');f.assist=false;f.pitch=.50;f.v=[0,0,f.spec.vr*.9];f.step(1/120,{});assert(f.stall);assert(f.alpha>f.spec.stallAlpha);return {angleDeg:+(f.alpha/DEG).toFixed(1)}});
 test(type+' terrain impact cannot pass through ground',()=>{let f=new Flight(type,'free');f.p=[0,30+f.spec.gearHeight+.01,0];f.v=[0,-14,20];f.step(1/120,{});assert(f.crashed);assert(f.p[1]>=30+f.spec.gearHeight-.01);return {reason:f.crashReason}});
 test(type+' landing and full stop',()=>{
  const f=new Flight(type,'landing'),s=f.spec,targetSpeed=type==='light'?35:74;let touched=false;
  // Synthetic test pilot, not shipped as an autoland feature. Follows a 3°-like path and flares.
  for(let i=0;i<120*250;i++){
   if(f.grounded){f.power=0;f.step(1/120,{brake:true});if(f.landingComplete)break;continue;}
   const speed=f.tas,q=.5*1.225*Math.exp(-f.p[1]/10000)*speed*speed*s.wing,flap=f.flapActual;
   const targetAlt=30+s.gearHeight+Math.max(0,-650-f.p[2])*.052;
   let vs=M.clamp((targetAlt-f.p[1])*.18-speed*.052,-5,2);
   if(f.agl<8)vs=-(type==='light'?.55:.80);
   const alpha=(s.mass*9.81/Math.max(1,q)-s.cl0-flap*.64)/s.slope;
   const pitchGoal=Math.atan2(vs,speed)+alpha;
   const cl=s.cl0+s.slope*f.alpha+flap*.64;
   const cd=s.cd+s.k*cl*cl+flap*.044+(type==='jet'?f.gearActual*.023:0);
   const factor=(type==='light'?(.5+.5/(1+speed/55)):Math.max(.4,1-speed/470))*Math.pow(Math.exp(-f.p[1]/10000),.65);
   f.power=M.clamp((q*cd+s.mass*9.81*vs/Math.max(speed,1))/(s.thrust*factor)+(targetSpeed-f.ias)*.06,0,1);
   if(f.agl<3)f.power=0;
   f.step(1/120,{pitch:M.clamp((pitchGoal-f.pitch)*5.2-f.pitchRate*1.4,-1,1),roll:0,yaw:0});
   if(f.touchdown)touched=true;if(f.crashed)break;
  }
  assert(!f.crashed,f.crashReason);assert(touched,'Must touch down');assert(f.landingComplete,'Must stop on runway');return {seconds:+f.t.toFixed(1),sinkFpm:Math.round(f.touchdown.sink*196.85),score:f.touchdown.score,z:+f.p[2].toFixed(1)};
 });
}
test('gear inhibited on ground; retracts in air',()=>{let f=new Flight('jet','runway');f.setGear();assert(f.gear);f=new Flight('jet','free');f.setGear();advance(f,5);assert(f.gearActual>.97);f.setGear();advance(f,5);assert(f.gearActual<.03)});
test('dual rudder cancels safely',()=>{let f=new Flight('light','free');advance(f,1,{yaw:0});assert(Math.abs(f.yaw)<.01)});
test('engine shutdown spools down',()=>{let f=new Flight('light','free');f.engine=false;advance(f,4);assert(f.spool<.001)});
test('turbulence is repeatable and finite',()=>{let a=new Flight('light','free','turbulent'),b=new Flight('light','free','turbulent');a.toggleAP();b.toggleAP();advance(a,30);for(let frame=0;frame<900;frame++)for(let step=0;step<4;step++)b.step(1/120,{});assert.deepStrictEqual(a.p,b.p);assert(a.p.every(Number.isFinite));assert(!a.crashed)});
test('approach corridor clears guide path',()=>{for(let z=-4500;z<=-1050;z+=50){let target=46+Math.max(0,-850-z)*.052;assert(World.height(0,z)<target-12,'Blocked at z='+z)}});
test('synthetic building collision',()=>{let f=new Flight('light','free');World.obstacles.push({x:0,z:f.p[2]+1,w:15,d:15,h:600});f.step(1/120,{});assert(f.crashed);World.obstacles.pop()});
const summary={passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,results};fs.writeFileSync(__dirname+'/physics_test_results.json',JSON.stringify(summary,null,2));console.log('SUMMARY',summary.passed,'passed,',summary.failed,'failed');if(summary.failed)process.exitCode=1;

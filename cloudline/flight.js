'use strict';
// Playable force-based approximation. These fictional aircraft are not training devices.
const AIRCRAFT={
 light:{name:'L-4 教练机',mass:1050,wing:16.2,thrust:2600,cl0:.28,slope:4.9,cd:.030,k:.055,vr:30,cruise:48,vne:83,gearHeight:1.35,pitchRate:.39,rollRate:.8,cruisePower:.48,stallAlpha:.27,span:10.8},
 a320:{name:'A320-216 · CFM56',mass:60000,wing:122.6,thrust:210000,cl0:.25,slope:5.1,cd:.024,k:.047,vr:74.5,cruise:128,vne:180,gearHeight:3.9,pitchRate:.17,rollRate:.35,cruisePower:.50,stallAlpha:.28,span:34.1},
 jet:{name:'J-120 双发客机',mass:41000,wing:112,thrust:145000,cl0:.25,slope:5.1,cd:.024,k:.047,vr:67,cruise:128,vne:181,gearHeight:3.9,pitchRate:.19,rollRate:.38,cruisePower:.41,stallAlpha:.28,span:33}
};
const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
class Flight {
 constructor(type='light',mode='free',weather='clear',assist=true){this.reset(type,mode,weather,assist)}
 reset(type=this.type,mode=this.mode,weather=this.weather,assist=this.assist){
  this.route=null;this.type=type;this.spec=AIRCRAFT[type];this.mode=mode;this.weather=weather;this.assist=assist;const s=this.spec;
  this.t=0;this.p=[0,30+s.gearHeight,-890];this.v=[0,0,0];this.yaw=0;this.pitch=0;this.bank=0;this.pitchRate=0;this.rollRate=0;this.power=0;this.spool=0;this.engine=true;this.flaps=mode==='runway'||mode==='lesson'?1:0;this.flapActual=this.flaps/3;this.gear=true;this.gearActual=1;this.brake=false;this.speedbrake=false;this.trim=0;this.fuel=85;this.grounded=true;this.wasAirborne=false;this.crashed=false;this.crashReason='';this.touchdown=null;this.landingComplete=false;this.gate=0;this.ap={on:false,alt:0,heading:0,speed:s.cruise,integral:s.cruisePower};this.alpha=0;this.ias=0;this.tas=0;this.gs=0;this.agl=0;this.load=1;this.stall=false;this.wind=[0,0,0];this.warnings=[];this.travel=0;this.events=[];this.prevP=this.p.slice();
  if(mode==='free'||mode==='landing'){
   const landing=mode==='landing',speed=landing?(type==='light'?35:74):s.cruise;
   this.p=[0,landing?232:550,landing?-4500:-300];this.v=[0,landing?-speed*.047:0,speed];this.grounded=false;this.wasAirborne=true;this.flaps=landing?2:0;this.flapActual=this.flaps/3;this.gear=type==='light'||landing;this.gearActual=this.gear?1:0;this.power=landing?(type==='light'?.39:.25):s.cruisePower;this.spool=this.power;
   let q=.5*1.225*Math.exp(-this.p[1]/10000)*speed*speed*s.wing;let a=(s.mass*9.81/q-s.cl0-this.flapActual*.64)/s.slope;this.pitch=a+Math.atan2(this.v[1],speed);
  }
  this.refresh();return this;
 }
 emit(type,data={}){this.events.push({type,...data});if(this.events.length>16)this.events.shift()}
 refresh(){this.gs=Math.hypot(this.v[0],this.v[2]);this.tas=M.len(M.sub(this.v,this.wind));this.ias=this.tas*Math.sqrt(Math.exp(-this.p[1]/10000));this.agl=Math.max(0,this.p[1]-World.ground(this.p[0],this.p[2])-this.spec.gearHeight)}
 toggleAP(){if(this.grounded||this.crashed){this.emit('notice',{text:'离地后才可接通自动驾驶'});return}this.ap.on=!this.ap.on;if(this.ap.on){this.ap.alt=this.p[1];this.ap.heading=this.yaw;this.ap.speed=this.ias;this.ap.integral=this.power;this.emit('notice',{text:'自动驾驶：保持当前高度、航向和空速'})}else this.emit('notice',{text:'自动驾驶已断开'})}
 setGear(){if(this.type==='light'){this.emit('notice',{text:'教练机使用固定起落架，无需收放'});return}if(this.grounded){this.emit('notice',{text:'地面不能收起落架'});return}this.gear=!this.gear;this.emit('notice',{text:this.gear?'起落架正在放下':'起落架正在收起'})}
 crash(reason){if(this.crashed)return;this.crashed=true;this.ap.on=false;this.power=0;this.crashReason=reason;this.emit('crash',{reason})}
 step(dt,raw={pitch:0,roll:0,yaw:0,brake:false}){
  if(this.crashed)return;const s=this.spec;this.t+=dt;this.prevP=this.p.slice();let inp={pitch:raw.pitch||0,roll:raw.roll||0,yaw:raw.yaw||0,brake:!!raw.brake};
  const rho=1.225*Math.exp(-Math.max(0,this.p[1])/10000);
  if(this.weather==='clear')this.wind=[0,0,0];else if(this.weather==='breeze')this.wind=[3.3,0,-1.6];else{let a=M.smooth(3,35,this.agl);this.wind=[4+Math.sin(this.t*.43)*1.9,(Math.sin(this.t*1.73)+.36*Math.sin(this.t*3.61))*1.35*a,-1+Math.sin(this.t*.69)]}
  this.flapActual=M.mix(this.flapActual,this.flaps/3,Math.min(dt*.9,1));this.gearActual=M.mix(this.gearActual,this.gear?1:0,Math.min(dt*.8,1));
  let air=M.sub(this.v,this.wind),speed=Math.max(.1,M.len(air)),q=.5*rho*speed*speed*s.wing;
  let b=M.basis(this.yaw,this.pitch,this.bank),fwd=Math.max(.05,M.dot(air,b.f)),upAir=M.dot(air,b.u);this.alpha=Math.atan2(-upAir,fwd);
  let flap=this.flapActual,reqAlpha=(s.mass*9.81/(Math.max(q,500)*Math.max(.45,Math.cos(this.bank)))-s.cl0-flap*.64)/s.slope;
  if(this.ap.on){
   if(Math.abs(inp.pitch)>.22||Math.abs(inp.roll)>.22){this.ap.on=false;this.emit('notice',{text:'检测到手动操纵，自动驾驶已断开'})}
   else{let desiredVS=M.clamp((this.ap.alt-this.p[1])*.12,-(this.type!=='light'?9:5),(this.type!=='light'?9:5));let energyClimbLimit=Math.max(0,(this.ias-s.vr*1.03)*.40);desiredVS=Math.min(desiredVS,energyClimbLimit);let desiredPitch=Math.atan2(desiredVS,speed)+M.clamp(reqAlpha,-.05,.20);
    inp.pitch=M.clamp((desiredPitch-this.pitch)*5.2-this.pitchRate*1.4,-1,1);
    let targetBank=M.clamp(wrapAngle(this.ap.heading-this.yaw)*1.5,-25*DEG,25*DEG);inp.roll=M.clamp((targetBank-this.bank)*3-this.rollRate,-1,1);
    const e=this.ap.speed-this.ias;this.ap.integral=M.clamp(this.ap.integral+e*dt*.003,0,1);this.power=M.clamp(this.ap.integral+e*.035,0,1);
   }
  }
  this.spool=M.mix(this.spool,this.engine&&this.fuel>0?this.power:0,Math.min(dt*(this.type!=='light'?.6:2.4),1));
  this.fuel=Math.max(0,this.fuel-dt*this.spool*(this.type!=='light'?.0045:.0022));
  const thrust=s.thrust*this.spool*(this.type==='light'?( .50+.50/(1+speed/55)):Math.max(.4,1-speed/470))*Math.pow(rho/1.225,.65);
  if(this.grounded){
   let along=Math.max(0,this.v[0]*Math.sin(this.yaw)+this.v[2]*Math.cos(this.yaw));this.yaw+=(inp.yaw+inp.roll*.48)*.58*along/(along+10)*dt;
   let effectiveness=M.clamp(speed/s.vr,0,1.4);this.pitch+=inp.pitch*s.pitchRate*.65*effectiveness*dt;if(Math.abs(inp.pitch)<.05)this.pitch*=Math.exp(-dt*.7);this.pitch=M.clamp(this.pitch,-1*DEG,(this.type!=='light'?12:14)*DEG);this.bank*=Math.exp(-dt*6);this.pitchRate=0;this.rollRate=0;
   this.alpha=this.pitch;let cl=s.cl0+s.slope*this.alpha+flap*.64;let drag=q*(s.cd+s.k*cl*cl+flap*.035+(this.speedbrake?.09:0));let resistance=(inp.brake||this.brake?7.8:.24)+((World.paved||World.runway)(this.p[0],this.p[2])?0:1.2);
   along=Math.max(0,along+(thrust-drag)/s.mass*dt-resistance*dt);this.v=[Math.sin(this.yaw)*along,0,Math.cos(this.yaw)*along];this.p=M.add(this.p,M.mul(this.v,dt));this.p[1]=World.ground(this.p[0],this.p[2])+s.gearHeight;
   let lift=q*cl;
   if(lift>s.mass*9.81*1.025&&this.pitch>3.5*DEG&&speed>s.vr*.83){this.grounded=false;this.wasAirborne=true;this.v[1]=.5;this.p[1]+=.06;this.emit('takeoff')}
   if(this.touchdown&&along<2.5&&!this.landingComplete){this.landingComplete=true;this.emit('landed',{...this.touchdown})}
   if(World.height(this.p[0],this.p[2])<=0&&along>3)this.crash('驶入海面。重新开始练习。');
  }else{
   let effect=M.clamp(speed/(s.vr*1.25),.25,1.7),pitchCmd=inp.pitch*s.pitchRate*effect,rollCmd=inp.roll*s.rollRate*effect;
   if(!this.ap.on){
    if(this.assist){if(Math.abs(inp.pitch)<.06)pitchCmd+=(M.clamp(reqAlpha,-.08,.20)+this.trim-this.alpha)*.66;if(Math.abs(inp.roll)<.06)rollCmd-=this.bank*.35;}
    else if(Math.abs(inp.pitch)<.05){let ref=(s.mass*9.81/(.5*1.225*s.cruise*s.cruise*s.wing)-s.cl0)/s.slope;pitchCmd+=(ref+this.trim-this.alpha)*.25}
   }
   this.pitchRate=M.mix(this.pitchRate,pitchCmd,Math.min(dt*4.5,1));this.rollRate=M.mix(this.rollRate,rollCmd,Math.min(dt*4,1));this.pitch+=this.pitchRate*dt;this.bank+=this.rollRate*dt;
   if(this.weather==='turbulent'){this.bank+=Math.sin(this.t*3.1)*.022*dt;this.pitch+=Math.sin(this.t*4.4)*.008*dt}
   this.bank=M.clamp(this.bank,-(this.assist?58:86)*DEG,(this.assist?58:86)*DEG);this.pitch=M.clamp(this.pitch,-(this.assist?35:72)*DEG,(this.assist?35:72)*DEG);
   const sideAngle=Math.atan2(M.dot(air,b.r),fwd);this.yaw+=((9.81*Math.tan(M.clamp(this.bank,-1.2,1.2))/Math.max(speed,15))+inp.yaw*.20+sideAngle*.23)*dt;this.yaw=wrapAngle(this.yaw);b=M.basis(this.yaw,this.pitch,this.bank);
   fwd=Math.max(.01,M.dot(air,b.f));this.alpha=Math.atan2(-M.dot(air,b.u),fwd);let cl=s.cl0+s.slope*this.alpha+flap*.64;let stallLoss=1-.82*M.smooth(s.stallAlpha,s.stallAlpha+.38,Math.abs(this.alpha));cl=M.clamp(cl,-2.2,2.4)*stallLoss;
   this.stall=this.alpha>s.stallAlpha||this.alpha<-.25;let extraDrag=M.smooth(s.stallAlpha,s.stallAlpha+.4,Math.abs(this.alpha))*.22;
   let cd=s.cd+s.k*cl*cl+flap*.044+(this.type!=='light'?this.gearActual*.023:0)+(this.speedbrake?.095:0)+extraDrag;
   let dir=M.norm(air),liftDir=M.norm(M.sub(b.u,M.mul(dir,M.dot(b.u,dir))));let lift=q*cl,drag=q*cd;this.load=lift/(s.mass*9.81);
   let accel=M.add(M.mul(b.f,thrust/s.mass),M.add(M.mul(liftDir,lift/s.mass),M.mul(dir,-drag/s.mass)));accel[1]-=9.81;
   let sideVel=M.dot(air,b.r);accel=M.add(accel,M.mul(b.r,-sideVel*.45));this.v=M.add(this.v,M.mul(accel,dt));this.p=M.add(this.p,M.mul(this.v,dt));
   if(this.stall){this.pitch-=M.smooth(s.stallAlpha,s.stallAlpha+.25,this.alpha)*.075*dt}
   const ground=World.ground(this.p[0],this.p[2]),contact=ground+s.gearHeight;
   if(this.p[1]<=contact){
    const sink=Math.max(0,-this.v[1]),bank=Math.abs(this.bank/DEG),hdg=Math.min(Math.abs(wrapAngle(this.yaw)),Math.abs(wrapAngle(this.yaw-Math.PI)))/DEG;
    this.p[1]=contact;
    if(World.height(this.p[0],this.p[2])<=0)this.crash('接触海面。下次先对正跑道，再开始下降。');
    else if(this.gearActual<.94)this.crash('起落架尚未放妥，无法安全接地。');
    else if(sink>(this.type!=='light'?4.0:4.8))this.crash('下降率过大。接地前应逐步减小下降率。');
    else if(bank>(this.type!=='light'?9:14))this.crash('机翼倾斜过大。接地前保持机翼接近平。');
    else if(this.pitch< -5*DEG||this.pitch>18*DEG)this.crash('接地姿态超出范围。');
    else if(!World.runway(this.p[0],this.p[2])&&this.gs>9)this.crash('在跑道外接地。对准标线后重新进近。');
    else if(hdg>25&&this.gs>10)this.crash('接地时未对正跑道方向。');
    else{this.grounded=true;this.bank=0;this.v[1]=0;this.ap.on=false;let score=Math.round(M.clamp(100-sink*11-bank*2-Math.abs(this.p[0])*.5-hdg,0,100));this.touchdown={sink,score,offset:Math.abs(this.p[0])};this.emit('touchdown',{...this.touchdown})}
   }
   for(let o of World.obstacles)if(Math.abs(this.p[0]-o.x)<o.w+1&&Math.abs(this.p[2]-o.z)<o.d+1&&this.p[1]<o.h+1&&this.p[1]>World.ground(o.x,o.z)){this.crash('碰到机场建筑或障碍物。');break}
  }
  this.lastBrake=inp.brake;for(let o of World.obstacles)if(Math.abs(this.p[0]-o.x)<o.w+2&&Math.abs(this.p[2]-o.z)<o.d+3&&this.p[1]<o.h+1){this.crash('碰到机场建筑或障碍物。');break}
  this.refresh();this.travel+=this.gs*dt;
  if(this.mode==='lesson'&&this.gate<World.gates.length){let g=World.gates[this.gate];if(M.len(M.sub(this.p,[g.x,g.y,g.z]))<g.r){this.gate++;this.emit('gate',{index:this.gate})}}
  this.warnings=[];
  if(this.stall&&!this.grounded)this.warnings.push('失速 · 减小迎角');if(this.ias>s.vne)this.warnings.push('超速 · 减小动力');if(this.flaps>0&&this.ias>s.vr*1.7)this.warnings.push('襟翼超速');if(this.agl<65&&this.v[1]<-2.5&&!this.grounded&&(Math.abs(this.p[0])>90||this.p[2]>1200))this.warnings.push('地形接近');if(this.agl<160&&!this.gear&&!this.grounded&&this.v[1]<-1)this.warnings.push('检查起落架');if(!this.route&&Math.hypot(this.p[0],this.p[2])>12500)this.warnings.push('接近地图边界 · 请返航');
  if(!this.p.every(Number.isFinite)||!this.v.every(Number.isFinite))this.crash('仿真状态异常，请重新开始。');
 }
}

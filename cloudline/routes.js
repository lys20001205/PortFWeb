'use strict';
// All airport geometry and flight procedures below are game approximations.
// Coordinates describe runway-relative local scenes, not an operational navigation database.
const ROUTE_DATA={id:'bki-can',name:'BKI → CAN T3',aircraft:'A320-216',origin:{iata:'BKI',icao:'WBKK',lat:5.9372,lon:116.0512},destination:{iata:'CAN',icao:'ZGGG',lat:23.3924,lon:113.299},version:'1.2.0',sources:[
 ['A320 family dimensions','https://www.aircraft.airbus.com/en/aircraft/a320-family/a320ceo'],
 ['A320-216 / CFM56 designation','https://www.easa.europa.eu/en/document-library/easy-access-rules/online-publications/easy-access-rules-continuing-airworthiness?erules-id=ERULES-1963177438-667'],
 ['BKI aerodrome information','https://aip.caam.gov.my/aip/eAIP/2026-02-19-AIRAC/html/eAIP/WM-AD-2.WBKK-en-MS.html'],
 ['AirAsia CAN Terminal 3','https://support.airasia.com/s/article/Guangzhou-Terminal-Change-CAN']
]};
function routeDistance(a,b){const dlat=(b.lat-a.lat)*DEG,dlon=(b.lon-a.lon)*DEG,h=Math.sin(dlat/2)**2+Math.cos(a.lat*DEG)*Math.cos(b.lat*DEG)*Math.sin(dlon/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))}
ROUTE_DATA.distance=routeDistance(ROUTE_DATA.origin,ROUTE_DATA.destination);
const AirportScenes=(()=>{
 const original={height:World.height,ground:World.ground,runway:World.runway,build:World.build};
 const profiles={island:{name:'岛屿 01',length:2100,elevation:30,heading:0,runway:'36 / 18'},bki:{name:'亚庇 BKI',length:3780,elevation:3,heading:20,runway:'02 / 20'},can:{name:'广州 CAN · T3',length:3600,elevation:15,heading:10,runway:'01 / 19 · 场景假设'},sea:{name:'南海 · 巡航场景',length:0,elevation:0,heading:0,runway:'无跑道'}};
 let key='island',labels=[];
 function height(x,z){if(key==='island')return original.height(x,z);if(key==='sea')return -80;
  if(key==='can'){let hills=160*Math.exp(-(((x-7500)/1700)**2+((z-6000)/2500)**2));return 15+hills;}
  let shore=3-100*(1-M.smooth(-450,-70,x));let mountain=1050*Math.exp(-(((x-6200)/2300)**2+((z-4500)/4200)**2));return shore+mountain;
 }
 function runway(x,z){if(key==='island')return original.runway(x,z);return key!=='sea'&&Math.abs(x)<22.5&&Math.abs(z)<profiles[key].length/2;}
 function paved(x,z){if(runway(x,z))return true;if(key==='island')return (Math.abs(x-92)<14&&Math.abs(z)<1040)||(x>25&&x<215&&z>-700&&z<-240)||([-890,-480,250,920].some(v=>Math.abs(z-v)<14)&&x>=15&&x<107);
  if(key==='sea')return false;return Math.abs(x-115)<35&&Math.abs(z)<1800||x>=-25&&x<=150&&[900,-1400,-500].some(v=>Math.abs(z-v)<42)||x>=95&&x<440&&z>-770&&z<-110;
 }
 function select(next){if(!profiles[next])throw Error('Unknown airport scene');key=next;labels=[];World.obstacles.length=0;World.profile=profiles[key];World.scene=key;World.height=height;World.ground=(x,z)=>Math.max(0,height(x,z));World.runway=runway;World.paved=paved;World.labels=labels;}
 function build(engine){if(key==='island')return original.build(engine);let terrain=new Geometry(),sea=new Geometry(),airport=new Geometry(),markings=new Geometry(),structures=new Geometry(),foliage=new Geometry(),lights=new Geometry(),clouds=new Geometry(),R=seeded(key==='bki'?210:320),p=profiles[key],E=27000,N=106,S=2*E/N;
  sea.quad([-60000,-.25,-60000],[-60000,-.25,60000],[60000,-.25,60000],[60000,-.25,-60000],[.05,.30,.39]);
  if(key!=='sea')for(let j=0;j<N;j++)for(let i=0;i<N;i++){let x=-E+i*S,z=-E+j*S,A=[x,height(x,z),z],B=[x+S,height(x+S,z),z],C=[x+S,height(x+S,z+S),z+S],D=[x,height(x,z+S),z+S],h=(A[1]+C[1])*.5,col=h<5?[.57,.61,.38]:[.30+R()*.035,.44+R()*.05,.30];terrain.quad(A,D,C,B,col);}
  const base=p.elevation,white=[.93,.93,.86],yellow=[.95,.76,.25],runwayTop=base+.16,markTop=base+.23;
  function slab(x,z,w,d,c){airport.box(x,runwayTop,z,w,.12,d,c||[.23,.27,.29])}
  function line(x,z,w,d,c=yellow){markings.box(x,markTop,z,w,.04,d,c)}
  function building(x,z,w,d,h,c){structures.box(x,base+h/2,z,w,h,d,c);structures.box(x,base+h,z,w+3,1.8,d+3,[.83,.85,.80]);World.obstacles.push({x,z,w:w/2,d:d/2,h:base+h});}
  if(key!=='sea'){
   // Flat airport slab eliminates coarse-terrain / taxiway discontinuities.
   slab(0,0,100,p.length+180,[.35,.42,.32]);slab(0,0,45,p.length,[.17,.20,.22]);slab(115,0,64,p.length-120);slab(267,-440,345,660,[.34,.38,.38]);
   for(let z of [900,-1400,-500]){slab(60,z,170,80);line(62,z,120,.8)}line(115,0,.8,p.length-160);
   for(let z=-p.length/2+60;z<p.length/2;z+=64)line(0,z,1.4,31,white);
   for(let x of [-21,21])line(x,0,.7,p.length-40,white);
   for(let sign of [-1,1]){let z=sign*(p.length/2-48);for(let x of [-17,-12,-7,7,12,17])line(x,z,2.8,34,white);for(let x of [-14,14])line(x,sign*(p.length/2-290),5.5,48,white)}
   const digits={'0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['111','001','111','100','111'],'9':['111','101','111','001','111']};
   function number(t,z,flip){for(let k=0;k<2;k++)for(let j=0;j<5;j++)for(let i=0;i<3;i++)if(digits[t[k]][j][i]==='1')line(((k-.5)*10+(i-1)*2.2)*(flip?-1:1),z+(2-j)*3.5*(flip?-1:1),2,3.2,white)}
   number(key==='bki'?'02':'01',-p.length/2+120,false);number(key==='bki'?'20':'19',p.length/2-120,true);
   for(let z=-p.length/2+15;z<p.length/2;z+=55)for(let x of [-26,26])lights.ellipsoid(x,base+.8,z,.8,.4,.8,[1,.88,.61],6,3);
   for(let x=-21;x<=21;x+=7)lights.box(x,base+.6,-p.length/2,1,.5,1,[.13,1,.47]);
   for(let z=-p.length/2-60;z>-p.length/2-720;z-=65)lights.box(0,base+.9,z,1.3,.6,1.3,[1,.84,.53]);
   line(184,-440,138,1);line(245,-440,2,32);line(245,-440,32,2,[.30,1,.65]);
   if(key==='can'){
    building(500,-440,200,460,23,[.20,.36,.41]);
    // Procedural curved, petal-like T3-inspired roof; not a survey reconstruction.
    for(let z=-640;z<=-240;z+=40)structures.ellipsoid(500,base+23,z,113,7.5,32,[.89,.89,.84],12,5);
    for(let z of [-600,-280]){building(405,z,175,45,11,[.67,.70,.68]);structures.box(365,base+6,z,70,4,12,[.48,.61,.62]);}
    labels.push({p:[500,base+50,-440],title:'广州白云 CAN · T3',sub:'航站楼 / 简化布局'},{p:[245,base+8,-440],title:'SIM-T3',sub:'模拟机位 · 停稳并刹车'});
    // Distant parallel runway and airport buildings are visual context only.
    slab(-2400,450,45,3600,[.20,.24,.24]);for(let z=-1200;z<2000;z+=90)line(-2400,z,1.2,35,white);
   }else{
    building(405,-440,135,440,16,[.67,.71,.68]);for(let z=-620;z<=-260;z+=60){structures.box(405,base+19,z,147,4,45,[.90,.88,.77]);structures.box(321,base+6,z,34,7,10,[.52,.59,.59]);}
    labels.push({p:[405,base+42,-440],title:'KOTA KINABALU · BKI',sub:'亚庇国际机场 / 简化场景'});
   }
   building(440,230,20,20,40,[.73,.76,.72]);structures.box(440,base+43,230,33,9,32,[.16,.29,.35]);
   for(let i=0;i<110;i++){let x=800+R()*4400,z=(R()-.5)*14000,w=15+R()*28,d=14+R()*22,h=8+R()*(key==='can'?90:40);let y=height(x,z);structures.box(x,y+h/2,z,w,h,d,[.50+R()*.17,.55+R()*.14,.55]);}
   for(let i=0;i<780;i++){let x=650+R()*9300,z=(R()-.5)*20000,y=height(x,z);foliage.cone(x,y,z,4+R()*3,12+R()*12,[.16,.30+R()*.06,.20],5);}
  }
  for(let i=0;i<40;i++){let x=(R()-.5)*38000,z=(R()-.5)*38000,y=key==='sea'?2200+R()*4400:1800+R()*1700;for(let j=0;j<3;j++)clouds.ellipsoid(x+j*180,y+j*20,z,300,100,240,[.91,.92,.91],8,4);}
  let ring=new Geometry().ring(0,0,0,1,.026,[.44,.95,.73],40),shadow=new Geometry();for(let i=0;i<20;i++){let a=i*Math.PI/10,b=(i+1)*Math.PI/10;shadow.tri([0,0,0],[Math.cos(b),0,Math.sin(b)],[Math.cos(a),0,Math.sin(a)],[.04,.06,.06]);}
  let result={};for(let [name,g]of Object.entries({terrain,sea,airport,markings,structures,foliage,lights,clouds,ring,shadow}))result[name]=engine.mesh(g);return result;
 }
 World.build=build;select('island');return {select,profiles,get key(){return key}};
})();
class RouteMission{
 constructor(start='bki_can'){this.phase='takeoff';this.scene='bki';this.guide=false;this.progress=0;this.elapsed=0;this.phaseTime=0;this.cruiseRate=128;this.cruiseDistance=0;this.skips=0;this.taxiIndex=0;this.finished=false;this.log=[];this.startMode=start;this.transfer=start==='can_approach'?'approach':start==='can_taxi'?'taxi':'takeoff';}
 configure(f,phase){const s=f.spec;this.phase=phase;this.phaseTime=0;this.transfer=null;this.scene=phase==='cruise'?'sea':['descent','approach','rollout','taxi','parked'].includes(phase)?'can':'bki';AirportScenes.select(this.scene);f.route=this;f.mode=this.startMode;
  f.ap.on=false;f.crashed=false;f.landingComplete=false;f.crashReason='';f.events=[];f.bank=0;f.yaw=0;f.pitchRate=0;f.rollRate=0;f.trim=0;f.speedbrake=false;f.brake=false;f.touchdown=null;f.engine=true;
  const y=World.profile.elevation,g=y+s.gearHeight;
  if(phase==='takeoff'){f.p=[0,g,-1720];f.v=[0,0,0];f.pitch=0;f.power=f.spool=0;f.flaps=1;f.gear=true;f.grounded=true;f.wasAirborne=false;this.progress=0;}
  else if(phase==='taxi'){f.p=[0,g,100];f.v=[0,0,0];f.pitch=0;f.power=f.spool=0;f.flaps=0;f.gear=true;f.grounded=true;f.wasAirborne=true;f.touchdown={sink:0,score:0,offset:0,practice:true};this.progress=.99;this.taxiIndex=0;}
  else{let cruise=phase==='cruise',descent=phase==='descent',z=cruise?0:descent?-21500:-7500,alt=cruise?10363:descent?1100:g+(-1200-z)*.052,ias=cruise?135:descent?95:78;
   let tas=ias/Math.sqrt(Math.exp(-alt/10000));f.p=[0,alt,z];f.v=[0,cruise?0:-tas*.052,tas];f.power=cruise?.65:descent?.31:.40;f.spool=f.power;f.flaps=cruise?0:descent?1:2;f.gear=!cruise&&!descent;f.grounded=false;f.wasAirborne=true;
   const q=.5*1.225*ias*ias*s.wing;f.pitch=Math.atan2(f.v[1],tas)+(s.mass*9.81/q-s.cl0-f.flaps/3*.64)/s.slope;this.progress=cruise?.10:descent?.92:.97;
   if(cruise){this.cruiseDistance=0;f.ap.on=true;f.ap.alt=alt;f.ap.heading=0;f.ap.speed=ias;f.ap.integral=f.power;}
  }
  f.flapActual=f.flaps/3;f.gearActual=f.gear?1:0;f.refresh();f.prevP=f.p.slice();this.log.push({phase,t:Math.round(this.elapsed)});
 }
 get phaseName(){return {takeoff:'亚庇滑跑',climb:'离场爬升',cruise:'南海巡航',descent:'广州下降',approach:'稳定进近',rollout:'着陆减速',taxi:'滑行至 T3',parked:'T3 停机完成'}[this.phase]}
 get taxiPoints(){return [[0,900],[115,900],[115,-440],[245,-440]]}
 requestNext(f){if(f.crashed||this.finished)return false;if(this.phase==='takeoff'||this.phase==='climb'){this.transfer='cruise'}else if(this.phase==='cruise'){this.transfer='descent'}else if(this.phase==='descent'){this.transfer='approach'}else if(this.phase==='approach'){this.transfer='approach'}else return false;this.skips++;return true;}
 cancelGuide(f){if(this.guide){this.guide=false;f.ap.on=false;f.emit('notice',{text:'已接管：教学领航断开'});}}
 guideInput(f,raw,dt){let inp={...raw};if(!this.guide)return inp;if(Math.abs(raw.pitch||0)>.15||Math.abs(raw.roll||0)>.15||Math.abs(raw.yaw||0)>.15||raw.brake){this.cancelGuide(f);return inp;}const s=f.spec;f.ap.on=false;inp={pitch:0,roll:0,yaw:0,brake:false};
  if(this.phase==='takeoff'){f.power=1;f.flaps=1;f.gear=true;inp.yaw=M.clamp(-f.yaw*3-f.p[0]*.02,-1,1);if(f.ias>s.vr)inp.pitch=M.clamp((.145-f.pitch)*2,-.4,.40);return inp;}
  if(this.phase==='rollout'){f.power=0;f.speedbrake=true;inp.brake=true;inp.yaw=M.clamp(-f.yaw*3-f.p[0]*.02,-1,1);return inp;}
  if(this.phase==='taxi'){
   f.flaps=0;f.speedbrake=false;let target=this.taxiPoints[this.taxiIndex],dx=target[0]-f.p[0],dz=target[1]-f.p[2],distance=Math.hypot(dx,dz),err=wrapAngle(Math.atan2(dx,dz)-f.yaw),last=this.taxiIndex===this.taxiPoints.length-1;
   if(!last&&distance<22){this.taxiIndex++;return inp;}
   let desired=last?M.clamp(distance*.13,0,4):Math.abs(err)>.3?3.5:6;
   if(last&&distance<9){f.power=0;inp.brake=true;return inp;}
   f.power=M.clamp(.078+(desired-f.gs)*.075,0,.30);inp.brake=f.gs>desired+.65;inp.yaw=M.clamp(err*2.4,-1,1);return inp;
  }
  if(this.phase==='parked'){f.power=0;inp.brake=true;return inp;}
  let ias=122,vs=7,desiredYaw=0;
  if(this.phase==='climb'){ias=115;vs=M.clamp((1450-f.p[1])*.08,0,9);vs=Math.min(vs,Math.max(1,(f.ias-s.vr)*.45));if(f.agl>120){f.flaps=0;f.gear=false;}}
  if(this.phase==='cruise'){ias=135;vs=M.clamp((10363-f.p[1])*.10,-5,5);f.flaps=0;f.gear=false;}
  if(this.phase==='descent'||this.phase==='approach'){
   let target=World.profile.elevation+s.gearHeight+Math.max(0,-1200-f.p[2])*.052;
   ias=this.phase==='descent'?95:78;f.flaps=this.phase==='descent'?1:2;f.gear=this.phase==='approach';
   vs=M.clamp((target-f.p[1])*.18-f.tas*.052,-8,2);if(f.agl<9)vs=-.8;
   desiredYaw=M.clamp(-f.p[0]*.00035,-.12,.12);
  }
  const speed=Math.max(20,f.tas),q=.5*1.225*Math.exp(-f.p[1]/10000)*speed*speed*s.wing;
  const alpha=(s.mass*9.81/Math.max(1,q)-s.cl0-f.flapActual*.64)/s.slope,pitchGoal=Math.atan2(vs,speed)+alpha;
  inp.pitch=M.clamp((pitchGoal-f.pitch)*5.2-f.pitchRate*1.4,-1,1);let targetBank=M.clamp(wrapAngle(desiredYaw-f.yaw)*1.5,-.28,.28);inp.roll=M.clamp((targetBank-f.bank)*3-f.rollRate,-1,1);
  let cl=s.cl0+s.slope*f.alpha+f.flapActual*.64,cd=s.cd+s.k*cl*cl+f.flapActual*.044+f.gearActual*.023+(f.speedbrake?.095:0),factor=Math.max(.4,1-speed/470)*Math.pow(Math.exp(-f.p[1]/10000),.65);
  f.power=M.clamp((q*cd+s.mass*9.81*vs/speed)/(s.thrust*factor)+(ias-f.ias)*.045,0,1);if(this.phase==='approach'&&f.agl<3)f.power=0;
  return inp;
 }
 afterStep(f,dt){if(f.crashed||this.finished)return;this.elapsed+=dt;this.phaseTime+=dt;
  if(this.phase==='takeoff'&&!f.grounded){this.phase='climb';this.phaseTime=0;f.emit('notice',{text:'亚庇离地。稳定爬升后收起落架与襟翼。'});}
  if(this.phase==='climb'){this.progress=M.clamp(f.agl/1450*.10,0,.10);if(this.guide&&f.agl>1300)this.transfer='cruise';}
  if(this.phase==='cruise'){this.cruiseDistance+=f.gs*dt*this.cruiseRate;this.progress=.10+.82*M.clamp(this.cruiseDistance/(ROUTE_DATA.distance*.82),0,1);if(this.cruiseDistance>=ROUTE_DATA.distance*.82)this.transfer='descent';if(Math.hypot(f.p[0],f.p[2])>9500){f.p[0]=0;f.p[2]=0;f.prevP=f.p.slice();}}
  if(this.phase==='descent'){this.progress=M.clamp(.92+(f.p[2]+21500)/12500*.05,.92,.97);if(f.p[2]>-9000){this.phase='approach';this.phaseTime=0;f.emit('notice',{text:'进入广州进近段。检查襟翼、起落架与空速。'});}}
  if(this.phase==='approach'){this.progress=M.clamp(.97+(f.p[2]+9000)/8500*.018,.97,.988);if(f.touchdown){this.phase='rollout';this.phaseTime=0;}}
  if(this.phase==='rollout'&&f.grounded&&f.gs<2.5){this.phase='taxi';this.phaseTime=0;this.progress=.99;this.taxiIndex=0;f.speedbrake=false;f.flaps=0;f.emit('notice',{text:'着陆完成。沿黄色滑行线和绿色标记进入 T3 模拟机位。'});}
  if(this.phase==='taxi'&&f.grounded){const dist=Math.hypot(f.p[0]-245,f.p[2]+440);if(dist<12&&f.gs<1&&f.power<.06&&(f.brake||this.guide||f.lastBrake)){this.phase='parked';this.progress=1;this.finished=true;f.power=0;f.brake=true;f.emit('parked',{text:'BKI → CAN T3 完成'});}}
 }
 hint(f){const hints={takeoff:'油门推满；约 145 kt 轻拉抬头。可点「教学领航」观看完整示范。',climb:'保持速度、收起落架和襟翼；「跳至巡航」可直接体验南海上空。',cruise:'FL340 场景 · 航程推进 ×'+this.cruiseRate+'，飞行动力学 1×。可跳至广州下降。',descent:'沿引导线下降。逐步减速，准备襟翼与起落架。',approach:'参考 152 kt，襟翼 2 / 3，起落架放妥。小幅修正，近地轻拉减小下降率。',rollout:'收油门，按住刹车。先减速，再退出跑道。',taxi:'沿黄线经跑道北侧出口至 SIM-T3。保持低速，机位内收油并刹停。',parked:'飞机已在 T3 模拟机位停稳。'};return hints[this.phase]||'';}
}

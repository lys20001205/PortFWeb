'use strict';
const World=(()=>{
 const R=seeded(97), obstacles=[];
 const hash=(x,z)=>{let a=Math.sin(x*127.1+z*311.7)*43758.5453;return a-Math.floor(a)};
 const noise=(x,z)=>{let a=Math.floor(x),b=Math.floor(z),u=M.smooth(0,1,x-a),v=M.smooth(0,1,z-b);return M.mix(M.mix(hash(a,b),hash(a+1,b),u),M.mix(hash(a,b+1),hash(a+1,b+1),u),v)};
 const gauss=(x,z,cx,cz,sx,sz,h)=>Math.exp(-(((x-cx)/sx)**2)-(((z-cz)/sz)**2))*h;
 function height(x,z){let h=170*Math.exp(-(((x+1400)/2600)**4)-(((z-500)/4800)**4))-68;h+=gauss(x,z,-2350,2350,950,1350,1080)+gauss(x,z,-2550,-1550,900,1400,720)+gauss(x,z,-1000,4650,1250,700,380);let land=M.smooth(-50,70,h);h+=(noise(x*.0019,z*.0019)*90+noise(x*.006,z*.006)*25-48)*land;h=Math.max(h,gauss(x,z,4000,4300,1400,2200,330)-75,gauss(x,z,4800,-3600,1250,1200,290)-65);let approach=(1-M.smooth(120,620,Math.abs(x)))*(1-M.smooth(-1500,-1100,z))*M.smooth(-5200,-4500,z);h=M.mix(h,Math.min(h,25),approach);let airport=(1-M.smooth(340,650,Math.abs(x)))*(1-M.smooth(1180,1570,Math.abs(z)));return M.mix(h,30,airport)}
 const runway=(x,z)=>Math.abs(x)<24&&Math.abs(z)<1050;
 const ground=(x,z)=>Math.max(0,height(x,z));
 const gates=[{x:0,y:130,z:950,r:85,name:'离地爬升'},{x:0,y:285,z:2600,r:100,name:'保持爬升'},{x:700,y:420,z:3400,r:140,name:'缓转右弯'},{x:1400,y:420,z:2400,r:140,name:'进入下风边'},{x:1400,y:420,z:-1100,r:150,name:'平飞检查'},{x:1000,y:315,z:-3100,r:150,name:'转向跑道'},{x:0,y:230,z:-4000,r:140,name:'对正进近'},{x:0,y:120,z:-2500,r:105,name:'稳定下降'}];
 function build(engine){
  let terrain=new Geometry(),res=156,extent=9500,step=extent*2/res;
  const color=(x,y,z)=>{let n=noise(x*.015,z*.015);if(y<5)return [.58+n*.08,.66+n*.08,.48+n*.06];if(y<32)return [.50+n*.11,.59+n*.10,.34+n*.08];let k=M.smooth(220,900,y);return [M.mix(.27+n*.13,.49+n*.08,k),M.mix(.43+n*.16,.51+n*.07,k),M.mix(.26+n*.10,.46+n*.10,k)]};
  for(let j=0;j<res;j++)for(let i=0;i<res;i++){let x=-extent+i*step,z=-extent+j*step,p=[x,height(x,z),z],q=[x+step,height(x+step,z),z],r=[x+step,height(x+step,z+step),z+step],s=[x,height(x,z+step),z+step];terrain.tri(p,s,q,color(x,(p[1]+s[1]+q[1])/3,z));terrain.tri(q,s,r,color(x+30,(q[1]+s[1]+r[1])/3,z+30))}
  let sea=new Geometry().quad([-35000,-.25,-35000],[-35000,-.25,35000],[35000,-.25,35000],[35000,-.25,-35000],[.06,.35,.42]);
  let airport=new Geometry(),markings=new Geometry(),white=[.9,.91,.85],asphalt=[.16,.20,.21],yellow=[.89,.67,.23];
  airport.box(0,30.14,0,48,.10,2100,asphalt);airport.box(92,30.14,-20,19,.10,2040,[.25,.29,.29]);airport.box(130,30.14,-460,170,.10,440,[.33,.37,.36]);
  for(let z of [-890,-480,250,920])airport.box(51,30.15,z,100,.10,20,[.25,.29,.28]);
  for(let z=-930;z<990;z+=65)markings.box(0,30.22,z,1.1,.04,32,white);
  for(let x of [-22,22])markings.box(x,30.22,0,.6,.04,2060,white);
  for(let z of [-975,975])for(let x of [-17,-12,-7,7,12,17])markings.box(x,30.22,z,2.6,.04,32,white);
  for(let z of [-800,800])for(let x of [-14,14])markings.box(x,30.22,z,5,.04,48,white);
  markings.box(92,30.23,0,.45,.03,1980,yellow);for(let z of [-890,-480,250,920])markings.box(55,30.23,z,74,.03,.5,yellow);
  // Runway numbers, readable physical markings made from simple strokes.
  const digits={1:['00100','01100','00100','00100','01110'],3:['11111','00001','01111','00001','11111'],6:['11111','10000','11111','10001','11111'],8:['11111','10001','11111','10001','11111']};
  function digit(n,x,z,flip){let rows=digits[n];for(let j=0;j<5;j++)for(let i=0;i<5;i++)if(rows[j][i]==='1')markings.box(x+(i-2)*1.4*(flip?-1:1),30.25,z+(2-j)*3*(flip?-1:1),1.35,.03,2.9,white)}digit(3,-5,-925,false);digit(6,5,-925,false);digit(1,5,925,true);digit(8,-5,925,true);
  let structures=new Geometry(),lights=new Geometry();
  function building(x,z,w,d,h,col,yaw=0){let y=ground(x,z);structures.box(x,y+h/2,z,w,h,d,col,yaw);structures.box(x,y+h+.3,z,w+1,.6,d+1,[.28,.34,.36],yaw);obstacles.push({x,z,w:w/2+2,d:d/2+2,h:y+h});return y}
  let y=building(205,-420,58,170,13,[.73,.76,.71]);structures.box(175,y+7,-420,.4,7,150,[.12,.29,.36]);
  for(let z=-488;z<-340;z+=22){structures.box(164,y+3,z,20,6,6,[.66,.7,.65]);structures.box(151,y+2,z,8,4,6,[.29,.33,.33])}
  for(let z of [-740,-630,50]){building(195,z,80,65,19,[.59,.65,.65]);structures.box(153,40,z,.6,15,50,[.22,.31,.35])}
  building(220,-170,12,12,32,[.79,.77,.66]);structures.box(220,65,-170,22,8,22,[.12,.25,.29]);structures.box(220,70,-170,27,2,27,[.78,.77,.7]);structures.cone(220,72,-170,.5,11,[.44,.42,.37],6);
  // Runway edge, approach, and threshold lights.
  for(let z=-1010;z<=1010;z+=50)for(let x of [-27,27]){structures.box(x,30.6,z,.7,.8,.7,[.35,.35,.3]);lights.ellipsoid(x,31.1,z,.65,.36,.65,[1,.89,.6],6,3)}
  for(let z of [-1040,1040])for(let x=-21;x<=21;x+=7)lights.ellipsoid(x,30.6,z,.8,.4,.8,[.22,1,.61],6,3);
  for(let z=-1150;z>=-1750;z-=65){lights.box(0,ground(0,z)+1,z,1,1,1,[.94,.9,.65]);if(z%130===0)for(let x of [-7,7])lights.box(x,ground(x,z)+1,z,1,1,1,[.94,.9,.65])}
  // Parking spots / service road / terminal parking.
  structures.box(290,30.3,-350,6,.15,900,[.28,.31,.29]);for(let z=-750;z<100;z+=20)structures.box(290,30.4,z,.4,.05,6,white);
  for(let i=0;i<30;i++){let x=248+(i%3)*12,z=-520+Math.floor(i/3)*13;structures.box(x,31,z,3.2,1.6,6,i%4===0?[.81,.72,.46]:[.37,.43,.44])}
  let foliage=new Geometry();
  for(let i=0;i<1900;i++){let x=(R()-.5)*9300,z=(R()-.5)*13500,h=height(x,z);if(h<32||h>780||Math.abs(x)<420&&Math.abs(z)<1450)continue;let size=9+R()*14;foliage.cone(x,h+1,z,size*.26,size,[.16+R()*.10,.29+R()*.10,.20],6);if(i%4===0)foliage.box(x,h+3,z,1,6,1,[.30,.24,.17])}
  for(let i=0;i<95;i++){let x=500+R()*430,z=-2000+R()*3000;if(height(x,z)>13&&height(x,z)<160)building(x,z,12+R()*14,14+R()*16,7+R()*30,[.62+R()*.13,.64+R()*.12,.59+R()*.12])}
  // Coastal beacon.
  let bx=1160,bz=-1200,bh=height(bx,bz);structures.cone(bx,bh,bz,5,24,[.82,.81,.73],10,3.5);structures.cone(bx,bh+16,bz,4,5,[.69,.26,.18],10,4);structures.box(bx,bh+26,bz,8,5,8,[.2,.26,.25]);lights.ellipsoid(bx,bh+28,bz,2,1,2,[1,.91,.61]);
  let clouds=new Geometry();for(let i=0;i<42;i++){let x=(R()-.5)*23000,z=(R()-.5)*24000,y=1450+R()*1500;for(let j=0;j<3;j++)clouds.ellipsoid(x+(j-1)*240,y+R()*100,z+R()*200,260+R()*180,80+R()*130,210+R()*180,[.91+R()*.035,.93+R()*.035,.92+R()*.035],8,4)}
  let ring=new Geometry().ring(0,0,0,1,.035,[.38,.92,.79],48),shadow=new Geometry();for(let i=0;i<24;i++){let a=i/24*Math.PI*2,b=(i+1)/24*Math.PI*2;shadow.tri([0,0,0],[Math.cos(b),0,Math.sin(b)],[Math.cos(a),0,Math.sin(a)],[.035,.05,.045])}
  return {terrain:engine.mesh(terrain),sea:engine.mesh(sea),airport:engine.mesh(airport),markings:engine.mesh(markings),structures:engine.mesh(structures),foliage:engine.mesh(foliage),lights:engine.mesh(lights),clouds:engine.mesh(clouds),ring:engine.mesh(ring),shadow:engine.mesh(shadow),triangles:(terrain.a.length+structures.a.length+foliage.a.length+clouds.a.length)/27};
 }
 return {height,ground,runway,gates,obstacles,build};
})();
function buildAircraft(engine,type){
 let body=new Geometry(),gear=new Geometry(),flaps=new Geometry(),prop=new Geometry(),cockpit=new Geometry();let white=[.84,.88,.84],navy=[.13,.24,.28],teal=[.12,.53,.52],glass=[.12,.28,.34],metal=[.40,.46,.46],rubber=[.055,.075,.08];
 if(type==='a320'){teal=[.79,.12,.14];navy=[.18,.23,.27];}
 if(type==='light'){
  body.ellipsoid(0,.36,-.2,.74,.80,3.85,white,12,8);body.ellipsoid(0,.75,.8,.77,.75,1.55,glass,10,5);body.box(0,1.25,.2,1.55,.13,2.6,white);
  body.box(0,1.27,.0,10.8,.18,1.5,white);body.box(0,1.29,-.76,10.6,.13,.19,teal);for(let x of [-5.4,5.4])body.box(x,1.3,0,.14,.18,1.55,navy);
  for(let x of [-1,1]){body.quad([x*.6,0,.8],[x*.62,.1,.75],[x*3.7,1.2,.1],[x*3.7,1.2,.23],metal);body.box(x*.74,.1,.1,.06,.19,3.4,teal)}
  body.box(0,.5,-3.25,3.9,.12,1.15,white);body.box(0,.5,-3.83,3.8,.09,.13,teal);body.quad([-.04,.5,-3.8],[-.04,2.22,-3.8],[-.04,1.72,-3.25],[-.04,.5,-2.5],teal);body.quad([.04,.5,-2.5],[.04,1.72,-3.25],[.04,2.22,-3.8],[.04,.5,-3.8],teal);
  body.ellipsoid(0,.35,3.5,.5,.47,.7,navy,10,5);
  for(let x of [-1.1,1.1]){gear.box(x*.5,-.55,-.3,.10,1.1,.13,metal);gear.ellipsoid(x,-.87,-.5,.16,.38,.38,rubber,10,5)}gear.box(0,-.55,2.35,.12,.8,.13,metal);gear.ellipsoid(0,-.93,2.35,.13,.28,.28,rubber,10,5);
  flaps.box(-2.35,0,-.23,2.2,.10,.48,teal);flaps.box(2.35,0,-.23,2.2,.10,.48,teal);
  prop.box(0,0,0,.12,2.5,.04,[.10,.15,.14]);prop.ellipsoid(0,0,0,.19,.19,.24,metal,8,4);
  cockpit.ellipsoid(0,.25,3.1,.70,.6,1.35,white,12,6);cockpit.box(0,0,.7,1.85,.45,.4,navy);for(let x of [-.84,.84])cockpit.box(x,1.0,1.8,.06,2.6,.08,white);cockpit.box(0,1.95,1.8,1.75,.07,.08,white);
 }else{
  body.ellipsoid(0,.75,0,1.90,2.1,17.4,white,16,12);body.ellipsoid(0,1.9,13.7,1.6,.72,2.2,glass,12,5);
  body.box(0,-.1,.2,3.65,.32,28,teal);
  for(let s of [-1,1]){
   body.quad([s*1.3,.2,4],[s*16.5,.5,-4.7],[s*16.5,.5,-6.8],[s*1.3,.2,-2.3],white);body.quad([s*1.3,-.05,-2.3],[s*16.5,.34,-6.8],[s*16.5,.34,-4.7],[s*1.3,-.05,4],white);body.quad([s*16.5,.5,-6.8],[s*16.6,type==='a320'?1.6:3.3,-7.3],[s*16.6,type==='a320'?1.6:3.3,-6],[s*16.5,.5,-4.7],teal);if(type==='a320')body.quad([s*16.5,.5,-6.8],[s*16.6,-.3,-6.5],[s*16.6,-.3,-5.6],[s*16.5,.5,-4.7],teal);
   body.quad([s*.7,1,-13.2],[s*6.2,1.2,-15.0],[s*6.2,1.2,-16.7],[s*.7,1,-15.8],white);
   body.ellipsoid(s*5.0,-1.2,2.0,1.2,1.2,2.8,white,12,8);body.ellipsoid(s*5,-1.2,4.2,1.05,1.05,.18,[.075,.12,.15],12,4);body.ellipsoid(s*5,-1.2,4.35,.23,.23,.30,metal,8,4);
   for(let z=-10.5;z<=10;z+=1.1)body.box(s*1.84,1.45,z,.04,.44,.35,glass);
   for(let z of [-11.5,10.9])body.box(s*1.82,.8,z,.05,1.65,.72,navy);
   gear.box(s*2.4,-2.4,-1.6,.26,2,.28,metal);for(let z of [-2.1,-.9])gear.ellipsoid(s*2.4,-3.28,z,.3,.58,.58,rubber,10,5);
   flaps.quad([s*1.4,0,0],[s*10.6,0,-2.8],[s*10.6,-.08,-3.6],[s*1.4,-.08,-1.5],teal);
  }
  body.quad([-.10,1.6,-15.8],[-.10,8.0,-16.1],[-.10,7.7,-13.8],[-.10,1.6,-10.5],teal);body.quad([.10,1.6,-10.5],[.10,7.7,-13.8],[.10,8.0,-16.1],[.10,1.6,-15.8],teal);
  gear.box(0,-2.3,11,.25,2.3,.25,metal);gear.ellipsoid(0,-3.3,11,.3,.5,.5,rubber,10,5);
  cockpit.ellipsoid(0,.0,14.1,1.75,1.9,3.2,white,12,6);cockpit.box(0,1.1,13.2,3.9,.5,.8,navy);for(let x of [-1.8,0,1.8])cockpit.box(x,2.6,14.9,.13,3.1,.15,navy);
 }
 if(type==='a320'){for(let g of [body,gear,flaps,cockpit])for(let i=0;i<g.a.length;i+=9){g.a[i]*=34.1/33.2;g.a[i+2]*=37.57/34.8;}}
 let lamp=new Geometry().ellipsoid(-1,0,0,.12,.12,.12,[1,.15,.09],6,3);return {body:engine.mesh(body),gear:engine.mesh(gear),flaps:engine.mesh(flaps),prop:engine.mesh(prop),cockpit:engine.mesh(cockpit),lamp:engine.mesh(lamp)};
}

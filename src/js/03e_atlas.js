// ════════════════════════════════════════════
// 肌肉原理动画：点「训练部位」里的肌肉后弹出，演示这块肌肉收缩时把骨头拉向哪里
// 动画引擎和肌肉数据移植自「肌肉运动图解」页面（只留中文、只留最基本的内容），配色跟随主题
// 全部包在 ATLAS 里，避免和 App 的全局变量重名
// ════════════════════════════════════════════
const ATLAS = (() => {
// 肌肉：名字、收缩时的动作 [动画, 动作, 一句话说明]、训练动作
const AM = {
  delt: { n: '三角肌', a: [['shAbd', '肩外展', '手臂从体侧向外抬起'], ['shFlexD', '肩前屈（前束）', '手臂向前抬起'], ['shExtD', '肩后伸（后束）', '手臂向后拉']], tr: '哑铃推举|侧平举|俯身反向飞鸟' },
  trap: { n: '斜方肌', a: [['shrug', '肩胛骨上提（上束）', '耸肩，把肩膀往耳朵方向提'], ['retractT', '肩胛骨后缩（中束）', '把两侧肩胛骨往脊柱方向夹']], tr: '哑铃耸肩|俯身划船|坐姿划船' },
  pec: { n: '胸大肌', a: [['hAdd', '肩水平内收', '手臂在胸前合拢，像拥抱一样'], ['addP', '肩内收', '把向两侧举高的手臂往下、往身体前方压']], tr: '卧推|俯卧撑|哑铃飞鸟' },
  serr: { n: '前锯肌', a: [['protract', '肩胛骨前伸', '肩胛骨沿着肋骨往前滑，手能推得更远']], tr: '俯卧撑加强版|平板支撑把背往上顶|仰卧哑铃前推' },
  lat: { n: '背阔肌', a: [['pulldown', '肩内收', '把举过头顶的手臂从两侧往下拉'], ['shExtL', '肩后伸', '把向前举起的手臂往下、往后拉']], tr: '引体向上|高位下拉|单臂哑铃划船' },
  erector: { n: '竖脊肌', a: [['spineExt', '脊柱伸展', '把弯着的背挺直']], tr: '罗马椅背伸|硬拉|鸟狗式' },
  biceps: { n: '肱二头肌', a: [['elFlex', '屈肘', '弯曲手肘，把前臂往肩膀方向拉']], tr: '哑铃弯举|锤式弯举|反手引体向上' },
  triceps: { n: '肱三头肌', a: [['elExt', '伸肘', '把弯曲的手肘伸直']], tr: '窄距卧推|绳索下压|双杠臂屈伸' },
  flexors: { n: '前臂屈肌群', a: [['wrFlex', '屈腕', '把手掌往前臂内侧弯，也是握力的来源']], tr: '坐姿腕弯举|握力器|悬吊' },
  extensors: { n: '前臂伸肌群', a: [['wrExt', '伸腕', '把手背往前臂外侧翘起']], tr: '反握腕弯举|反握弯举|弹力带腕伸' },
  rectus: { n: '腹直肌', a: [['crunch', '卷腹', '把胸廓和骨盆拉近，卷起上身']], tr: '卷腹|悬垂举腿|健腹轮' },
  oblique: { n: '腹外斜肌', a: [['latFlex', '躯干侧屈', '把同侧肋骨往骨盆拉，身体往这一侧弯']], tr: '侧平板支撑|俄罗斯转体|绳索伐木' },
  glutmax: { n: '臀大肌', a: [['kickback', '伸髋', '把大腿往后摆']], tr: '臀推|深蹲|罗马尼亚硬拉' },
  glutmed: { n: '臀中肌', a: [['hipAbd', '髋外展', '把腿向外侧抬起，走路时稳住骨盆']], tr: '侧卧抬腿|弹力带侧向走|单腿硬拉' },
  tfl: { n: '阔筋膜张肌', a: [['hipAbdT', '髋外展', '把腿往外侧、稍微往前抬']], tr: '侧卧抬腿|弹力带侧向走|站姿髋外展' },
  quads: { n: '股四头肌', a: [['kneeExt', '伸膝', '把弯曲的膝盖伸直'], ['hipFlexRF', '屈髋（股直肌）', '把伸直的腿往前抬']], tr: '深蹲|弓步蹲|腿屈伸' },
  hams: { n: '腘绳肌', a: [['kneeFlex', '屈膝', '弯曲膝盖，把脚跟往臀部方向勾'], ['hinge', '伸髋', '把前倾的上身往后拉直']], tr: '罗马尼亚硬拉|腿弯举|北欧挺' },
  adductors: { n: '内收肌群', a: [['hipAdd', '髋内收', '把向外张开的腿往身体中线合拢']], tr: '相扑深蹲|哥本哈根侧平板|器械内收' },
  sartorius: { n: '缝匠肌', a: [['tailor', '屈髋 + 屈膝', '抬起大腿的同时弯曲膝盖，像盘腿']], tr: '坐姿抬膝外旋|仰卧 4 字抬腿' },
  gastroc: { n: '腓肠肌', a: [['calfRaise', '踝跖屈', '把脚跟往上提，踮起脚尖']], tr: '站姿提踵|跳绳|单腿提踵' },
  soleus: { n: '比目鱼肌', a: [['seatedCalf', '踝跖屈（屈膝时）', '膝盖弯着时，主要靠它把脚跟提起']], tr: '坐姿提踵|屈膝提踵' },
  tibant: { n: '胫骨前肌', a: [['dorsi', '踝背屈', '把脚尖往上勾向小腿']], tr: '脚跟走|弹力带勾脚' }
};
const RD=Math.PI/180;
const Dv=a=>[Math.sin(a*RD),Math.cos(a*RD)];
const ad=(p,q)=>[p[0]+q[0],p[1]+q[1]],sb=(p,q)=>[p[0]-q[0],p[1]-q[1]],ml=(p,k)=>[p[0]*k,p[1]*k];
const nrm=p=>Math.hypot(p[0],p[1]);
const Fr=(o,a,sg)=>{const u=Dv(a);return{o,u,v:[sg*u[1],-sg*u[0]]};};
const at=(f,al,sd)=>[f.o[0]+f.u[0]*al+f.v[0]*sd,f.o[1]+f.u[1]*al+f.v[1]*sd];
/* Standard adult male segment lengths (Drillis & Contini), stature = 256 units.
   upper arm .186H, forearm .146H, hand .108H, thigh .245H, shank .246H, ankle height .039H,
   hip joint .530H, shoulder joint .818H, chin .870H, foot length .152H */
const LEN={A:47.6,F:37.4,Hd:27.6,T:62.7,S:63,P:20,Th:53.7};
function rigSide(P){
  const p=P.p??180,sf=P.sf||0,nf=P.nf||0,F={},Q={};
  F.pel=Fr([0,0],p,-1);
  const Lp=at(F.pel,LEN.P,-3),t=p-sf;
  F.tho=Fr(Lp,t,-1);
  const S=at(F.tho,LEN.Th,-2),nb=at(F.tho,58,-3);
  F.nk=Fr(nb,t-nf-10,-1);
  F.head=Fr(at(F.nk,25,3),t-nf,-1);
  const mk=(pre,sh,el,wr,hip,kn,an,pron,off)=>{
    const m=pron?-1:1,S0=ad(S,off),H0=off;
    const aA=(t-180)+sh;F[pre+"arm"]=Fr(S0,aA,1);const E=at(F[pre+"arm"],LEN.A,0);
    const aF=aA+el;F[pre+"fore"]=Fr(E,aF,m);const W=at(F[pre+"fore"],LEN.F,0);
    F[pre+"hand"]=Fr(W,aF+m*wr,m);
    const aT=(p-180)+hip;F[pre+"thigh"]=Fr(H0,aT,1);const K=at(F[pre+"thigh"],LEN.T,0);
    const aS=aT-kn;F[pre+"shin"]=Fr(K,aS,1);const A=at(F[pre+"shin"],LEN.S,0);
    F[pre+"foot"]=Fr(A,aS+90+an,1);
  };
  const g=(k,d)=>P[k]??d;
  mk("",g("sh",0),g("el",8),g("wr",0),g("hip",0),g("kn",3),g("an",0),P.pron,[0,0]);
  mk("f",g("fsh",g("sh",0)),g("fel",g("el",8)),g("fwr",g("wr",0)),g("fhip",g("hip",0)),g("fkn",g("kn",3)),g("fan",g("an",0)),P.pron,[-3,-1]);
  Q.head=F.head.o;Q.S=S;Q.H=[0,0];Q.Lp=Lp;Q.nb=nb;
  for(const pre of ["","f"]){Q[pre+"E"]=F[pre+"fore"].o;Q[pre+"W"]=F[pre+"hand"].o;Q[pre+"Ht"]=at(F[pre+"hand"],LEN.Hd,0);Q[pre+"K"]=F[pre+"shin"].o;Q[pre+"A"]=F[pre+"foot"].o;Q[pre+"toe"]=at(F[pre+"foot"],29,-7);Q[pre+"heel"]=at(F[pre+"foot"],-9.5,-6);}
  const fit=[[Q.head,18],[at(F.tho,28,19),4],[at(F.tho,38,-17),4],[at(F.pel,-2,-20),4]];
  for(const pre of ["","f"])fit.push([Q[pre+"E"],6],[Q[pre+"Ht"],4],[Q[pre+"K"],9],[Q[pre+"toe"],4],[Q[pre+"heel"],5],[Q[pre+"W"],5]);
  const cont=[at(F.pel,-3,-19.5),at(F.tho,24,-14.5),at(F.head,2,-14.5)];
  for(const pre of ["","f"])cont.push(at(F[pre+"foot"],-8,-10),at(F[pre+"foot"],22,-10),at(F[pre+"foot"],29,-8));
  return{F,Q,fit,cont,view:"side"};
}
function rigFB(P){
  const tl=P.tl||0,nk=P.nk||0,F={},Q={};
  F.pel=Fr([0,0],180,-1);
  const Lp=at(F.pel,LEN.P,0);F.tho=Fr(Lp,180-tl,-1);
  const nb=at(F.tho,60,0);F.nk=Fr(nb,180-tl-nk,-1);
  F.head=Fr(at(F.nk,24,0),180-tl-nk,-1);
  Q.head=F.head.o;Q.nb=nb;Q.Lp=Lp;Q.pel=[0,0];
  const fit=[[Q.head,19]];
  for(const s of ["R","L"]){
    const sg=s=="R"?1:-1,g=(k,d)=>P[k+s]??P[k]??d;
    const sh=g("sh",6),el=g("el",0),ev=g("ev",0),rt=g("rt",0),hp=g("hp",0),up=sh/3;
    F["scap"+s]=Fr(at(F.tho,58+ev,sg*(11.5-rt)),180-tl+sg*up,-sg);
    const GH=at(F["scap"+s],-4.3,15);
    const aA=sg*sh-tl;F["arm"+s]=Fr(GH,aA,sg);const E=at(F["arm"+s],LEN.A,0);
    F["fore"+s]=Fr(E,aA+sg*el,sg);const W=at(F["fore"+s],LEN.F,0);
    F["hand"+s]=Fr(W,aA+sg*el,sg);
    const HJ=at(F.pel,0,sg*12.8);F["thigh"+s]=Fr(HJ,sg*hp,sg);const K=at(F["thigh"+s],LEN.T,0);
    F["shin"+s]=Fr(K,sg*hp,sg);const A=at(F["shin"+s],LEN.S,0);
    Object.assign(Q,{["GH"+s]:GH,["E"+s]:E,["W"+s]:W,["Ht"+s]:at(F["hand"+s],LEN.Hd,0),["HJ"+s]:HJ,["K"+s]:K,["A"+s]:A});
    fit.push([GH,10],[E,6],[Q["Ht"+s],4],[HJ,14],[K,9],[ad(A,[0,10]),5],[at(F.tho,28,sg*23),3]);
  }
  const cont=[ad(Q.AR,[0,10]),ad(Q.AL,[0,10])];
  return{F,Q,fit,cont,view:"fb"};
}
function rigTop(P){
  const F={},Q={},pr=P.pr||0,h=P.h||0,el=P.el||0;
  F.tho=Fr([0,0],180,-1);
  const fit=[[[0,0],34]];
  Q.ell=(s,ps,k)=>[(s=="R"?1:-1)*30*k*Math.cos(ps*RD),-17.5*k*Math.sin(ps*RD)];
  for(const s of ["R","L"]){
    const sg=s=="R"?1:-1,ph=8+pr;
    const GH=[sg*27*Math.cos(ph*RD),-15*Math.sin(ph*RD)+1.5];
    F["arm"+s]=Fr(GH,sg>0?90+h:-90-h,sg);const E=at(F["arm"+s],LEN.A,0);
    F["fore"+s]=Fr(E,sg>0?90+h+el:-90-h-el,sg);const W=at(F["fore"+s],LEN.F,0);
    F["hand"+s]=Fr(W,sg>0?90+h+el:-90-h-el,sg);
    Q["GH"+s]=GH;Q["E"+s]=E;Q["W"+s]=W;Q["Ht"+s]=at(F["hand"+s],LEN.Hd,0);
    Q["scM"+s]=-68+pr*1.3;Q["scL"+s]=-18+pr*0.9;
    fit.push([GH,9],[E,6],[Q["Ht"+s],4]);
  }
  Q.head=[0,-1.5];
  return{F,Q,fit,cont:[],view:"top"};
}
const f1=n=>Math.round(n*10)/10;
const pt=p=>f1(p[0])+","+f1(p[1]);
function cap(p1,r1,p2,r2){
  const d=sb(p2,p1),L=nrm(d)||1e-6,u=ml(d,1/L),n=[-u[1],u[0]];
  const a=ad(p1,ml(n,r1)),b=ad(p2,ml(n,r2)),c=sb(p2,ml(n,r2)),e=sb(p1,ml(n,r1));
  return "M"+pt(a)+"L"+pt(b)+"A"+f1(r2)+","+f1(r2)+" 0 0 0 "+pt(c)+"L"+pt(e)+"A"+f1(r1)+","+f1(r1)+" 0 0 0 "+pt(a)+"Z";
}
function smooth(ps,closed){
  const n=ps.length;if(n<2)return"";
  const g=i=>closed?ps[(i+n)%n]:ps[Math.max(0,Math.min(n-1,i))];
  let s="M"+pt(ps[0]);const m=closed?n:n-1;
  for(let i=0;i<m;i++){const p0=g(i-1),p1=g(i),p2=g(i+1),p3=g(i+2);
    const c1=ad(p1,ml(sb(p2,p0),1/6)),c2=sb(p2,ml(sb(p3,p1),1/6));
    s+="C"+pt(c1)+" "+pt(c2)+" "+pt(p2);}
  return s+(closed?"Z":"");
}
const P_=(cls,d,extra)=>'<path class="'+cls+'" d="'+d+'"'+(extra||"")+'/>';
function ell(c,rx,ry,deg,cls){return '<ellipse class="'+cls+'" cx="'+f1(c[0])+'" cy="'+f1(c[1])+'" rx="'+f1(rx)+'" ry="'+f1(ry)+'" transform="rotate('+f1(deg)+" "+pt(c)+')"/>';}
const angOf=u=>Math.atan2(u[1],u[0])/RD;
const circ=(c,r,cls)=>'<circle'+(cls?' class="'+cls+'"':"")+' cx="'+f1(c[0])+'" cy="'+f1(c[1])+'" r="'+f1(r)+'"/>';
const HEAD_SIDE=[[16.6,-1],[12,9.5],[5,12.5],[1.5,13.2],[-1,15],[-4,12.6],[-7.5,12.8],[-12.5,11],[-16.4,6.5],[-14,-1],[-9,-10],[1,-14.6],[11,-10.5]];
const FOOT_SIDE=[[-9.5,-4],[-8.5,-9.5],[8,-10],[22,-9.6],[29.3,-7.6],[27.5,-4.6],[13,1.6],[3,5],[-5.5,4.6]];
function drawSide(R){
  const F=R.F,Q=R.Q;
  const limb=(pre,cls)=>{
    const arm=F[pre+"arm"],fo=F[pre+"fore"],ha=F[pre+"hand"],th=F[pre+"thigh"],sh=F[pre+"shin"],ft=F[pre+"foot"];
    const leg=P_(cls,cap(th.o,13.5,sh.o,8.2))+ell(at(sh,20,-3.2),7.6,17,angOf(sh.u)-90,cls)+P_(cls,cap(sh.o,7.8,ft.o,4.6))
      +P_(cls,smooth(FOOT_SIDE.map(q=>at(ft,q[0],q[1])),true));
    const ar=circ(arm.o,8.6)+P_(cls,cap(arm.o,6.6,fo.o,5))+P_(cls,cap(fo.o,4.9,ha.o,3.2))+P_(cls,cap(ha.o,3.3,at(ha,LEN.Hd,0),1.9));
    return{leg,ar};
  };
  const far=limb("f","kxp"),nr=limb("","kxp");
  const pel=F.pel,tho=F.tho,nk=F.nk,hd=F.head;
  const tor=[[pel,-9,9],[pel,4,13.5],[pel,14,15],[tho,4,15.5],[tho,16,16.5],[tho,28,18.5],[tho,40,17],[tho,50,13],[tho,56,9],[tho,59,3],[tho,59.5,-5],[tho,58,-11],[tho,50,-15.5],[tho,38,-16.5],[tho,24,-14.5],[tho,10,-11.5],[tho,0,-11],[pel,14,-14],[pel,6,-17.5],[pel,-2,-19.5],[pel,-12,-16],[pel,-16,-7]].map(q=>at(q[0],q[1],q[2]));
  let s='<g class="kx-gh">'+far.leg+far.ar+'</g>';
  s+='<g class="kx-bd">'+P_("kxp",smooth(tor,true))+P_("kxp",cap(Q.nb,6.4,at(nk,15,2),6))+P_("kxp",smooth(HEAD_SIDE.map(q=>at(hd,q[0],q[1])),true))+nr.leg+'</g>';
  s+='<g class="kx-bn">'+P_("kxp",cap(F.thigh.o,2.2,F.shin.o,1.9))+P_("kxp",cap(F.shin.o,2,F.foot.o,1.7))+'</g>';
  s+=P_("kx-spine",smooth([at(pel,-2,-9.5),at(pel,12,-9.5),at(tho,0,-8.5),at(tho,20,-10),at(tho,40,-11),at(tho,55,-7),at(nk,12,-3.5)],false));
  s+='<g class="kx-bd">'+nr.ar+'</g>';
  s+='<g class="kx-bn">'+P_("kxp",cap(F.arm.o,1.8,F.fore.o,1.5))+P_("kxp",cap(F.fore.o,1.4,F.hand.o,1.2))+'</g>';
  return s;
}
const FOOT_FB=[[-1,-4.6],[-1,5],[7,8.4],[10,6.2],[10,-4],[7,-6]];
function drawFB(R,back){
  const F=R.F,Q=R.Q,pel=F.pel,tho=F.tho,nk=F.nk,hd=F.head;let s='<g class="kx-bd">';
  const side=sg=>[[tho,60,7.6],[tho,57.5,15],[tho,55.5,23.5],[tho,47,25],[tho,40,23.2],[tho,28,22.6],[tho,16,21.6],[tho,4,21],[pel,12,22.2],[pel,1,24.5],[pel,-8,22.5],[pel,-16,9]].map(q=>at(q[0],q[1],sg*q[2]));
  s+=P_("kxp",smooth(side(1).concat([at(pel,-18,0)],side(-1).reverse()),true));
  s+=P_("kxp",cap(Q.nb,7.6,at(nk,13,0),7));
  for(const sd of ["R","L"]){
    const th=F["thigh"+sd],sh=F["shin"+sd],A=Q["A"+sd];
    s+=P_("kxp",cap(th.o,14,sh.o,8.2))+ell(at(sh,20,0),8.4,17,angOf(sh.u)-90,"kxp")+P_("kxp",cap(sh.o,7.8,A,4.8));
    s+=P_("kxp",smooth(FOOT_FB.map(q=>at(sh,LEN.S+q[0],q[1])),true));
  }
  for(const sd of ["R","L"]){
    const ar=F["arm"+sd],fo=F["fore"+sd],ha=F["hand"+sd];
    s+=circ(ar.o,9.4)+P_("kxp",cap(ar.o,7,fo.o,5.4))+P_("kxp",cap(fo.o,5.4,ha.o,3.6))+P_("kxp",cap(ha.o,3.6,at(ha,LEN.Hd,0),2.5));
  }
  s+=ell(Q.head,11.3,16.6,angOf(hd.u)+90,"kxp")+'</g>';
  if(back){
    s+=P_("kx-spine",smooth([at(pel,2,0),at(tho,0,0),at(tho,30,0),at(tho,60,0),at(nk,12,0)],false));
    s+='<g class="kx-bn">';
    for(const sd of ["R","L"]){const sc=F["scap"+sd];s+=P_("kxp",smooth([[0,0],[2.5,17.5],[-5.5,15.5],[-23,3],[-11,-0.8]].map(q=>at(sc,q[0],q[1])),true));}
    s+='</g>';
  }
  return s;
}
function drawTop(R){
  const F=R.F,Q=R.Q;let s='<g class="kx-bd">';
  for(const sd of ["R","L"]){
    const ar=F["arm"+sd],fo=F["fore"+sd],ha=F["hand"+sd];
    s+=P_("kxp",cap(ar.o,6.8,fo.o,5.2))+P_("kxp",cap(fo.o,5.2,ha.o,3.6))+P_("kxp",cap(ha.o,3.6,Q["Ht"+sd],2.5));
  }
  s+='<ellipse cx="0" cy="0" rx="30" ry="17.5"/>';
  for(const sd of ["R","L"])s+=circ(Q["GH"+sd],8.6);
  s+='</g><g class="kx-bn">';
  for(const sd of ["R","L"]){
    const a0=Q["scM"+sd],a1=Q["scL"+sd],arr=[];
    for(let i=0;i<=8;i++)arr.push(Q.ell(sd,a0+(a1-a0)*i/8,1.09));
    for(let i=8;i>=0;i--)arr.push(Q.ell(sd,a0+(a1-a0)*i/8,1.0));
    s+=P_("kxp",smooth(arr,true));
  }
  s+='</g><g class="kx-bd"><ellipse cx="0" cy="-1.5" rx="11.3" ry="14.3"/><path d="M-2.6,-15.4 L0,-19.2 L2.6,-15.4 Z"/></g>';
  return s;
}
const DRAW={side:drawSide,front:R=>drawFB(R,0),back:R=>drawFB(R,1),top:drawTop};
const RIGS={side:rigSide,front:rigFB,back:rigFB,top:rigTop};
const STAND={fhip:0,fkn:3,fan:0};
const SEAT={p:182,hip:90,sh:8,el:24};
const SEATF={fhip:90,fkn:90,fan:0};
const LEGZ=["Lp","H","K","A","toe","heel","fA"],LEGF=["Lp","HJR","HJL","KR","KL","AR","AL"];
const UPZ=["head","GHR","GHL","HtR","HtL","ER","EL","HJR"],LOWZ=["head","GHR","GHL","HJR","HJL","KR","KL","AR","AL"],SCAPZ=["head","GHR","GHL","ER","EL","Lp"];
/* side view: sd + = front of the body; front/back view: sd + = toward the R side (frames ending in R mirror to L) */
const mVa="thigh 12 8|thigh 62 10|shin 8 7",mRF="pel 5 10.5|thigh 18 10.5|thigh 62 10|shin 8 7",mH="pel -6 -11.5|thigh 30 -9.5|shin 7 -5.5",
mGX="pel 12 -14|pel -2 -19.5|thigh 15 -5.5",mPS="pel 22 -6|pel 1 8.5|thigh 8 -1",mIL="pel 14 2|pel 1 8.5|thigh 8 -1",
mLatS="pel 12 -13.5|tho 22 -14.5|tho 39.7 -8|arm 10 1",mAD="tho 59.7 3|arm 19 3",
mBi="tho 56 -1|arm 4 6|arm 26 6.5|fore 5 3",mTri="tho 51 -4.5|arm 10 -6.5|arm 41 -6|fore -3 -4",
mFl="arm 46.5 1|fore 18 3|hand 0.5 3|hand 7 2",mEx="arm 47.5 -1.5|fore 18 -3|hand 0.5 -3|hand 7 -2",
mGa="thigh 57 -6|shin 14 -8|shin 38 -6|foot -9 -3",mSo="shin 12 -5.5|shin 34 -7|foot -9 -3",mTA="shin 8 5.5|shin 54 4.5|foot 10 3",
mES="pel 4 -14|tho 6 -11|tho 24 -14|tho 42 -15.5",mRA="pel -2 12.5|pel 12 15|tho 10 16.5|tho 30 18.5",
mDel="scapR 2.5 17.5|armR 21 5.5",mLatB="pel 14 4|tho 26 23|armR 8 -3.5",mLatB2="tho 22 2|tho 34 21|armR 8 -3.5",
mAdd="pel -8 4|thighR 28 -5.5",mAddM="pel -11 7|thighR 50 -5",mGM="pel 12 20|thighR 4 8",mGM2="pel 13 11|thighR 4 8";
const FN={
  serr:(R,s)=>{const a1=R.Q["scM"+s],o=[];for(let i=0;i<=10;i++){const a=34+(a1-34)*i/10;o.push(R.Q.ell(s,a,1.0));}return o;},
  rhomb:(R,s)=>[R.Q.ell(s,-90,1.04),R.Q.ell(s,R.Q["scM"+s],1.05)]
};
const ease=t=>t*t*(3-2*t);
function parseSpec(sp){const o={w:sp[0],b0:sp[1],b1:sp[2],tw:sp[4]||1.7};if(sp[3][0]=="@")o.fn=sp[3].slice(1);else o.pts=sp[3].split("|").map(s=>{const a=s.trim().split(/\s+/);return[a[0],+a[1],+a[2]];});return o;}
function pref(s){const a=s.split(/\s+/);return[a[0],+a[1],+a[2]];}
function locate(R,r,side){let f=r[0],sd=r[2];if(side=="L"){if(/R$/.test(f))f=f.slice(0,-1)+"L";else sd=-sd;}return at(R.F[f],r[1],sd);}
function mPts(R,m,side){return m.fn?FN[m.fn](R,side||"R"):m.pts.map(r=>locate(R,r,side));}
function plen(ps){let L=0;for(let i=1;i<ps.length;i++)L+=nrm(sb(ps[i],ps[i-1]));return L;}
function pAt(ps,s){let acc=0;for(let i=1;i<ps.length;i++){const d=nrm(sb(ps[i],ps[i-1]));if(acc+d>=s||i==ps.length-1){const k=d?Math.max(0,Math.min(1,(s-acc)/d)):0;return ad(ps[i-1],ml(sb(ps[i],ps[i-1]),k));}acc+=d;}return ps[0];}
function subP(ps,a,b){const L=plen(ps),o=[pAt(ps,a)];let acc=0;for(let i=1;i<ps.length;i++){acc+=nrm(sb(ps[i],ps[i-1]));if(acc>a&&acc<b)o.push(ps[i]);}o.push(pAt(ps,Math.min(b,L)));return o;}
function belly(ps,w,b0,b1,bul){
  const L=plen(ps),s0=b0*L,s1=b1*L,N=20,l=[],r=[],c=[];
  for(let i=0;i<=N;i++){const u=i/N,s=s0+(s1-s0)*u,p=pAt(ps,s),e=Math.max(1.5,L*0.03);
    const tg=sb(pAt(ps,Math.min(L,s+e)),pAt(ps,Math.max(0,s-e)));const tl=nrm(tg)||1;const n=[-tg[1]/tl,tg[0]/tl];
    const hw=w*bul*0.5*Math.pow(Math.sin(Math.PI*(0.04+0.92*u)),0.7);l.push(ad(p,ml(n,hw)));r.push(sb(p,ml(n,hw)));c.push([p,n,hw]);}
  return{d:smooth(l.concat(r.reverse()),true),c};
}
function arrowS(a,b,cls,k,w){const d=sb(b,a),L=nrm(d)||1,u=ml(d,1/L),n=[-u[1],u[0]],hl=6.5*k,hw=4.2*k,base=sb(b,ml(u,hl));
  return '<path class="'+cls+'" d="M'+pt(a)+"L"+pt(base)+'" fill="none" stroke-width="'+w+'" vector-effect="non-scaling-stroke" stroke-linecap="round"/><path class="'+cls+'h" d="M'+pt(b)+"L"+pt(ad(base,ml(n,hw)))+"L"+pt(sb(base,ml(n,hw)))+'Z"/>';}
function poseAt(A,t){const e=ease(t),o={};for(const k in A.fr)o[k]=A.fr[k];for(const k in A.to){const a=A.fr[k]??0;o[k]=typeof A.to[k]=="number"?a+(A.to[k]-a)*e:A.to[k];}return o;}
function rigAt(A,t){const R=RIGS[A.v](poseAt(A,t));let off=[0,0];if(A.ancR){off=sb(A.anc0,locate(R,A.ancR));}R.off=off;return R;}
const ACT = {
shAbd:{v:"front",bi:1,fr:{sh:6,el:4},to:{sh:92},mus:[[14,.02,.9,mDel]],piv:"armR 0 0",trk:"handR 26 0",zoom:UPZ},
shFlexD:{v:"side",fr:{sh:-6,el:6},to:{sh:90},mus:[[9,.03,.92,mAD]],ant:[[8,.03,.88,mLatS]],piv:"arm 0 0",trk:"hand 26 0",zoom:["head","S","Ht","E","H"],floor:1},
shrug:{v:"back",bi:1,fr:{ev:-2},to:{ev:11},mus:[[9,.04,.94,"head -9 3|scapR 2.5 17"],[8,.04,.94,"nk 12 3|scapR 2 11"]],trk:"scapR 2.5 17.5",zoom:SCAPZ},
retractT:{v:"back",bi:1,fr:{rt:-2},to:{rt:5},mus:[[10,.03,.95,"tho 50 1|scapR -3 9"]],trk:"scapR 0 17",zoom:SCAPZ},
hAdd:{v:"top",bi:1,fr:{h:-8,el:34},to:{h:76},mus:[[14,.03,.86,"tho 16.5 3|armR 10 3.5"]],piv:"armR 0 0",trk:"handR 24 0"},
addP:{v:"front",bi:1,fr:{sh:118,el:12},to:{sh:14},mus:[[12,.03,.9,"tho 34 3|armR 9 -3"],[9,.03,.9,"tho 50 6|armR 10 -2"]],ant:[[10,.02,.9,mDel]],piv:"armR 0 0",trk:"handR 26 0",zoom:UPZ},
protract:{v:"top",bi:1,fr:{h:88,pr:-4},to:{pr:24},mus:[[8,.04,.96,"@serr"]],ant:[[7,.04,.96,"@rhomb"]],trk:"handR 24 0"},
pulldown:{v:"back",bi:1,fr:{sh:166,el:0},to:{sh:40,el:128},mus:[[13,.02,.86,mLatB],[10,.02,.86,mLatB2]],piv:"armR 0 0",trk:"armR 47.6 0",zoom:["head","GHR","GHL","HtR","HtL","ER","EL","Lp","pel"]},
shExtL:{v:"side",fr:{sh:120,el:10},to:{sh:-14},mus:[[12,.02,.88,mLatS]],ant:[[8,.03,.92,mAD]],piv:"arm 0 0",trk:"hand 26 0",zoom:["head","S","Ht","E","H","K"],floor:1},
spineExt:{v:"side",fr:{p:150,hip:30,sf:45,sh:75,el:5},to:{p:180,hip:0,sf:-5,sh:-5},anc:"shin 63 0",mus:[[8,.03,.97,mES]],ant:[[8,.03,.97,mRA]],piv:"tho 0 0",trk:"head 0 0",floor:1,zoom:["head","nb","H","K","Ht"]},
elFlex:{v:"side",fr:{sh:0,el:4},to:{sh:4,el:120},mus:[[8.5,.24,.84,mBi]],ant:[[8,.16,.8,mTri]],piv:"fore 0 0",trk:"hand 26 0",zoom:["S","E","Ht","H","head"]},
elExt:{v:"side",fr:{sh:0,el:120},to:{el:4},mus:[[8.5,.16,.8,mTri]],ant:[[8,.24,.84,mBi]],piv:"fore 0 0",trk:"hand 26 0",zoom:["S","E","Ht","H","head"]},
wrFlex:{v:"side",fr:{el:92,wr:-48},to:{wr:66},mus:[[6.5,.05,.6,mFl]],ant:[[5,.05,.6,mEx]],piv:"hand 0 0",trk:"hand 26 0",zoom:["E","W","Ht","S"]},
wrExt:{v:"side",fr:{el:92,wr:46,pron:1},to:{wr:-52},mus:[[6.5,.05,.6,mEx]],ant:[[5,.05,.6,mFl]],piv:"hand 0 0",trk:"hand 26 0",zoom:["E","W","Ht","S"]},
crunch:{v:"side",fr:{p:-90,sf:-4,hip:40,kn:92,an:-38,sh:-4,el:6},to:{sf:38,nf:24,sh:26},mus:[[9,.03,.97,mRA]],ant:[[7,.03,.97,mES]],piv:"tho 0 0",trk:"tho 58 0",floor:1},
latFlex:{v:"front",fr:{tl:-8,shR:-4,shL:12},to:{tl:26,shR:30,shL:-22},mus:[[10,.03,.95,"tho 34 23|tho 18 21.5|pel 9 20"],[8,.03,.95,"tho 26 19|pel 2 6"]],ant:[[9,.03,.95,"tho 34 -23|tho 18 -21.5|pel 9 -20"]],piv:"tho 0 0",trk:"head 16.6 0",zoom:["head","GHR","GHL","HJR","HJL","KR","KL","HtR","HtL"]},
kickback:{v:"side",fr:Object.assign({hip:12,kn:10},STAND),to:{hip:-32,kn:14},mus:[[15,.02,.92,mGX]],ant:[[7,.03,.82,mPS]],piv:"thigh 0 0",trk:"shin 63 0",floor:1,zoom:LEGZ},
hipAbd:{v:"back",fr:{hpR:0},to:{hpR:38},mus:[[10,.03,.9,mGM2],[9,.03,.9,mGM]],ant:[[8,.04,.9,mAdd]],piv:"thighR 0 0",trk:"shinR 63 0",floor:1,zoom:LEGF},
hipAbdT:{v:"front",fr:{hpR:0},to:{hpR:32},mus:[[8,.02,.24,"pel 10 20|thighR 12 12.5|thighR 50 9.5|shinR 3 6.5",3.2]],ant:[[8,.04,.9,mAdd]],piv:"thighR 0 0",trk:"shinR 63 0",floor:1,zoom:LEGF},
kneeExt:{v:"side",fr:Object.assign({kn:92,an:4},SEAT,SEATF),to:{kn:3},mus:[[9,.05,.72,mVa],[9,.05,.8,mRF]],ant:[[7,.04,.8,mH]],piv:"shin 0 0",trk:"shin 63 0",floor:1,bench:1},
hipFlexRF:{v:"side",fr:Object.assign({hip:-8,kn:3},STAND),to:{hip:62},mus:[[9,.05,.8,mRF]],ant:[[7,.04,.8,mH]],piv:"thigh 0 0",trk:"shin 63 0",floor:1,zoom:LEGZ},
kneeFlex:{v:"side",fr:Object.assign({hip:0,kn:3},STAND),to:{kn:105},mus:[[10,.04,.8,mH]],ant:[[8,.05,.72,mVa]],piv:"shin 0 0",trk:"shin 63 0",floor:1,zoom:LEGZ},
hinge:{v:"side",fr:{p:112,hip:68,sf:8,sh:76,el:5,kn:12,an:12},to:{p:180,hip:0,sf:0,sh:0},anc:"shin 63 0",mus:[[10,.04,.8,mH]],syn:[[13,.02,.92,mGX]],ant:[[7,.03,.84,mPS]],piv:"thigh 0 0",trk:"head 0 0",floor:1},
hipAdd:{v:"front",fr:{hpR:38},to:{hpR:-6},mus:[[9,.04,.9,mAdd],[10,.04,.9,mAddM]],ant:[[9,.03,.9,mGM]],piv:"thighR 0 0",trk:"shinR 63 0",floor:1,zoom:LEGF},
tailor:{v:"side",fr:Object.assign({hip:-4,kn:3},STAND),to:{hip:72,kn:88},mus:[[6,.04,.92,"pel 8 13|thigh 22 8.5|thigh 54 -3|shin 7 -1"]],ant:[[12,.02,.92,mGX]],piv:"thigh 0 0",trk:"shin 63 0",floor:1,zoom:LEGZ},
calfRaise:{v:"side",fr:{an:2},to:{an:-36},anc:"foot 22 -10",mus:[[10,.04,.55,mGa]],ant:[[6,.04,.62,mTA]],piv:"foot 0 0",trk:"foot -9.5 -6",floor:1,zoom:["K","A","toe","heel","H"]},
seatedCalf:{v:"side",fr:Object.assign({kn:90,an:14},SEAT,SEATF),to:{an:-34},mus:[[9,.04,.68,mSo]],ant:[[6,.04,.62,mTA]],piv:"foot 0 0",trk:"foot 29 -6",floor:1,bench:1,zoom:["K","A","toe","heel","H"]},
dorsi:{v:"side",fr:Object.assign({kn:88,an:-30},SEAT,SEATF),to:{an:22},mus:[[7,.04,.62,mTA]],ant:[[9,.04,.68,mSo]],piv:"foot 0 0",trk:"foot 29 -6",floor:1,bench:1,zoom:["K","A","toe","heel","H"]},
shExtD:{v:"side",fr:{sh:60,el:6},to:{sh:-40},mus:[[9,.03,.92,"tho 58 -9|arm 22 -4"]],piv:"arm 0 0",trk:"hand 26 0",zoom:["head","S","Ht","E","H"],floor:1}
};

// 装载一个动作：算好镜头范围、地面、轨迹（只画这块肌肉本身，不画协同肌、拮抗肌）
function loadAct(key, svg) {
  const A = ACT[key];
  if (!A._p) { A._p = 1; A.M = (A.mus || []).map(parseSpec); A.pivR = A.piv ? pref(A.piv) : null; A.trkR = A.trk ? pref(A.trk) : null; A.ancR = A.anc ? pref(A.anc) : null; }
  A.anc0 = A.ancR ? locate(RIGS[A.v](poseAt(A, 0)), A.ancR) : null;
  A.sides = A.bi ? ['R', 'L'] : ['R'];
  const R0 = rigAt(A, 0), R1 = rigAt(A, 1);
  for (const m of A.M) { m.L0 = plen(mPts(R0, m)); m.L1 = plen(mPts(R1, m)); }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, fl = -1e9;
  const bx = (p, r) => { x0 = Math.min(x0, p[0] - r); x1 = Math.max(x1, p[0] + r); y0 = Math.min(y0, p[1] - r); y1 = Math.max(y1, p[1] + r); };
  for (const t of [0, .25, .5, .75, 1]) {
    const R = rigAt(A, t), o = R.off;
    if (A.zoom) for (const k of A.zoom) { if (R.Q[k]) bx(ad(R.Q[k], o), 16); } else for (const f of R.fit) bx(ad(f[0], o), f[1]);
    for (const c of R.cont) fl = Math.max(fl, c[1] + o[1]);
  }
  const sz = Math.max(x1 - x0, y1 - y0, 120) + 28, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  A.vb = [cx - sz / 2, cy - sz / 2, sz, sz]; A.k = sz / 300; A.floorY = A.floor ? fl + (A.bench ? 3 : 0) : null;
  if (A.bench) { const H = R0.Q.H, K = R0.Q.K; A.benchB = [H[0] - 30, H[1] + 12, K[0] - 14]; }
  const tp = [];
  if (A.trkR) for (let i = 0; i <= 28; i++) { const R = rigAt(A, i / 28); tp.push(ad(locate(R, A.trkR), R.off)); }
  svg.setAttribute('viewBox', A.vb.map(f1).join(' '));
  let g = '';
  const [vx, , vs] = A.vb;
  if (A.floorY != null) g += `<rect class="kx-floor" x="${f1(vx - 20)}" y="${f1(A.floorY)}" width="${f1(vs + 40)}" height="${f1(vs)}"/><line class="kx-gline" x1="${f1(vx - 20)}" x2="${f1(vx + vs + 20)}" y1="${f1(A.floorY)}" y2="${f1(A.floorY)}"/>`;
  if (A.bench) { const [b0, by, b1] = A.benchB, fy = A.floorY; g += `<g class="kx-chair"><path d="M${f1(b0)},${f1(by)}H${f1(b1)}v6H${f1(b0)}Z"/><path d="M${f1(b0 + 4)},${f1(by + 6)}h5V${f1(fy)}h-5Z M${f1(b1 - 9)},${f1(by + 6)}h5V${f1(fy)}h-5Z"/></g>`; }
  svg.querySelector('.kx-g0').innerHTML = g;
  let tr = '';
  if (tp.length > 2) {
    const k = A.k, n = tp.length;
    tr += P_('kx-traj', smooth(tp, false), ` fill="none" stroke-dasharray="${f1(4 * k)} ${f1(3.5 * k)}"`);
    const e = tp[n - 1], pr = tp[n - 4];
    tr += arrowS(ad(e, ml(sb(pr, e), 0.01)), e, 'kx-tj', k, 0);
    tr += `<circle class="kx-tjd" cx="${f1(tp[0][0])}" cy="${f1(tp[0][1])}" r="${f1(2.2 * k)}"/>`;
  }
  svg.querySelector('.kx-g2').innerHTML = tr;
  return A;
}
// 画第 t 帧（0 = 放松，1 = 收缩到底）
function renderAt(svg, A, t) {
  const R = rigAt(A, t), k = A.k, o = R.off, tf = `translate(${f1(o[0])},${f1(o[1])})`;
  const gB = svg.querySelector('.kx-g1'), gM = svg.querySelector('.kx-g3');
  gB.setAttribute('transform', tf); gM.setAttribute('transform', tf);
  gB.innerHTML = DRAW[A.v](R);
  let s = '';
  A.M.forEach(m => {
    for (const side of (m.fn || A.bi ? A.sides : ['R'])) {
      const ps = mPts(R, m, side), L = plen(ps), bul = Math.max(.75, Math.min(1.6, Math.pow(m.L0 / L, 0.85)));
      const B = belly(ps, m.w, m.b0, m.b1, bul), tA = subP(ps, 0, m.b0 * L + 0.5), tB = subP(ps, m.b1 * L - 0.5, L);
      s += `<path class="kx-tdn" d="${smooth(tA, false)} ${smooth(tB, false)}" stroke-width="${f1(m.tw)}"/>`;
      if (m.tw > 2.5) s += `<path class="kx-tdn2" d="${smooth(tB, false)}" stroke-width="${f1(m.tw * 0.45)}"/>`;
      const fr = m.L0 === m.L1 ? 1 : Math.max(0, Math.min(1, (m.L0 - L) / (m.L0 - m.L1)));
      s += `<path class="kx-mb" d="${B.d}"/><path class="kx-ma" d="${B.d}" fill-opacity="${(0.2 + 0.8 * fr).toFixed(2)}"/>`;
      let fb = '';
      for (const q of [-0.4, 0.4]) fb += smooth(B.c.slice(3, -3).map(c => ad(c[0], ml(c[1], c[2] * q))), false);
      s += `<path class="kx-mf" d="${fb}"/>`;
    }
  });
  const piv = A.pivR ? locate(R, A.pivR) : null;
  for (const side of A.sides) {
    A.M.forEach((m, mi) => {
      if (m.fn && mi > 0) return;
      const ps = mPts(R, m, side), n = ps.length, ins = ps[n - 1], org = ps[0];
      s += `<circle class="kx-mo" cx="${f1(org[0])}" cy="${f1(org[1])}" r="${f1(2.7 * k)}"/><circle class="kx-mi" cx="${f1(ins[0])}" cy="${f1(ins[1])}" r="${f1(2.7 * k)}"/>`;
      if (mi === 0) {
        const L = plen(ps), b = pAt(ps, Math.max(0, L - Math.min(16, L * .4))), u0 = sb(b, ins), ul = nrm(u0) || 1, u = ml(u0, 1 / ul);
        let nn = [-u[1], u[0]];
        const pv = (side === 'R' ? piv : (A.pivR ? locate(R, A.pivR, 'L') : null)) || [0, 0];
        if ((nn[0] * (ins[0] - pv[0]) + nn[1] * (ins[1] - pv[1])) < 0) nn = ml(nn, -1);
        const st = ad(ins, ml(nn, (m.w * 0.5 + 6) * Math.max(.8, k))), en = ad(st, ml(u, 20 * k));
        s += arrowS(st, en, 'kx-pa', k, 2.4);
      }
    });
  }
  if (piv) for (const side of A.sides) { const p = side === 'R' ? piv : locate(R, A.pivR, 'L'); s += `<circle class="kx-pv" cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(6.5 * k)}"/>`; }
  gM.innerHTML = s;
  // 肌肉现在的长度（相对放松时）
  const m0 = A.M[0];
  return m0 ? Math.round(plen(mPts(R, m0)) / m0.L0 * 100) : 100;
}

// ── 弹窗 ──
const PL = { id: '', ai: 0, A: null, t: 0, dir: 1, hold: .35, last: 0, play: true, raf: 0 };
const SUB = { '前束': '前束', '中束': '中束', '后束': '后束', '上胸': '上胸', '中胸|下胸': '中下胸' };
function open(id, ai, parts, level) {
  const m = AM[id];
  if (!m) return;
  PL.id = id; PL.ai = Math.min(ai || 0, m.a.length - 1);
  const tag = level === 1 ? '<span class="kx-tag l1">今天的主要部位</span>' : level === 2 ? '<span class="kx-tag l2">今天的次要部位</span>' : '';
  openSheet(m.n + (SUB[parts] ? ' · ' + SUB[parts] : ''), `<div class="kx">
    ${tag}
    ${m.a.length > 1 ? `<div class="kx-acts" role="tablist">${m.a.map((a, i) => `<button role="tab" data-ai="${i}" aria-selected="${i === PL.ai}" onclick="ATLAS.pick(${i})">${esc(a[1])}</button>`).join('')}</div>` : ''}
    <div class="kx-stage" onclick="ATLAS.toggle()" role="button" aria-label="暂停 / 继续"><svg class="kx-svg" viewBox="0 0 300 300" role="img" aria-label="${esc(m.n)}收缩动画"><g class="kx-g0"></g><g class="kx-g1"></g><g class="kx-g2"></g><g class="kx-g3"></g></svg>
      <span class="kx-state" id="kx-state"></span></div>
    <div class="kx-leg"><span><i class="o"></i>起点</span><span><i class="i"></i>止点</span><span><i class="a"></i>拉的方向</span></div>
    <div class="kx-move" id="kx-move"></div>
    <div class="kx-h">怎么练</div><div class="chips kx-tr">${m.tr.split('|').map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>
  </div>`);
  load();
}
function load() {
  const m = AM[PL.id], a = m.a[PL.ai], svg = document.querySelector('#sheet-body .kx-svg');
  if (!svg) return;
  document.querySelectorAll('#sheet-body .kx-acts button').forEach((b, i) => b.setAttribute('aria-selected', String(i === PL.ai)));
  $('#kx-move').innerHTML = `<b>收缩时：${esc(a[1])}</b><span>${esc(a[2])}</span>`;
  PL.A = loadAct(a[0], svg);
  PL.t = 0; PL.dir = 1; PL.hold = .35; PL.last = 0; PL.play = !REDUCED();
  if (!PL.play) PL.t = .65;
  frame(svg);
  cancelAnimationFrame(PL.raf);
  PL.raf = requestAnimationFrame(loop);
}
function frame(svg) {
  const len = renderAt(svg, PL.A, PL.t);
  const st = $('#kx-state');
  if (st) st.textContent = !PL.play ? `已暂停 · 长度 ${len}%` : PL.dir > 0 ? `收缩：变短 ${len}%` : `放松：被拉长 ${len}%`;
}
function loop(ts) {
  const svg = document.querySelector('#sheet-body .kx-svg');
  if (!svg || !$('#sheet-bg').classList.contains('open')) return;   // 弹窗关了就停
  if (PL.play) {
    const dt = PL.last ? Math.min(0.05, (ts - PL.last) / 1000) : 0;
    PL.last = ts;
    if (PL.hold > 0) PL.hold -= dt;
    else {
      PL.t += PL.dir * dt / 1.7;
      if (PL.t >= 1) { PL.t = 1; PL.dir = -1; PL.hold = 0.7; } else if (PL.t <= 0) { PL.t = 0; PL.dir = 1; PL.hold = 0.5; }
    }
    frame(svg);
  }
  PL.raf = requestAnimationFrame(loop);
}
function pick(i) { PL.ai = i; load(); }
function toggle() { PL.play = !PL.play; PL.last = 0; const svg = document.querySelector('#sheet-body .kx-svg'); if (svg) frame(svg); }
return { AM, ACT, open, pick, toggle, loadAct, renderAt, rigAt, mPts, plen, poseAt };
})();

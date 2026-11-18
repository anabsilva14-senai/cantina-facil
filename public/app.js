/* Cantina Fácil - site (front-end). Conversa com o servidor pela API em /api */
const API="/api";
const IMG={};[1,2,3,4,5,6,7,8,9,10,11,12].forEach(i=>IMG[i]="img/"+i+".webp");
const LOGO_L="img/logo-claro.webp",LOGO_D="img/logo-escuro.webp",HERO="img/hero.jpg";
const MENU=[
{id:1,c:"Lanches",n:"Sanduíche natural",d:"Peito de peru, queijo branco e salada",p:6,s:6},
{id:2,c:"Lanches",n:"Misto quente",d:"Queijo e presunto no pão de forma",p:5.5,s:5},
{id:3,c:"Salgados",n:"Pão de queijo",d:"Porção com 4 unidades",p:3.5,s:10},
{id:9,c:"Salgados",n:"Coxinha de frango",d:"Frita na hora, bem recheada",p:5,s:10},
{id:10,c:"Salgados",n:"Pastel assado de queijo",d:"Massa crocante, queijo derretido",p:5,s:2},
{id:4,c:"Bebidas",n:"Suco de laranja",d:"Copo de 300 ml, natural",p:4,s:8},
{id:5,c:"Bebidas",n:"Suco de uva",d:"Copo de 300 ml, gelado",p:4,s:8},
{id:6,c:"Bebidas",n:"Água mineral",d:"Garrafa de 500 ml",p:2.5,s:12},
{id:11,c:"Bebidas",n:"Achocolatado",d:"Caixinha de 200 ml",p:3,s:10},
{id:7,c:"Doces",n:"Bolo de cenoura",d:"Fatia com cobertura de chocolate",p:4.5,s:0},
{id:8,c:"Doces",n:"Salada de frutas",d:"Porção com frutas da estação",p:5,s:4},
{id:12,c:"Doces",n:"Maçã",d:"Fruta inteira, bem fresquinha",p:2.5,s:8}];
const COMBOS=[{id:1,n:"Combo Intervalo",main:1,p:9},{id:2,n:"Combo Quentinho",main:2,p:8.5},{id:3,n:"Combo Lanchinho",main:3,p:6.5}];
const JUICES=[4,5],CATS=["Todos","Combos","Lanches","Salgados","Bebidas","Doces"],STAT=["Recebido","Em preparo","Pronto","Entregue"];
const BREAKS=[{n:"da tarde",s:900,e:920},{n:"da noite",s:1200,e:1220}];
const SIMS=[null,{m:895,l:"antes (14:55)"},{m:905,l:"durante (15:05)"},{m:916,l:"quase no fim (15:16)"}];
/* dados vindos do servidor */
let D={stock:{},queue:0,pop:[1,9,4],mine:null,orders:[],board:{prep:[],rdy:[]},ok:true};
const V={user:null,token:null,tab:"menu",cat:"Todos",cart:{},juice:{},when:"now",mine:null,atab:"ped",codes:{},cerr:{},last:null,lt:"est",f:{name:"",turma:"",pin:""},err:"",q:"",dis:{},cc:false,tv:location.hash==="#senhas",sim:null,simI:0,seen:null,snd:true,edit:null,sc:{}};
try{const s=JSON.parse(sessionStorage.getItem("cf-sess"));if(s){V.user=s.user;V.token=s.token}}catch(e){}
try{V.mine=JSON.parse(localStorage.getItem("cf-mine"))}catch(e){}
try{const l=JSON.parse(localStorage.getItem("cf-last"));if(l){V.f.name=l.name||"";V.f.turma=l.turma||""}}catch(e){}
const keep=()=>{try{sessionStorage.setItem("cf-sess",JSON.stringify(V.user?{user:V.user,token:V.token}:null));if(V.mine)localStorage.setItem("cf-mine",JSON.stringify(V.mine));else localStorage.removeItem("cf-mine");if(V.user&&V.user.role==="est")localStorage.setItem("cf-last",JSON.stringify({name:V.user.name,turma:V.user.turma||""}))}catch(e){}};
addEventListener("hashchange",()=>{V.tv=location.hash==="#senhas";render()});
const P=id=>MENU.find(m=>m.id==id),CB=id=>COMBOS.find(c=>c.id==id);
const money=v=>"R$ "+v.toFixed(2).replace(".",",");
const pad=n=>String(n).padStart(3,"0");
const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const hhmm=m=>String(Math.floor(m/60)%24).padStart(2,"0")+":"+String(Math.floor(m%60)).padStart(2,"0");
const fmtIn=x=>x<60?Math.ceil(x)+" min":Math.floor(x/60)+" h "+Math.round(x%60)+" min";
/* carrinho: chave "p4" (produto) ou "c1:4" (combo 1 com suco 4) */
const parts=k=>k[0]==="p"?[+k.slice(1)]:[CB(k.slice(1).split(":")[0]).main,+k.split(":")[1]];
const price=k=>k[0]==="p"?P(k.slice(1)).p:CB(k.slice(1).split(":")[0]).p;
const full=k=>parts(k).reduce((a,i)=>a+P(i).p,0);
const nameOf=k=>k[0]==="p"?P(k.slice(1)).n:CB(k.slice(1).split(":")[0]).n+" ("+P(k.split(":")[1]).n.toLowerCase()+")";
const cnt=()=>Object.values(V.cart).reduce((a,b)=>a+b,0);
const sub=()=>Object.entries(V.cart).reduce((a,[k,q])=>a+price(k)*q,0);
const disc=()=>Math.round(sub()*10)/100;
const totl=()=>sub()-disc();
const saved=()=>disc()+Object.entries(V.cart).reduce((a,[k,q])=>a+(full(k)-price(k))*q,0);
const demand=()=>{const d={};Object.entries(V.cart).forEach(([k,q])=>parts(k).forEach(i=>d[i]=(d[i]||0)+q));return d};
const mine=()=>D.mine;
const held=i=>{if(!V.edit)return 0;let n=0;Object.entries(V.edit.items).forEach(([k,q])=>parts(k).forEach(p=>{if(p==i)n+=q}));return n};
const av=i=>(D.stock[i]||0)+held(i);
const list=o=>Object.entries(o.items).map(([k,q])=>q+"× "+nameOf(k));
/* horário e intervalo (o botão Demo simula outro horário) */
function clock(){if(V.sim)return V.sim.m+(Date.now()-V.sim.at)/60000;const d=new Date();return d.getHours()*60+d.getMinutes()+d.getSeconds()/60}
function brk(){const m=clock();
for(const b of BREAKS)if(m>=b.s&&m<b.e)return{k:"on",b,left:b.e-m};
for(const b of BREAKS)if(m<b.s)return{k:b.s-m<=10?"soon":"off",b,inn:b.s-m};
return{k:"off",b:BREAKS[0],inn:1440-m+BREAKS[0].s}}
function cycleSim(){V.simI=(V.simI+1)%4;const s=SIMS[V.simI];V.sim=s?{m:s.m,at:Date.now()}:null;render()}
function banner(){const B=brk();let c=B.k,t;
if(B.k==="on"){c=B.left<=5?"late":"on";t=`<b>Intervalo ${B.b.n}</b>: faltam ${Math.ceil(B.left)} min para o fim`}
else if(B.k==="soon")t=`<b>O intervalo começa em ${Math.ceil(B.inn)} min</b> (${hhmm(B.b.s)}). Peça agora e retire quando o sinal tocar.`;
else t=`Próximo intervalo às <b>${hhmm(B.b.s)}</b>, em ${fmtIn(B.inn)}. Você pode pedir a qualquer hora.`;
return `<div class="brk ${c}"><span>${t}</span><button class="sim" onclick="cycleSim()">Demo: ${V.simI?SIMS[V.simI].l:"horário real"}</button></div>`}
let AC;function beep(){if(!V.snd)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),g=AC.createGain();o.connect(g);g.connect(AC.destination);o.frequency.value=880;g.gain.value=.12;o.start();o.stop(AC.currentTime+.25)}catch(e){}}
function toast(t){const e=document.getElementById("toast");e.innerHTML='<div class="toast" role="status">'+esc(t)+'</div>';clearTimeout(toast.t);toast.t=setTimeout(()=>e.innerHTML="",3800)}
const set=(k,v)=>{V[k]=v;V.cc=false;render();scrollTo(0,0)};
/* comunicação com o servidor */
async function api(method,path,body){
const h={"Content-Type":"application/json"};if(V.token)h.Authorization="Bearer "+V.token;
let r;try{r=await fetch(API+path,{method,headers:h,body:body?JSON.stringify(body):undefined})}catch(e){throw{msg:"Sem conexão com o servidor."}}
let j={};try{j=await r.json()}catch(e){}
if(!r.ok)throw{msg:j.error||"Algo deu errado. Tente de novo.",status:r.status};return j}
let sig="";
async function poll(force){
if(document.hidden&&!force)return;
try{const q=new URLSearchParams();if(V.mine){q.set("num",V.mine.num);q.set("code",V.mine.code)}
if(V.user&&V.user.role==="est"){q.set("name",V.user.name);q.set("turma",V.user.turma||"")}
const qs=q.toString(),s=await api("GET","/state"+(qs?"?"+qs:""));
D.stock=s.stock;MENU.forEach(m=>m.p=s.prices[m.id]/100);COMBOS.forEach(c=>c.p=s.combos[c.id]/100);
D.queue=s.queue;D.pop=s.pop;D.mine=s.mine||null;D.orders=s.orders||[];D.board=s.board;
/* o pedido do aluno fica guardado no aparelho e, se sumir de lá, o servidor devolve pelo nome+turma */
if(V.user&&V.user.role==="est"){const m=s.mine;if(m){if(!V.mine||V.mine.num!==m.num||V.mine.code!==m.code){V.mine={num:m.num,code:m.code,name:m.name,turma:m.turma};keep()}}else if(V.mine){V.mine=null;keep()}}
const wasOff=!D.ok;D.ok=true;const j=JSON.stringify(s);
if(j!==sig||force||wasOff){sig=j;render()}
}catch(e){if(e.status===401&&V.token){logout();toast("Sua sessão acabou. Entre de novo.");return}if(D.ok){D.ok=false;render()}}}
async function run(fn,okMsg){try{await fn();if(okMsg)toast(okMsg)}catch(e){toast(e.msg||"Erro.")}await poll(true)}
async function login(){
if(V.lt==="est"){const n=V.f.name.trim();if(n.length<2){V.err="Digite seu nome para entrar.";render();return}
const t=V.f.turma.trim();V.user={role:"est",name:n,turma:t};V.tab="menu";V.last=null;
if(V.mine&&((V.mine.name||"").toLowerCase()!==n.toLowerCase()||(V.mine.turma||"").toLowerCase()!==t.toLowerCase()))V.mine=null}
else{try{const r=await api("POST","/login",{pin:V.f.pin.trim()});V.token=r.token;V.user={role:"att",name:"Atendente"};V.atab="ped";V.seen=null}
catch(e){V.err=e.status===401?"PIN incorreto. Peça o PIN para quem cuida da cantina.":e.msg;render();return}}
V.err="";V.f.pin="";keep();await poll(true);scrollTo(0,0)}
/* ao sair, o pedido continua guardado no aparelho (V.mine não é apagado) */
function logout(){V.user=null;V.token=null;V.edit=null;V.cart={};V.err="";V.last=null;V.sc={};keep();render()}
function add(k,dq){const q=(V.cart[k]||0)+dq;
if(dq>0){const d=demand();for(const i of parts(k))if((d[i]||0)+dq>av(i)){toast("Acabou: "+P(i).n+".");return}}
if(q<=0)delete V.cart[k];else V.cart[k]=q;render()}
async function confirmar(){
if(!V.edit&&D.mine&&D.mine.st<3){toast("Você já tem o pedido #"+pad(D.mine.num)+" em andamento. Espere a entrega ou cancele para fazer outro.");set("tab","track");return}
const B=brk(),body={name:V.user.name,turma:V.user.turma,items:{...V.cart},when:(V.when==="break"&&B.k!=="on")?"break":"now",at:hhmm(B.b.s)};
try{
if(V.edit){const r=await api("PUT","/orders/"+V.edit.num,{...body,code:V.mine.code});V.edit=null;V.cart={};V.when="now";V.tab="track";toast("Pedido #"+pad(r.num)+" alterado.")}
else{const r=await api("POST","/orders",body);V.mine={num:r.num,code:r.code,name:V.user.name};V.cart={};V.when="now";V.tab="track";V.last=0;toast("Pedido #"+pad(r.num)+" enviado para a cantina.")}
keep();await poll(true);scrollTo(0,0)}
catch(e){toast(e.msg);if(e.status===409&&V.edit){V.edit=null;V.cart={};V.tab="track"}await poll(true)}}
function editar(n){const o=D.mine;if(!o||o.st!==0){toast("O pedido já entrou em preparo e não pode mais ser alterado.");render();return}
V.edit={num:n,items:{...o.items}};V.cart={...o.items};V.when=o.when;V.cc=false;V.tab="menu";render();scrollTo(0,0)}
function descartarEdicao(){V.edit=null;V.cart={};V.when="now";V.tab="track";render();scrollTo(0,0)}
const cancel=(n,why)=>run(async()=>{await api("POST","/orders/"+n+"/cancel",V.user.role==="att"?{reason:why}:{code:V.mine.code});V.cc=false},"Pedido #"+pad(n)+" cancelado.");
const setSt=(n,s)=>run(()=>api("POST","/orders/"+n+"/status",{status:s}));
async function entregar(n){try{await api("POST","/orders/"+n+"/deliver",{code:(V.codes[n]||"").trim()});delete V.cerr[n];toast("Pedido #"+pad(n)+" entregue.")}
catch(e){if(e.status===400){V.cerr[n]=e.msg}else toast(e.msg)}await poll(true)}
const stk=id=>run(()=>api("POST","/products/"+id+"/stock",{stock:(D.stock[id]||0)>0?0:6}));
const demo=()=>run(()=>api("POST","/demo"));
const reset=()=>run(async()=>{await api("POST","/reset");V.mine=null;V.dis={};keep()},"Dados reiniciados.");
/* telas (visual novo) */
V.ae=null;
const S=p=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
const ic={menu:S('<path d="M4 6h16M4 12h16M4 18h10"/>'),bag:S('<path d="M5 8h14l-1 12H6zM9 8a3 3 0 016 0"/>'),trk:S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),back:S('<path d="M15 5l-7 7 7 7"/>')};
const back=()=>`<button class="back" onclick="set('tab','menu')">${ic.back}Voltar ao cardápio</button>`;
const dem=its=>{const d={};Object.entries(its).forEach(([k,q])=>parts(k).forEach(i=>d[i]=(d[i]||0)+q));return d};
function header(){const att=V.user.role==="att",t=V.tab,o=att?null:mine();
const pill=o&&o.st<3?`<button class="pill" onclick="set('tab','track')">Senha #${pad(o.num)}</button>`:"";
return `<header class="top"><img src="${LOGO_D}" alt="Cantina Fácil">${att?'<span style="font-weight:800;font-style:italic">Painel da atendente</span>':`<nav class="tnav" aria-label="Seções"><button class="${t!=="track"?"on":""}" onclick="set('tab','menu')">Cardápio</button><button class="${t==="track"?"on":""}" onclick="set('tab','track')">Meu pedido</button></nav>`}<div class="sp"></div>${pill}<div class="who"><span>${esc(V.user.name)}${V.user.turma?", "+esc(V.user.turma):""}</span><button class="out" onclick="logout()">Sair</button></div></header>`}
function loginV(){const e=V.lt==="est";
return `<div class="login"><div class="vis"><img src="${HERO}" alt="Celular exibindo o aplicativo Cantina, pedidos digitais escolares"><p>Escolha, peça e retire sem enfrentar fila.</p></div><div class="form"><form class="fb" onsubmit="event.preventDefault();login()"><div class="logo"><img src="${LOGO_L}" alt="Cantina Fácil"></div><h1>Entrar</h1><p class="sub">${e?"Diga quem você é para fazer o pedido. O pagamento é na retirada.":"Acesse o painel para cuidar dos pedidos."}</p>
<div class="seg"><button type="button" class="${e?"on":""}" onclick="V.lt='est';V.err='';render()">Estudante</button><button type="button" class="${!e?"on":""}" onclick="V.lt='att';V.err='';render()">Atendente</button></div>
${e?`<label class="f" for="fn">Nome</label><input type="text" id="fn" autocomplete="given-name" placeholder="Ex.: Maria Souza" value="${esc(V.f.name)}" oninput="V.f.name=this.value"><label class="f" for="ft">Turma (opcional)</label><input type="text" id="ft" placeholder="Ex.: 8º B" value="${esc(V.f.turma)}" oninput="V.f.turma=this.value">`:`<label class="f" for="fp">PIN de acesso</label><input type="password" id="fp" inputmode="numeric" maxlength="4" placeholder="4 dígitos" value="${esc(V.f.pin)}" oninput="V.f.pin=this.value"><p class="mut" style="margin:8px 0 0">Peça o PIN para quem cuida da cantina.</p>`}
${V.err?`<div class="err" role="alert">${esc(V.err)}</div>`:""}<button class="btn w" type="submit" style="margin-top:22px">Entrar</button><button class="lk" type="button" onclick="V.tv=true;render()">Abrir a tela de senhas da cantina (TV)</button></form></div></div>`}
const ctl=(k,q)=>q?`<div class="stp"><button aria-label="Tirar um" onclick="add('${k}',-1)">−</button><b>${q}</b><button aria-label="Adicionar um" onclick="add('${k}',1)">+</button></div>`:`<button class="btn sm" onclick="add('${k}',1)">Adicionar</button>`;
function prow(p){const s=av(p.id),k="p"+p.id,q=V.cart[k]||0;
const bg=s<=0?'<span class="bg">Esgotado</span>':s<=3?`<span class="bg lo">Restam ${s}</span>`:"";
return `<div class="row ${s<=0?"out":""}"><div class="ph"><img src="${IMG[p.id]}" alt="${p.n}" loading="lazy">${bg}</div><div class="rt"><div class="ln"><span class="nm">${p.n}</span><i></i><b class="pc">${money(p.p)}</b></div><div class="ds">${p.d}</div><div class="rc"><span></span>${s<=0?'<span class="mut">Indisponível</span>':ctl(k,q)}</div></div></div>`}
function crow(c){let j=V.juice[c.id]||4;if(av(j)<=0)j=j===4?5:4;
const k=`c${c.id}:${j}`,q=V.cart[k]||0,out=av(c.main)<=0||(av(4)<=0&&av(5)<=0);
const jj=JUICES.map(i=>`<button class="${i===j?"on":""}" ${av(i)<=0?"disabled":""} onclick="V.juice[${c.id}]=${i};render()">${i===4?"Laranja":"Uva"}</button>`).join("");
return `<div class="row cmb ${out?"out":""}"><div class="ph"><div class="duo"><img src="${IMG[c.main]}" alt=""><img src="${IMG[j]}" alt=""></div></div><div class="rt"><div class="ln"><span class="nm">${c.n}</span><i></i><b class="pc">${money(c.p)}<span class="old">${money(full(k))}</span></b></div><div class="ds">${P(c.main).n} + suco</div><div class="rc"><div class="jc" role="group" aria-label="Sabor do suco">${jj}</div>${out?'<span class="mut">Indisponível</span>':ctl(k,q)}</div></div></div>`}
function popular(){return D.pop.map(P)}
function menuV(){const c=V.cat;
let h=`<h1>Oi, ${esc(V.user.name.split(" ")[0])}. O que vai ser?</h1><p class="sub">Veja o que ainda tem antes de sair da sala. Retire no balcão e pague na hora. Estudante paga 10% a menos.</p>${V.edit?`<div class="note">Você está alterando o pedido <b>#${pad(V.edit.num)}</b>. Mude os itens e toque em "Salvar alteração".<div style="margin-top:8px"><button class="sim" onclick="descartarEdicao()">Descartar alteração</button></div></div>`:""}${banner()}<div class="chips">${CATS.map(x=>`<button class="chip ${x===c?"on":""}" onclick="V.cat='${x}';render()">${x}</button>`).join("")}</div><div class="menu">`;
if(c==="Todos"||c==="Combos")h+=`<div class="sec"><span>Combos do intervalo</span></div>`+COMBOS.map(crow).join("");
if(c==="Todos")h+=`<div class="sec"><span>Mais pedidos hoje</span></div>`+popular().map(prow).join("");
const l=MENU.filter(m=>c==="Todos"||m.c===c);
if(l.length){if(c==="Todos")h+=`<div class="sec"><span>Cardápio completo</span></div>`;h+=l.map(prow).join("")}
return h+"</div>"}
function cartPanel(){const e=Object.entries(V.cart);
if(!e.length)return '<div class="empty"><p>Sua comanda está vazia. Escolha algo no cardápio.</p></div>';
const B=brk(),est=3*(D.queue+1);
let h=e.map(([k,q])=>`<div class="cl"><div><b>${esc(nameOf(k))}</b><div class="mut">${money(price(k))} cada</div><button class="rm" onclick="add('${k}',-${q})">Remover</button></div><div style="text-align:right"><div class="stp"><button aria-label="Diminuir" onclick="add('${k}',-1)">−</button><b>${q}</b><button aria-label="Aumentar" onclick="add('${k}',1)">+</button></div><div style="font-weight:800;margin-top:4px">${money(price(k)*q)}</div></div></div>`).join("");
h+=`<div class="ln2" style="margin-top:8px"><span>Subtotal</span><span>${money(sub())}</span></div><div class="ln2"><span>Desconto de estudante (10%)</span><span class="sv">− ${money(disc())}</span></div><div class="total"><span>A pagar</span><span>${money(totl())}</span></div><div class="sv" style="text-align:right">Você economiza ${money(saved())}</div>`;
if(B.k!=="on")h+=`<div style="margin-top:14px;font-weight:800">Quando retirar?</div><button class="opt ${V.when!=="break"?"on":""}" onclick="V.when='now';render()"><b>Assim que ficar pronto</b><span>Previsão de ${est} min</span></button><button class="opt ${V.when==="break"?"on":""}" onclick="V.when='break';render()"><b>No começo do intervalo (${hhmm(B.b.s)})</b><span>Já fica pronto quando o sinal tocar</span></button>`;
else if(est>B.left)h+=`<div class="note bad">A previsão (${est} min) passa do fim do intervalo. Seu pedido pode não ficar pronto a tempo.</div>`;
return h+`<div class="note">Pedido no nome de <b>${esc(V.user.name)}</b>. Você paga no balcão, na hora de retirar.</div><button class="btn w" onclick="confirmar()">${V.edit?"Salvar alteração":"Confirmar pedido"}</button>${V.edit?'<button class="btn w pa" style="margin-top:10px" onclick="descartarEdicao()">Descartar alteração</button>':""}`}
const revV=()=>back()+'<h1>Sua comanda</h1><p class="sub">Confira, mude as quantidades ou tire o que não quiser.</p><div class="cmd"><h2>Comanda</h2><div class="in">'+cartPanel()+'</div></div>';
function trackV(){const o=mine();
if(!o)return back()+'<div class="empty"><h1>Nenhum pedido por aqui</h1><p>Quando você confirmar um pedido, a senha e a situação aparecem nesta tela.</p><button class="btn" onclick="set(\'tab\',\'menu\')">Fazer um pedido</button></div>';
if(o.st===4)return back()+`<h1>Pedido cancelado</h1><div class="tk"><div class="stub">Senha</div><div class="mn"><div class="num" style="opacity:.45">#${pad(o.num)}</div><div style="font-weight:600">${esc(o.why||"Pedido cancelado.")}</div><div class="mut">Os itens voltaram ao estoque e você não paga nada.</div></div></div><button class="btn w" style="margin-top:16px" onclick="set('tab','menu')">Fazer novo pedido</button>`;
const q=o.ahead||0,est=3*(q+1),B=brk(),br=o.when==="break";
const msg=[br?`Recebemos seu pedido. Vamos deixar pronto para o começo do intervalo (${o.at}).`:`Recebemos seu pedido. ${q?q+" pedido(s) na sua frente. ":"Você é o próximo. "}Previsão de ${est} min.`,
br?`Estamos preparando e fica pronto às ${o.at}.`:"Estamos preparando. Falta pouco, uns 3 min.",
"Pronto! Vá ao balcão, diga seu nome e o código abaixo e pague na retirada.","Pedido entregue. Bom lanche!"][o.st];
const risk=B.k==="on"&&o.st<2&&!br&&est>B.left?`<div class="note bad">A previsão passa do fim do intervalo. Seu pedido pode não ficar pronto a tempo.</div>`:"";
const can=o.st===0?(V.cc?`<div class="note bad">Cancelar este pedido? Você não paga nada.<div style="display:flex;gap:8px;margin-top:8px"><button class="btn sm rd" onclick="cancel(${o.num},'Você cancelou o pedido.')">Sim, cancelar</button><button class="btn sm pa" onclick="V.cc=false;render()">Manter</button></div></div>`:`<div style="display:flex;gap:10px;margin-bottom:16px"><button class="btn pa" style="flex:1" onclick="editar(${o.num})">Alterar pedido</button><button class="btn rd" style="flex:1" onclick="V.cc=true;render()">Cancelar pedido</button></div>`):(o.st===1?`<div class="note">Seu pedido já está sendo preparado e não dá mais para alterar nem cancelar pelo app. Se precisar, fale com a atendente.</div>`:"");
return back()+`<h1>Acompanhe seu pedido</h1><p class="sub">Esta tela atualiza sozinha.</p>${can}<div class="tk ${o.st===2?"rdy":""}"><div class="stub">Senha</div><div class="mn"><div><div class="mut">A atendente vai chamar este número</div><div class="num">#${pad(o.num)}</div></div><div><div class="track" aria-hidden="true">${STAT.map((s,i)=>`<i class="${i<o.st?"d":i===o.st?"a":""}"></i>`).join("")}</div><div class="tl">${STAT.map((s,i)=>`<span class="${i===o.st?"a":""}">${s}</span>`).join("")}</div></div><div role="status" style="font-weight:700">${msg}</div>${risk}${o.alt?'<div class="note">Este pedido foi alterado. Confira os itens abaixo.</div>':""}<div><div class="mut" style="margin-bottom:4px">Código de retirada, diga só no balcão</div><div class="code">${o.code}</div></div><div class="kv"><span>Nome</span><b>${esc(o.name)}</b></div><div class="kv"><span>Itens</span><b>${list(o).map(esc).join("<br>")}</b></div>${br?`<div class="kv"><span>Retirada</span><b>Começo do intervalo (${o.at})</b></div>`:""}<div class="kv"><span>Desconto de estudante</span><b>− ${money(o.disc)}</b></div><div class="kv"><span>A pagar na retirada</span><b>${money(o.total)}</b></div></div></div>${o.st>=3?`<button class="btn w" style="margin-top:16px" onclick="set('tab','menu')">Fazer novo pedido</button>`:""}`}
const overlay=o=>`<div class="ov" role="alertdialog" aria-label="Pedido pronto"><div style="font-size:1.6rem;font-weight:900;font-style:italic">Seu pedido está pronto!</div><div>Sua senha</div><div class="num">#${pad(o.num)}</div><div>Diga seu nome e este código no balcão:</div><div class="code">${o.code}</div><div style="font-weight:800;font-size:1.2rem">Pague ${money(o.total)}</div><button class="btn pa" onclick="V.dis[${o.num}]=1;render()">Entendi</button></div>`;
function student(){const c=cnt(),t=V.tab,two=t!=="track",o=mine();
const side=two?`<aside class="side only-d"><div class="cmd"><h2>Sua comanda</h2><div class="in">${cartPanel()}</div></div></aside>`:"";
const main=t==="menu"?menuV():t==="rev"?`<div class="only-m">${revV()}</div><div class="only-d">${menuV()}</div>`:trackV();
const bar=t==="menu"&&c?`<div class="sticky"><button class="cartbar" onclick="set('tab','rev')"><span>Ver comanda (${c} ${c>1?"itens":"item"})</span><span>${money(totl())}</span></button></div>`:"";
const tb=(k,l,i,n)=>`<button class="${t===k?"on":""}" onclick="set('tab','${k}')">${ic[i]}${l}${n?`<span class="cnt">${n}</span>`:""}</button>`;
return header()+`<div class="shell ${two?"wide two":""}"><div>${main}</div>${side}</div>${bar}<nav class="tabs" aria-label="Navegação">${tb("menu","Cardápio","menu")}${tb("rev","Comanda","bag",c)}${tb("track","Acompanhar","trk",o&&o.st<3?"#"+pad(o.num):0)}</nav>${o&&o.st===2&&!V.dis[o.num]?overlay(o):""}`}
/* atendente */
const wait=o=>Math.floor((Date.now()-o.t)/60000);
const subOf=its=>Object.entries(its).reduce((a,[k,q])=>a+price(k)*q,0);
function aEdit(n){const o=D.orders.find(x=>x.num===n);if(!o||o.st>1){toast("Este pedido não pode mais ser editado.");render();return}V.ae={num:n,orig:{...o.items},items:{...o.items}};render()}
function aSet(k,d){const its=V.ae.items,q=(its[k]||0)+d;
if(d>0){const x=dem({...its,[k]:q}),old=dem(V.ae.orig);for(const i of parts(k))if(x[i]>D.stock[i]+(old[i]||0)){toast("Estoque insuficiente: "+P(i).n+".");return}}
if(q<=0)delete its[k];else its[k]=q;render()}
function aAdd(n){aSet(document.getElementById("as"+n).value,1)}
async function aSave(){const its=V.ae.items;if(!Object.keys(its).length){toast("O pedido ficou sem itens. Use Cancelar pedido.");return}
try{await api("PUT","/orders/"+V.ae.num+"/items",{items:its});toast("Pedido #"+pad(V.ae.num)+" atualizado.");V.ae=null}catch(e){toast(e.msg)}await poll(true)}
function aeCard(o){const its=V.ae.items,s=subOf(its),dc=Math.round(s*10)/100;
return `<div class="oc"><div class="h"><span class="sn">#${pad(o.num)}</span><span class="w mid">Editando</span></div><div style="font-weight:800;margin-top:4px">${esc(o.name)}</div>${Object.entries(its).map(([k,q])=>`<div class="cl"><div><b>${esc(nameOf(k))}</b><div class="mut">${money(price(k))} cada</div></div><div style="text-align:right"><div class="stp"><button aria-label="Tirar um" onclick="aSet('${k}',-1)">−</button><b>${q}</b><button aria-label="Adicionar um" onclick="aSet('${k}',1)">+</button></div><button class="rm" onclick="aSet('${k}',-${q})">Remover</button></div></div>`).join("")||'<div class="mut" style="padding:8px 0">Sem itens.</div>'}<div class="row2"><select id="as${o.num}" aria-label="Item para adicionar">${MENU.map(m=>`<option value="p${m.id}">${m.n} (${money(m.p)})${D.stock[m.id]<=0?" - esgotado":""}</option>`).join("")}</select><button class="btn sm pa" onclick="aAdd(${o.num})">Adicionar item</button></div><div class="ln2" style="margin-top:8px"><b>Novo total</b><b>${money(s-dc)}</b></div><div class="row2"><button class="btn sm ok" onclick="aSave()">Salvar alterações</button><button class="btn sm pa" onclick="V.ae=null;render()">Cancelar edição</button></div></div>`}
function card(o){if(V.ae&&V.ae.num===o.num)return aeCard(o);
const cls=o.st===2?"r":o.st===1?"p":"",w=wait(o),wc=o.st<2?(w>=8?"hi":w>=5?"mid":""):"";
const th=Object.keys(o.items).map(k=>parts(k).map(i=>`<img src="${IMG[i]}" alt="">`).join("")).join("");
const cx=`<button class="btn sm rd" onclick="cancel(${o.num},'A cantina cancelou o pedido porque um item acabou. Você não paga nada.')">Cancelar pedido</button>`,ed=`<button class="btn sm pa" onclick="aEdit(${o.num})">Editar itens</button>`;
let a="";
if(o.st===0)a=`<div class="row2"><button class="btn sm bk" onclick="setSt(${o.num},1)">Em preparo</button>${ed}${cx}</div>`;
if(o.st===1)a=`<div class="row2"><button class="btn sm" onclick="setSt(${o.num},2)">Pronto</button>${ed}${cx}</div>`;
if(o.st===2)a=`<div class="rec">Receber ${money(o.total)}</div><div class="row2"><input type="text" id="c${o.num}" inputmode="numeric" maxlength="4" placeholder="Código" aria-label="Código do estudante" value="${esc(V.codes[o.num]||"")}" oninput="V.codes[${o.num}]=this.value"><button class="btn sm ok" onclick="entregar(${o.num})">Entregue</button></div>${V.cerr[o.num]?`<div class="err" role="alert">${V.cerr[o.num]}</div>`:""}<div class="row2"><button class="btn sm pa" onclick="V.sc[${o.num}]=!V.sc[${o.num}];render()">${V.sc[o.num]?"Esconder código":"Ver código"}</button><button class="btn sm rd" onclick="if(confirm('Cancelar o pedido #${pad(o.num)}? Os itens voltam ao estoque.'))cancel(${o.num},'A cantina cancelou o pedido porque ele não foi retirado.')">Cancelar pedido</button></div>${V.sc[o.num]?`<div class="rec">Código: ${esc(o.code)}</div>`:""}`;
return `<div class="oc ${cls}"><div class="h"><span class="sn">#${pad(o.num)}</span>${o.st<2?`<span class="w ${wc}">há ${w} min</span>`:""}</div><div style="font-weight:800;margin-top:4px">${esc(o.name)}${o.turma?", "+esc(o.turma):""}</div>${o.when==="break"?`<span class="tag">Retirar às ${o.at}</span> `:""}${o.alt?'<span class="tag">Alterado</span>':""}<div class="th">${th}</div><ul>${list(o).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>${a}</div>`}
function attendant(){
const q=V.q.trim().toLowerCase().replace("#",""),hit=o=>!q||o.name.toLowerCase().includes(q)||pad(o.num).includes(q)||String(o.num)===q;
const col=(s,t)=>{const l=D.orders.filter(o=>o.st===s&&hit(o));return `<section class="col"><h2>${t}<span>${l.length}</span></h2>${l.length?l.map(card).join(""):'<div class="mut" style="padding:8px 4px">Nenhum pedido aqui.</div>'}</section>`};
const act=D.orders.filter(o=>o.st<2),need={};
act.forEach(o=>Object.entries(o.items).forEach(([k,n])=>parts(k).forEach(i=>need[i]=(need[i]||0)+n)));
const avg=act.length?Math.round(act.reduce((a,o)=>a+wait(o),0)/act.length):0,B=brk();
const closed=D.orders.filter(o=>o.st>=3&&hit(o));
const strip=`<div class="strip"><div class="sb"><b>${act.length}</b><span>Na fila</span></div><div class="sb"><b>${D.orders.filter(o=>o.st===2).length}</b><span>Prontos para retirar</span></div><div class="sb"><b>${avg} min</b><span>Espera média na fila</span></div><div class="sb"><b>${B.k==="on"?Math.ceil(B.left)+" min":hhmm(B.b.s)}</b><span>${B.k==="on"?"Para acabar o intervalo":"Próximo intervalo"}</span></div></div>`;
const prep=`<div class="prep"><b>Preparar agora</b>${Object.keys(need).length?`<div class="cs">${Object.entries(need).map(([i,n])=>`<span>${n}× ${P(i).n}</span>`).join("")}</div>`:'<div class="mut" style="margin-top:4px">Nada na fila no momento.</div>'}</div>`;
const tools=`<div class="tb"><input type="text" id="bq" placeholder="Buscar por senha ou nome" aria-label="Buscar pedido" value="${esc(V.q)}" oninput="V.q=this.value;render()"><button class="btn sm bk" onclick="V.tv=true;render()">Tela de senhas (TV)</button><button class="btn sm pa" onclick="V.snd=!V.snd;render()">Som: ${V.snd?"ligado":"desligado"}</button><button class="btn sm pa" onclick="demo()">Simular fila</button><button class="btn sm pa" onclick="reset()">Reiniciar dados</button><button class="sim" onclick="cycleSim()">Demo: ${V.simI?SIMS[V.simI].l:"horário real"}</button></div>`;
const stock=`<aside><h2 style="margin-bottom:6px">Estoque rápido</h2>${MENU.map(m=>{const s=D.stock[m.id];return `<div class="stk"><div><div style="font-weight:800">${m.n}</div><div class="mut">${s>0?s+" disponíveis":"Esgotado"}</div></div><button class="btn sm ${s>0?"pa":""}" onclick="stk(${m.id})">${s>0?"Esgotar":"Repor"}</button></div>`}).join("")}</aside>`;
const done=`<h2 style="margin:22px 0 8px">Entregues e cancelados (${closed.length})</h2>${closed.length?closed.slice().reverse().map(o=>`<div class="stk"><span><b>#${pad(o.num)}</b> ${esc(o.name)} <span class="mut">${o.st===4?"cancelado":"entregue"}</span></span>${o.st===3?`<button class="btn sm pa" onclick="setSt(${o.num},2)">Desfazer</button>`:""}</div>`).join(""):'<p class="mut">Nada por aqui ainda.</p>'}`;
return header()+`<div class="shell wide" style="padding-bottom:40px">${strip}${prep}${tools}<div class="agrid"><div><div class="board">${col(0,"Recebidos")}${col(1,"Em preparo")}${col(2,"Prontos")}</div>${done}</div>${stock}</div></div>`}
function tvV(){const prep=D.board.prep,rdy=D.board.rdy.slice().reverse();
return `<div class="tv"><div class="tvh"><img src="${LOGO_D}" alt="Cantina Fácil"><div class="tvc">${hhmm(clock())}</div><button class="out" onclick="V.tv=false;history.replaceState(null,'',location.pathname+location.search);render()">Sair da tela</button></div><div class="tvg"><section><h2>Preparando</h2><div class="tvn">${prep.map(n=>`<span>${pad(n)}</span>`).join("")||'<p style="color:#999">Nenhum pedido</p>'}</div></section><section class="rdy"><h2>Prontos, retire no balcão</h2><div class="tvn">${rdy.map(n=>`<span>${pad(n)}</span>`).join("")||'<p style="color:#9bc9ac">Nenhum pedido pronto</p>'}</div></section></div><p class="tvf">Fale sua senha e o código de retirada. Você paga no balcão.</p></div>`}
function render(){
const a=document.getElementById("app"),f=document.activeElement,fid=f&&f.id,pos=f&&f.selectionStart;
a.innerHTML=(D.ok?"":'<div class="offline">Sem conexão com o servidor. Tentando de novo...</div>')+(V.tv?tvV():!V.user?loginV():V.user.role==="est"?student():attendant());
if(V.user&&!V.tv){
if(V.user.role==="est"){const o=mine();if(o){if(V.last!==null&&V.last!==2&&o.st===2){beep();try{navigator.vibrate&&navigator.vibrate(300)}catch(e){}}V.last=o.st}}
else{const mx=D.orders.reduce((m,o)=>Math.max(m,o.num),0);if(V.seen!==null&&mx>V.seen){beep();toast("Novo pedido #"+pad(mx))}V.seen=mx}}
if(fid){const n=document.getElementById(fid);if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(e){}}}}
render();poll(true);setInterval(poll,4000);setInterval(()=>{if(!document.hidden&&!V.ae)render()},20000);
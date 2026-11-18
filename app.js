/* ===== Échange de séries — logique de l'app ===== */
(function(){
var SB_URL="https://iasqudlrolsncplodsqr.supabase.co";
var SB_KEY="sb_publishable_8Oe_ktlLkGpysTHDOLD6FQ_8n9Tl1J1";
var sb=supabase.createClient(SB_URL,SB_KEY);
var TYPES=["Matin","Soir","Nuit","Journée"];
var SLUG={"Matin":"matin","Soir":"soir","Nuit":"nuit","Journée":"journee"};
var $=function(i){return document.getElementById(i)};
var st={give:"Matin",want:["Matin"]}, me=null, profil=null, signup=false;

function say(id,t,ok){var e=$(id);e.textContent=t||"";e.className="msg"+(t?(ok?" ok":" err"):"")}
function fd(v){if(!v)return"…";var p=v.split("-");return p[2]+"/"+p[1]+"/"+p[0]}
function ident(nom){
  var s=nom.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,".").replace(/^\.+|\.+$/g,"");
  return s?"echange."+s+"@gmail.com":"";
}
/* Numéro de semaine ISO 8601 : semaine du lundi au dimanche, semaine 1 = celle qui contient le 4 janvier */
function weekNum(iso){
  if(!iso)return null;
  var p=iso.split("-"),d=new Date(Date.UTC(+p[0],+p[1]-1,+p[2]));
  d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));
  var y0=Date.UTC(d.getUTCFullYear(),0,1);
  return Math.ceil(((d-y0)/86400000+1)/7);
}
function wkLabel(a,b){
  var x=weekNum(a),z=weekNum(b);
  if(!x)return"";
  return !z||x===z?"sem. "+x:"sem. "+x+" à "+z;
}
function el(tag,cls,txt,t){
  var e=document.createElement(tag);
  if(cls)e.className=cls;
  if(txt!==undefined)e.textContent=txt;
  if(t)e.dataset.t=SLUG[t];
  return e;
}

/* --- Formulaire --- */
for(var i=1;i<=15;i++){var o=document.createElement("option");o.value=o.textContent=i;$("sem").appendChild(o)}
function seg(box,multi){
  TYPES.forEach(function(p){
    var b=el("button","",p,p);b.type="button";
    b.onclick=function(){
      if(multi){var k=st.want.indexOf(p);if(k>=0){if(st.want.length>1)st.want.splice(k,1)}else st.want.push(p)}
      else st.give=p;
      paint();
    };
    box.appendChild(b);
  });
}
seg($("sG"),false);seg($("sW"),true);
function paint(){
  $("sG").querySelectorAll("button").forEach(function(b){b.classList.toggle("on",b.textContent===st.give)});
  $("sW").querySelectorAll("button").forEach(function(b){b.classList.toggle("on",st.want.indexOf(b.textContent)>=0)});
}
paint();

["d1","d2"].forEach(function(id,k){
  $(id).addEventListener("input",function(){
    var n=weekNum($(id).value);
    $("w"+(k+1)).textContent=n?"Semaine "+n:"";
  });
});

/* --- Navigation --- */
function show(v){["vAuth","vApp"].forEach(function(x){$(x).classList.toggle("hide",x!==v)})}
function tab(t){
  [["tP","pP"],["tB","pB"],["tR","pR"]].forEach(function(p){
    $(p[0]).classList.toggle("on",p[0]===t);
    $(p[1]).classList.toggle("hide",p[0]!==t);
  });
  if(t==="tB")loadBoard();
}
["tP","tB","tR"].forEach(function(t){$(t).onclick=function(){tab(t)}});

/* --- Connexion / inscription --- */
$("mode").onclick=function(){
  signup=!signup;
  $("aTitle").textContent=signup?"Créer mon compte":"Connexion";
  $("go").textContent=signup?"Créer mon compte":"Se connecter";
  $("mode").textContent=signup?"J’ai déjà un compte : me connecter":"Pas encore de compte ? Créer mon compte";
  $("cLab").classList.toggle("hide",!signup);
  $("pwd").autocomplete=signup?"new-password":"current-password";
  say("authMsg","");
};
$("go").onclick=async function(){
  var nom=$("nom").value.trim(),pwd=$("pwd").value,email=ident(nom);
  if(!email){say("authMsg","Indique ton nom et prénom.");return}
  if(pwd.length<6){say("authMsg","Mot de passe : 6 caractères minimum.");return}
  if(signup&&!$("consent").checked){say("authMsg","Coche la case de consentement.");return}
  $("go").disabled=true;
  var r=signup
    ?await sb.auth.signUp({email:email,password:pwd,options:{data:{nom:nom}}})
    :await sb.auth.signInWithPassword({email:email,password:pwd});
  $("go").disabled=false;
  if(r.error){
    var m=r.error.message||"";
    if(/already|registered/i.test(m))m="Ce nom est déjà inscrit. Connecte-toi, ou ajoute une initiale ou un numéro à ton nom.";
    else if(/invalid login/i.test(m))m="Nom ou mot de passe incorrect.";
    say("authMsg",m);
  }else if(signup&&!r.data.session){
    say("authMsg","Compte créé, mais la confirmation par e-mail est encore activée dans Supabase.");
  }
};

async function start(session){
  if(!session){me=null;show("vAuth");return}
  me=session.user;show("vApp");
  var r=await sb.from("profils").select("*").maybeSingle();
  profil=r.data;
  if(!profil){
    var nom=(me.user_metadata&&me.user_metadata.nom)||"";
    await sb.from("profils").upsert({user_id:me.id,prenom:nom});
    profil={prenom:nom,contact:null};
  }
  $("prenom").value=profil.prenom||"";$("contact").value=profil.contact||"";
  tab("tP");
}
sb.auth.getSession().then(function(r){start(r.data.session)});
sb.auth.onAuthStateChange(function(ev,s){if(ev==="SIGNED_IN"||ev==="SIGNED_OUT")start(s)});

/* --- Profil --- */
$("saveP").onclick=async function(){
  var p=$("prenom").value.trim();
  if(!p){say("pMsg","Indique ton nom.");return}
  var c=$("contact").value.trim()||null;
  var r=await sb.from("profils").upsert({user_id:me.id,prenom:p,contact:c});
  if(r.error){say("pMsg","Erreur : "+r.error.message);return}
  profil={prenom:p,contact:c};say("pMsg","Profil enregistré.",true);
};
$("out").onclick=function(){sb.auth.signOut()};
$("del").onclick=async function(){
  if(!confirm("Supprimer définitivement ton compte et toutes tes offres ?"))return;
  var r=await sb.rpc("supprimer_mon_compte");
  if(r.error){say("pMsg","Suppression impossible : "+r.error.message);return}
  await sb.auth.signOut();
};

/* --- Publication --- */
$("pub").onclick=async function(){
  say("pubMsg","");
  var d1=$("d1").value,d2=$("d2").value;
  if(!d1||!d2){say("pubMsg","Indique les deux dates.");return}
  if(d2<d1){say("pubMsg","La date de fin précède la date de début.");return}
  var serie=$("serie").value.trim().toUpperCase()||"L";
  $("pub").disabled=true;
  var r=await sb.from("offres").insert({prenom:profil.prenom,serie:serie,semaine:serie+$("sem").value,type_donne:st.give,types_voulus:st.want,date_debut:d1,date_fin:d2});
  $("pub").disabled=false;
  if(r.error){say("pubMsg","Publication impossible : "+r.error.message);return}
  say("pubMsg","Demande publiée sur le tableau.",true);
};

/* --- Tableau --- */
async function loadBoard(){
  say("bMsg","Chargement…");
  var today=new Date().toISOString().slice(0,10);
  var q=sb.from("offres").select("*").eq("statut","ouverte").gte("date_fin",today).order("date_debut");
  var s=$("fser").value.trim().toUpperCase();if(s)q=q.eq("serie",s);
  var t=$("ftype").value;if(t)q=q.eq("type_donne",t);
  var r=await q, rr=await sb.from("reponses").select("*");
  if(r.error){say("bMsg","Lecture impossible : "+r.error.message);return}
  say("bMsg","");
  var by={};(rr.data||[]).forEach(function(x){(by[x.offre_id]=by[x.offre_id]||[]).push(x)});
  var h=$("board");h.innerHTML="";
  if(!r.data.length){h.appendChild(el("p","empty","Aucune offre pour le moment."));return}
  r.data.forEach(function(o){
    var d=el("div","offer","",o.type_donne);
    var head=el("div","head");
    head.appendChild(el("span","t",o.semaine));
    head.appendChild(el("span","badge",o.type_donne,o.type_donne));
    var w=el("div","want");
    w.appendChild(el("span","lbl","Cherche"));
    o.types_voulus.forEach(function(tv){w.appendChild(el("span","chip",tv,tv))});
    var info=el("div","info","Du "+fd(o.date_debut)+" au "+fd(o.date_fin)+" ("+wkLabel(o.date_debut,o.date_fin)+") · "+o.prenom+(o.user_id===me.id?" (toi)":""));
    var ac=el("div","acts");
    d.appendChild(head);d.appendChild(w);d.appendChild(info);
    var list=by[o.id]||[];
    if(o.user_id===me.id){
      var e=el("button","mini fill","Échangée");
      e.onclick=async function(){await sb.from("offres").update({statut:"echangee"}).eq("id",o.id);loadBoard()};
      var x=el("button","mini","Retirer");
      x.onclick=async function(){await sb.from("offres").delete().eq("id",o.id);loadBoard()};
      ac.appendChild(e);ac.appendChild(x);
      d.appendChild(el("div","int",list.length
        ?"Intéressés : "+list.map(function(y){return y.prenom+(y.contact?" ("+y.contact+")":"")}).join(", ")
        :"Personne n’a encore répondu."));
    }else{
      var mine=list.filter(function(y){return y.user_id===me.id})[0];
      var b=el("button",mine?"mini":"mini fill",mine?"Retirer mon intérêt":"Ça m’intéresse");
      b.onclick=async function(){
        b.disabled=true;
        var r2=mine
          ?await sb.from("reponses").delete().eq("id",mine.id)
          :await sb.from("reponses").insert({offre_id:o.id,prenom:profil.prenom,contact:profil.contact});
        if(r2.error){say("bMsg","Action impossible : "+r2.error.message);b.disabled=false;return}
        loadBoard();
      };
      ac.appendChild(b);
    }
    d.appendChild(ac);h.appendChild(d);
  });
}
$("fser").addEventListener("input",loadBoard);
$("ftype").addEventListener("input",loadBoard);
})();

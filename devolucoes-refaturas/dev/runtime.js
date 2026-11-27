/* Runtime local de teste: troca o claude.use por uma API HTTP em /api.
   O servidor de desenvolvimento injeta este arquivo antes do script do painel. */
(function(){
  const qs = new URLSearchParams(location.search);
  const NOMES = { "u-ana":"Ana (preenchimento)", "u-diego":"Diego", "u-miguel":"Miguel", "u-adilson":"Adilson", "u-gestor":"Gestor" };
  let uid = qs.get("uid") || "";
  try{
    if(uid) sessionStorage.setItem("dev-uid", uid);
    else uid = sessionStorage.getItem("dev-uid") || "";
  }catch(e){}
  if(!uid) uid = "u-ana";
  const nome = qs.get("nome") || NOMES[uid] || uid;
  const novoId = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  async function req(method, url, body){
    const opt = { method: method, headers:{} };
    if(body !== undefined){ opt.headers["content-type"] = "application/json"; opt.body = JSON.stringify(body); }
    const r = await fetch(url, opt);
    if(!r.ok) throw { code: r.status === 403 ? "invalid_argument" : "falhou", status: r.status };
    return r.status === 204 ? null : r.json();
  }

  const db = {
    collection(alvo){
      return {
        onSnapshot(cb, err){
          let vivo = true;
          const ciclo = async () => {
            if(!vivo) return;
            try{
              const d = await req("GET", "/api/" + alvo);
              cb({ docs: d.docs.map(x => ({ id:x.id, data:() => x.data, metadata:{ hasPendingWrites:false } })), metadata:{ fromCache:false }, docChanges:() => [] });
            }catch(e){ if(err) err(e); }
            if(vivo) setTimeout(ciclo, 2000);
          };
          ciclo();
          return () => { vivo = false; };
        },
        doc(){
          const id = novoId();
          return {
            id: id,
            set: v => req("PUT", "/api/" + alvo + "/" + id, v),
            update: v => req("PATCH", "/api/" + alvo + "/" + id, v),
            delete: () => req("DELETE", "/api/" + alvo + "/" + id)
          };
        }
      };
    },
    doc(caminho){
      const p = caminho.split("/"), alvo = p[0], id = p[1];
      return {
        set: v => req("PUT", "/api/" + alvo + "/" + id, v),
        update: v => req("PATCH", "/api/" + alvo + "/" + id, v),
        delete: () => req("DELETE", "/api/" + alvo + "/" + id)
      };
    }
  };

  const user = {
    me: async () => ({ id: uid, name: nome, canEdit: true }),
    profiles: async ids => { const o = {}; ids.forEach(i => { o[i] = { name: NOMES[i] || i, avatarUrl: "" }; }); return o; },
    can: async () => true
  };

  const assets = {
    upload: async (file) => {
      const r = await fetch("/api/anexos?nome=" + encodeURIComponent(file.name || "arquivo"), { method:"POST", headers:{ "content-type": file.type || "application/octet-stream" }, body: file });
      if(!r.ok) throw { code: "falhou" };
      const d = await r.json();
      return { id: d.id, contentType: d.contentType };
    },
    delete: async id => { try{ await fetch("/api/anexos/" + id, { method:"DELETE" }); }catch(e){} }
  };

  const downloads = {
    save: async d => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(d.data);
      a.download = d.filename || "arquivo";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
  };

  const servicos = { db, user, assets, downloads };
  window.claude = { use: async n => { const s = servicos[n]; if(!s) throw { code:"not_granted" }; return s; } };
  console.log("[dev] runtime local como " + uid);
})();
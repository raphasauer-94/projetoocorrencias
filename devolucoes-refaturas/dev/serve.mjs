import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const devDir = path.join(raiz, "dev");
const dadosPath = path.join(devDir, ".data.json");
const blobsDir = path.join(devDir, ".blobs");
const porta = Number(process.argv[2] || 8799);
fs.mkdirSync(blobsDir, { recursive: true });

function iso(t){ return new Date(t).toISOString(); }
function fundir(dst, src){
  for(const k in src){
    const v = src[k], d = dst[k];
    if(v && typeof v === "object" && !Array.isArray(v) && d && typeof d === "object" && !Array.isArray(d)) dst[k] = fundir(Object.assign({}, d), v);
    else dst[k] = v;
  }
  return dst;
}

let store = { casos:{}, acessos:{}, config:{}, blobs:{} };
try{ if(fs.existsSync(dadosPath)) store = JSON.parse(fs.readFileSync(dadosPath, "utf8")); }catch(e){}
store.casos = store.casos || {}; store.acessos = store.acessos || {}; store.config = store.config || {}; store.blobs = store.blobs || {};
function salvar(){ try{ fs.writeFileSync(dadosPath, JSON.stringify(store)); }catch(e){} }

const SETORES = ["logistica", "comercial", "ocorrencia", "processos"];
function semente(){
  if(!Object.keys(store.acessos).length){
    const agora = iso(Date.now());
    store.acessos["u-gestor"] = { nome:"Gestor", setores:SETORES.slice(), papel:"dono", status:"ativo", em:agora, por:"u-gestor" };
    store.acessos["u-diego"] = { nome:"Diego", setores:["logistica"], papel:"membro", status:"ativo", em:agora, por:"u-gestor" };
    store.acessos["u-miguel"] = { nome:"Miguel", setores:["comercial"], papel:"membro", status:"ativo", em:agora, por:"u-gestor" };
    store.acessos["u-adilson"] = { nome:"Adilson", setores:["ocorrencia"], papel:"membro", status:"ativo", em:agora, por:"u-gestor" };
    store.acessos["u-ana"] = { nome:"Ana (preenchimento)", setores:["logistica"], papel:"membro", status:"ativo", em:agora, por:"u-gestor" };
  }
  if(!store.config.painel){
    store.config.painel = { prazos:{ logistica:1, comercial:2, ocorrencia:2, processos:2 },
      chave:{ logistica:["u-diego"], comercial:["u-miguel"], ocorrencia:["u-adilson"], processos:["u-diego","u-miguel","u-adilson"] },
      em:iso(Date.now()), por:'u-gestor' };
  }
  salvar();
}
semente();

function casoFake(i){
  const idx = i % 5;
  const dias = 0.5 + (i % 6);
  const agora = Date.now();
  const etapas = {};
  for(const s of SETORES) etapas[s] = { status:'pendente', iniciadoEm:null, entradaEm:null, encerradoEm:null, devolvidoEm:null, por:null, devolucoes:0, aguardando:null, passagens:[] };
  const total = idx === 4 ? 4 : idx;
  for(let k = 0; k < total; k++){
    const s = SETORES[k];
    const de = agora - (dias + 3 - k) * 864e5, ate = agora - (dias + 2 - k) * 864e5;
    etapas[s] = { status:'concluida', iniciadoEm:iso(de), entradaEm:null, encerradoEm:iso(ate), devolvidoEm:null, por:'u-gestor', devolucoes: k === 0 && i % 7 === 0 ? 1 : 0, aguardando:null, passagens:[{ de:iso(de), ate:iso(ate) }] };
  }
  if(idx < 4){
    const s = SETORES[idx];
    etapas[s] = Object.assign({}, etapas[s], { status:'ativa', iniciadoEm:iso(agora - dias * 864e5), entradaEm:iso(agora - dias * 864e5), por:'u-gestor' });
  }
  const clientes = ["Mercado Bom Preço","Farmácia São João","Atacadão Norte","Distribuidora Vale Verde","Rede Sul Alimentos","Supermercado Central"];
  const motivos = ["Avaria / produto danificado","Recusa do cliente","Quantidade divergente","Preço divergente","Validade / vencimento"];
  const valor = 300 + (i % 20) * 250;
  return {
    codigo: "DEV-" + String(1000 + i),
    etapa: idx === 4 ? "concluido" : SETORES[idx],
    etapaDesde: iso(agora - dias * 864e5),
    etapas: etapas,
    criadoEm: iso(agora - (dias + 4) * 864e5),
    criadoPor: "u-gestor", criadoSetor: "logistica",
    atualizadoEm: iso(agora), atualizadoPor: 'u-gestor',
    finalizado: idx === 4, finalizadoEm: idx === 4 ? iso(agora - dias * 864e5) : null,
    finalizadoPor: idx === 4 ? "u-gestor" : null, desfecho: idx === 4 ? "Ocorrência concluída" : null,
    logistica: { nf: String(114800 + i), cliente: clientes[i % clientes.length], valor: valor,
      motivo: motivos[i % motivos.length], vendedor: ['Marcos','Ana','Rui'][i % 3],
      dataDevolucao: iso(agora - (dias + 3) * 864e5).slice(0, 10), itens: '10 CX - produto', tipo: 'Total' },
    comercial: idx > 0 ? { decisao: 'Retorno ao estoque', obs: 'ok' } : {},
    ocorrencia: idx > 2 ? { numero: 'OC-' + (7000 + i), emailEnviado: true } : {},
    processos: idx > 3 ? { entradaEstoque: true, conferido: true } : {},
    anexos: {}, comentarios: {}, historico: {}, trilha: {},
    exemplo: false
  };
}

function docOk(id){ return typeof id === 'string' && id.length < 200; }
function lerCorpo(req){
  return new Promise((ok, falha) => {
    const partes = [];
    req.on('data', c => partes.push(c));
    req.on('end', () => ok(Buffer.concat(partes)));
    req.on('error', falha);
  });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const rota = decodeURIComponent(url.pathname);
  const json = (cod, obj) => { res.writeHead(cod, { 'content-type':'application/json' }); res.end(JSON.stringify(obj)); };

  try{
    if(rota === '/' || rota === '/index.html'){
      let html = fs.readFileSync(path.join(raiz, "public/index.html"), "utf8");
      const i = html.lastIndexOf("<script>");
      html = html.slice(0, i) + '<script src="/dev/runtime.js"></script>\n' + html.slice(i);
      res.writeHead(200, { 'content-type':'text/html; charset=utf-8', 'cache-control':'no-store' });
      return res.end(html);
    }
    if(rota === "/dev/runtime.js"){
      res.writeHead(200, { "content-type":"text/javascript; charset=utf-8", "cache-control":"no-store" });
      return res.end(fs.readFileSync(path.join(devDir, "runtime.js")));
    }
    if(rota.startsWith("/blob/")){
      const id = rota.slice(6);
      const meta = store.blobs[id];
      const arquivo = path.join(blobsDir, id);
      if(!meta || !fs.existsSync(arquivo)){ res.writeHead(404); return res.end("nao encontrado"); }
      res.writeHead(200, { "content-type": meta.tipo || "application/octet-stream", "content-disposition": "inline; filename=\"" + (meta.nome || id) + "\"" });
      return res.end(fs.readFileSync(arquivo));
    }
    if(rota === '/api/seed'){
      const n = Math.min(Number(url.searchParams.get('n')) || 30, 500);
      for(let k = 0; k < n; k++){ const id = 's' + Date.now().toString(36) + k; store.casos[id] = casoFake(k); }
      salvar(); return json(200, { criados:n, total:Object.keys(store.casos).length });
    }
    if(rota === '/api/reset'){ store.casos = {}; salvar(); return json(200, { ok:true }); }
    if(rota === '/api/anexos' && req.method === 'POST'){
      const corpo = await lerCorpo(req);
      const id = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      store.blobs[id] = { nome: url.searchParams.get('nome') || 'arquivo', tipo: req.headers['content-type'] || 'application/octet-stream', em: iso(Date.now()), tamanho: corpo.length };
      fs.writeFileSync(path.join(blobsDir, id), corpo); salvar();
      return json(200, { id:id, contentType: store.blobs[id].tipo });
    }
    if(rota.startsWith('/api/anexos/') && req.method === 'DELETE'){
      const id = rota.slice(11); delete store.blobs[id]; try{ fs.unlinkSync(path.join(blobsDir, id)); }catch(e){} salvar();
      return json(200, { ok:true });
    }
    if(rota.startsWith('/api/')){
      const partes = rota.slice(5).split('/');
      const col = partes[0], id = partes[1];
      if(!store[col]) store[col] = {};
      if(col === 'blobs') return json(400, { erro:'rota invalida' });
      if(!id){
        if(req.method !== 'GET') return json(405, { erro:'metodo' });
        return json(200, { docs: Object.keys(store[col]).map(k => ({ id:k, data: store[col][k] })) });
      }
      if(!docOk(id)) return json(400, { erro:'id' });
      if(req.method === 'GET') return json(200, { id:id, data: store[col][id] || null });
      if(req.method === 'PUT'){ const b = JSON.parse((await lerCorpo(req)).toString() || '{}'); store[col][id] = b; salvar(); return json(200, { ok:true }); }
      if(req.method === 'PATCH'){ const b = JSON.parse((await lerCorpo(req)).toString() || '{}'); store[col][id] = fundir(Object.assign({}, store[col][id] || {}), b); salvar(); return json(200, { ok:true }); }
      if(req.method === 'DELETE'){ delete store[col][id]; salvar(); return json(200, { ok:true }); }
      return json(405, { erro:'metodo' });
    }
    res.writeHead(404); res.end('nao encontrado');
  }catch(e){
    console.error(e);
    json(500, { erro: String(e && e.message || e) });
  }
});

servidor.listen(porta, '127.0.0.1', () => {
  console.log("  painel de teste  http://127.0.0.1:" + porta + "/");
  console.log("  gestor           http://127.0.0.1:" + porta + "/?uid=u-gestor");
  console.log("  key user log.    http://127.0.0.1:" + porta + "/?uid=u-diego");
  console.log("  key user com.    http://127.0.0.1:" + porta + "/?uid=u-miguel");
  console.log("  key user oco.    http://127.0.0.1:" + porta + "/?uid=u-adilson");
  console.log("  preenchimento    http://127.0.0.1:" + porta + "/?uid=u-ana");
  console.log("  massa de teste   http://127.0.0.1:" + porta + "/api/seed?n=40");
});
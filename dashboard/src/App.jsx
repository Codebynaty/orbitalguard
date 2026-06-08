import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import 'leaflet/dist/leaflet.css';

// Em produção (Vercel) a API fica em /api (mesma origem). Em dev, localhost:8000.
const API = process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000');

const MOCK_BARRAGENS = [
  { id:'B001', nome:'Barragem B1 — Brumadinho', empresa:'Vale S.A.', municipio:'Brumadinho', estado:'MG', lat:-20.1192, lon:-44.1228, altura_m:86, volume_m3:11700000, tipo:'Montante', deformacao_atual_dB:-7.2, risco:'Crítico',
    descricao:'Colapsou em 25 de janeiro de 2019, causando 270 mortes e liberando 12 milhões de m³ de rejeitos. Tornou-se o maior desastre industrial do Brasil e símbolo da urgência no monitoramento de barragens com tecnologia orbital.',
    imagem:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=-44.1428,-20.1342,-44.102799999999995,-20.1042&bboxSR=4326&size=640,400&format=jpg&f=image' },
  { id:'B002', nome:'Barragem Germano', empresa:'Samarco', municipio:'Mariana', estado:'MG', lat:-20.2833, lon:-43.6167, altura_m:110, volume_m3:55000000, tipo:'Montante', deformacao_atual_dB:-2.8, risco:'Atenção',
    descricao:'Rompeu em novembro de 2015, liberando 40 milhões de m³ no Rio Doce — o maior desastre ambiental do Brasil. O rio levou meses para se recuperar parcialmente e comunidades ribeirinhas foram afetadas por centenas de km.',
    imagem:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=-43.636700000000005,-20.2983,-43.5967,-20.2683&bboxSR=4326&size=640,400&format=jpg&f=image' },
  { id:'B003', nome:'Barragem Casa de Pedra', empresa:'CSN', municipio:'Congonhas', estado:'MG', lat:-20.5333, lon:-43.8500, altura_m:130, volume_m3:89000000, tipo:'Aterro', deformacao_atual_dB:-0.4, risco:'Sem Risco',
    descricao:'Uma das maiores barragens de rejeito da América Latina, operada pela CSN em Congonhas. Estrutura em aterro de 130 metros com monitoramento instrumentado. Atualmente estável dentro dos parâmetros normais de operação.',
    imagem:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=-43.870000000000005,-20.5483,-43.83,-20.5183&bboxSR=4326&size=640,400&format=jpg&f=image' },
  { id:'B004', nome:'Barragem Xingu', empresa:'Anglo American', municipio:'Conceição do Mato Dentro', estado:'MG', lat:-19.0333, lon:-43.4167, altura_m:95, volume_m3:32000000, tipo:'Montante', deformacao_atual_dB:-1.1, risco:'Sem Risco',
    descricao:'Parte do Projeto Minas-Rio da Anglo American, integrada ao maior mineroduto do mundo com 529 km. Utiliza tecnologia de filtro a seco, considerada mais segura que o alteamento a montante tradicional.',
    imagem:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=-43.4367,-19.0483,-43.396699999999996,-19.0183&bboxSR=4326&size=640,400&format=jpg&f=image' },
  { id:'B005', nome:'Barragem Alegria', empresa:'Vale S.A.', municipio:'Mariana', estado:'MG', lat:-20.3667, lon:-43.4333, altura_m:78, volume_m3:18500000, tipo:'Linha de centro', deformacao_atual_dB:-3.5, risco:'Atenção',
    descricao:'Barragem da Vale próxima ao complexo de Germano. Dados SAR indicam deformação moderada nos últimos 30 dias, com tendência de queda na reflectância radar — sinal que requer atenção reforçada e inspeção presencial.',
    imagem:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=-43.453300000000006,-20.381700000000002,-43.4133,-20.3517&bboxSR=4326&size=640,400&format=jpg&f=image' },
];

function gerarHistorico(barragem, dias=90) {
  const data=[]; const hoje=new Date(); const vf=barragem.deformacao_atual_dB;
  for(let i=dias;i>=0;i-=6){
    const d=new Date(hoje); d.setDate(d.getDate()-i);
    const p=(dias-i)/dias, r=(Math.random()-0.5)*0.5;
    data.push({data:d.toISOString().slice(0,10), deformacao_dB:parseFloat((vf*p+r).toFixed(2))});
  }
  return data;
}

const RISK_COLOR = {'Sem Risco':'green','Atenção':'yellow','Crítico':'red'};
const RISK_HEX   = {'Sem Risco':'#48bb78','Atenção':'#ecc94b','Crítico':'#fc8181'};
const RISK_ORDER = {'Crítico':0,'Atenção':1,'Sem Risco':2};
const fmt = n => n>=1e6?(n/1e6).toFixed(1)+'M m³':n>=1e3?(n/1e3).toFixed(0)+'K m³':n+' m³';

function FlyTo({center}){
  const map=useMap();
  useEffect(()=>{if(center)map.flyTo(center,12,{duration:1.2});},[center,map]);
  return null;
}

function CustomTooltip({active,payload,label}){
  if(!active||!payload?.length)return null;
  const v=payload[0].value;
  return(
    <div style={{background:'#0a0f1e',border:'1px solid rgba(99,179,237,0.2)',borderRadius:6,padding:'8px 12px'}}>
      <div style={{fontFamily:'Space Mono,monospace',fontSize:10,color:'#94a3b8'}}>{label}</div>
      <div style={{fontFamily:'Space Mono,monospace',fontSize:13,fontWeight:700,color:v<-5?'#fc8181':v<-2.5?'#ecc94b':'#48bb78'}}>{v} dB</div>
    </div>
  );
}

// ── POPUP LATERAL ────────────────────────────────────────────────────────────
function MapPopup({ barragem, historico, votos, onVotar, onClose, imgError, setImgError }) {
  if (!barragem) return null;
  const cor = RISK_HEX[barragem.risco];
  const v = votos[barragem.id] || { confirmar: 0, contestar: 0 };
  const total = v.confirmar + v.contestar;
  const pctConfirmar = total > 0 ? Math.round((v.confirmar / total) * 100) : 0;
  const pctContestar = total > 0 ? Math.round((v.contestar / total) * 100) : 0;
  const meuVoto = v.meuVoto;

  return (
    <div style={{
      position:'absolute', top:12, right:12, zIndex:500,
      width:300, background:'#0a0f1e',
      border:`1px solid ${cor}40`,
      borderRadius:12, overflow:'hidden',
      boxShadow:`0 8px 32px rgba(0,0,0,0.6), 0 0 24px ${cor}20`,
      animation:'slideIn 0.25s ease',
    }}>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}`}</style>

      {/* FOTO */}
      <div style={{height:140,position:'relative',background:'#050810',overflow:'hidden'}}>
        {!imgError[barragem.id] ? (
          <img src={barragem.imagem} alt={barragem.nome}
            onError={()=>setImgError(p=>({...p,[barragem.id]:true}))}
            style={{width:'100%',height:'100%',objectFit:'cover',filter:'brightness(0.7) saturate(0.7)'}}/>
        ):(
          <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8,background:'linear-gradient(135deg,#0a0f1e,#151d35)'}}>
            <div style={{fontSize:36}}>🛰️</div>
            <div style={{fontFamily:'Space Mono,monospace',fontSize:10,color:'#4a5568'}}>Imagem SAR</div>
          </div>
        )}
        {/* badges */}
        <div style={{position:'absolute',top:8,left:8,background:'rgba(0,0,0,0.7)',border:`1px solid ${cor}`,borderRadius:5,padding:'3px 8px',fontFamily:'Space Mono,monospace',fontSize:10,fontWeight:700,color:cor,backdropFilter:'blur(4px)'}}>
          {barragem.risco==='Crítico'?'⚠️ ':barragem.risco==='Atenção'?'⚡ ':'✅ '}{barragem.risco}
        </div>
        <button onClick={onClose} style={{position:'absolute',top:8,right:8,background:'rgba(0,0,0,0.6)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:4,color:'#94a3b8',width:24,height:24,cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}}>✕</button>
        <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent,rgba(0,0,0,0.8))',padding:'16px 12px 8px'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#e2e8f0',lineHeight:1.3}}>{barragem.nome}</div>
          <div style={{fontFamily:'Space Mono,monospace',fontSize:10,color:'#94a3b8'}}>{barragem.empresa} · {barragem.municipio}/{barragem.estado}</div>
        </div>
      </div>

      <div style={{padding:12}}>
        {/* DESCRIÇÃO */}
        <div style={{fontSize:11,color:'#94a3b8',lineHeight:1.6,marginBottom:12,borderLeft:`2px solid ${cor}`,paddingLeft:8}}>
          {barragem.descricao}
        </div>

        {/* COMPARAÇÃO DE SATÉLITE (visão ampla x aproximada) */}
        {barragem.imagem_wide && barragem.imagem_zoom && (
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'#4fd1c5',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>🛰️ Satélite · contexto e detalhe</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
              {[['Visão ampla',barragem.imagem_wide],['Aproximação',barragem.imagem_zoom]].map(([lbl,src])=>(
                <div key={lbl} style={{position:'relative',borderRadius:6,overflow:'hidden',height:90,background:'#050810',border:'1px solid rgba(79,209,197,0.15)'}}>
                  <img src={src} alt={lbl} style={{width:'100%',height:'100%',objectFit:'cover',filter:'saturate(0.9)'}} onError={e=>{e.target.style.display='none';}}/>
                  <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent,rgba(0,0,0,0.85))',padding:'10px 6px 3px',fontFamily:'Space Mono,monospace',fontSize:8,color:'#4fd1c5',letterSpacing:'0.05em'}}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VISUALIZAÇÃO 3D — terreno + deformação SAR */}
        {barragem.imagem_zoom && (
          <div style={{marginBottom:14}}>
            <div style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'#9f7aea',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>🦊 Terreno 3D + deformação detectada</div>
            <div style={{perspective:'700px',height:140,borderRadius:8,overflow:'hidden',background:'radial-gradient(ellipse at 50% 0%,#1a2138,#050810)',border:'1px solid rgba(159,122,234,0.2)',position:'relative'}}>
              <div className="terrain3d" style={{
                position:'absolute',top:'18%',left:'10%',width:'80%',height:'78%',
                backgroundImage:`url(${barragem.imagem_zoom})`,backgroundSize:'cover',backgroundPosition:'center',
                transform:'rotateX(58deg) rotateZ(-2deg)',transformOrigin:'center center',
                borderRadius:6,boxShadow:'0 18px 40px rgba(0,0,0,0.7)',
                animation:'spin3d 14s linear infinite',
              }}>
                {/* hotspot de deformação (intensidade pela SAR) */}
                <div style={{position:'absolute',top:'42%',left:'46%',width:54,height:54,transform:'translate(-50%,-50%)',
                  borderRadius:'50%',
                  background:`radial-gradient(circle, ${cor}cc 0%, ${cor}55 40%, transparent 72%)`,
                  filter:'blur(2px)',animation:'pulse3d 1.8s ease-in-out infinite'}}/>
              </div>
              <style>{`
                @keyframes spin3d{0%{transform:rotateX(58deg) rotateZ(-2deg)}50%{transform:rotateX(58deg) rotateZ(2deg)}100%{transform:rotateX(58deg) rotateZ(-2deg)}}
                @keyframes pulse3d{0%,100%{opacity:0.55;transform:translate(-50%,-50%) scale(1)}50%{opacity:0.95;transform:translate(-50%,-50%) scale(1.25)}}
              `}</style>
              <div style={{position:'absolute',bottom:6,right:8,fontFamily:'Space Mono,monospace',fontSize:8,color:'#9f7aea',background:'rgba(0,0,0,0.5)',padding:'2px 6px',borderRadius:4}}>
                deformação {barragem.deformacao_atual_dB} dB
              </div>
            </div>
          </div>
        )}

        {/* MÉTRICAS */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:8}}>
          {[['Altura',barragem.altura_m+'m'],['Volume',fmt(barragem.volume_m3)],['SAR',barragem.deformacao_atual_dB+' dB']].map(([k,v])=>(
            <div key={k} style={{background:'#050810',borderRadius:6,padding:'6px 8px',textAlign:'center'}}>
              <div style={{fontFamily:'Space Mono,monospace',fontSize:12,fontWeight:700,color:k==='SAR'?cor:'#e2e8f0'}}>{v}</div>
              <div style={{fontSize:9,color:'#4a5568',textTransform:'uppercase',letterSpacing:'0.06em',marginTop:1}}>{k}</div>
            </div>
          ))}
        </div>

        {/* FICHA TÉCNICA ANM */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 10px',marginBottom:12,fontSize:10,fontFamily:'Space Mono,monospace'}}>
          {[['Tipo',barragem.tipo],['Categoria ANM',barragem.categoria_anm],['Dano Potencial',barragem.dpa],['Estado',barragem.estado]].filter(([,v])=>v).map(([k,v])=>(
            <div key={k} style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid rgba(99,179,237,0.06)',paddingBottom:2}}>
              <span style={{color:'#4a5568'}}>{k}</span><span style={{color:'#cbd5e0'}}>{v}</span>
            </div>
          ))}
        </div>

        {/* GRÁFICO */}
        {historico.length>0&&(
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'#4a5568',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>Deformação SAR — 90 dias</div>
            <ResponsiveContainer width="100%" height={70}>
              <AreaChart data={historico} margin={{top:4,right:4,bottom:0,left:-28}}>
                <defs>
                  <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={cor} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={cor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="data" hide/>
                <YAxis tick={{fontSize:8,fill:'#4a5568',fontFamily:'Space Mono'}}/>
                <RTooltip content={<CustomTooltip/>}/>
                <ReferenceLine y={-2.5} stroke="#ecc94b" strokeDasharray="3 3" strokeWidth={1}/>
                <ReferenceLine y={-5.0} stroke="#fc8181" strokeDasharray="3 3" strokeWidth={1}/>
                <Area type="monotone" dataKey="deformacao_dB" stroke={cor} strokeWidth={2} fill="url(#grad2)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* SISTEMA DE VOTAÇÃO */}
        <div style={{background:'#050810',borderRadius:8,padding:10,border:'1px solid rgba(99,179,237,0.1)'}}>
          <div style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'#63b3ed',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>
            👥 Validação Comunitária
          </div>

          {/* BOTÕES DE VOTO */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:8}}>
            <button onClick={()=>onVotar(barragem.id,'confirmar')} style={{
              padding:'7px 0', borderRadius:6, cursor:'pointer', fontSize:11,
              fontFamily:'Space Mono,monospace', fontWeight:700, transition:'all 0.15s',
              background: meuVoto==='confirmar'?'rgba(252,129,129,0.2)':'transparent',
              border: `1px solid ${meuVoto==='confirmar'?'#fc8181':'rgba(252,129,129,0.3)'}`,
              color: meuVoto==='confirmar'?'#fc8181':'#94a3b8',
            }}>⚠️ Confirmar</button>
            <button onClick={()=>onVotar(barragem.id,'contestar')} style={{
              padding:'7px 0', borderRadius:6, cursor:'pointer', fontSize:11,
              fontFamily:'Space Mono,monospace', fontWeight:700, transition:'all 0.15s',
              background: meuVoto==='contestar'?'rgba(72,187,120,0.2)':'transparent',
              border: `1px solid ${meuVoto==='contestar'?'#48bb78':'rgba(72,187,120,0.3)'}`,
              color: meuVoto==='contestar'?'#48bb78':'#94a3b8',
            }}>✅ Contestar</button>
          </div>

          {/* BARRA DE VOTOS */}
          {total > 0 ? (
            <div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <span style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'#fc8181'}}>⚠️ {v.confirmar} ({pctConfirmar}%)</span>
                <span style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'#48bb78'}}>✅ {v.contestar} ({pctContestar}%)</span>
              </div>
              <div style={{height:6,borderRadius:3,background:'#151d35',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${pctConfirmar}%`,background:'linear-gradient(90deg,#fc8181,#f56565)',borderRadius:3,transition:'width 0.4s ease'}}/>
              </div>
              <div style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'#4a5568',marginTop:4,textAlign:'center'}}>{total} voto{total!==1?'s':''} registrado{total!==1?'s':''}</div>
            </div>
          ):(
            <div style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'#4a5568',textAlign:'center'}}>Seja o primeiro a validar este alerta</div>
          )}

          {meuVoto && (
            <div style={{marginTop:6,fontFamily:'Space Mono,monospace',fontSize:9,color:'#63b3ed',textAlign:'center'}}>
              Seu voto: {meuVoto==='confirmar'?'⚠️ Risco confirmado':'✅ Falso positivo contestado'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── APP PRINCIPAL ─────────────────────────────────────────────────────────────
export default function App() {
  const [barragens, setBarragens] = useState(MOCK_BARRAGENS);
  const [selected,  setSelected]  = useState(null);
  const [historico, setHistorico] = useState([]);
  const [apiOk,     setApiOk]     = useState(false);
  const [busca,     setBusca]     = useState('');
  const [filtroRisco, setFiltroRisco] = useState('Todos');
  const [view,      setView]      = useState('mapa');
  const [imgError,  setImgError]  = useState({});
  const [votos,     setVotos]     = useState({});
  // gamificação
  const [userId]    = useState(()=>{
    let id = localStorage.getItem('og_uid');
    if(!id){ id = 'guardiao_'+Math.random().toString(36).slice(2,8); localStorage.setItem('og_uid',id); }
    return id;
  });
  const [perfil,    setPerfil]    = useState({pontos:0,streak:0,badge:null,reports:0});
  const [toast,     setToast]     = useState(null);
  const [brumadinho, setBrumadinho] = useState(null);
  const [divergencias, setDivergencias] = useState(null);

  useEffect(()=>{
    fetch(`${API}/caso-brumadinho`)
      .then(r=>r.ok?r.json():Promise.reject(r.status))
      .then(d=>{ if(d && Array.isArray(d.serie)) setBrumadinho(d); })
      .catch(()=>{});
    fetch(`${API}/divergencias`)
      .then(r=>r.ok?r.json():Promise.reject(r.status))
      .then(d=>{ if(d && Array.isArray(d.divergencias)) setDivergencias(d); })
      .catch(()=>{});
  },[]);

  useEffect(()=>{
    fetch(`${API}/perfil/${userId}`)
      .then(r=>r.ok?r.json():Promise.reject(r.status))
      .then(d=>{ if(d && typeof d.pontos==='number') setPerfil(d); })
      .catch(()=>{});   // sem API: mantém perfil zerado, não quebra
  },[userId]);

  useEffect(()=>{
    fetch(`${API}/barragens`)
      .then(r=>r.ok?r.json():Promise.reject(r.status))
      .then(d=>{
        if(d && Array.isArray(d.barragens) && d.barragens.length){
          setBarragens(d.barragens.map((b,i)=>({...(MOCK_BARRAGENS[i]||{}),...b})));
          setApiOk(true);
        } else { setApiOk(false); }
      })
      .catch(()=>setApiOk(false));   // mantém MOCK_BARRAGENS, não quebra a tela
  },[]);

  useEffect(()=>{
    if(!selected)return;
    fetch(`${API}/historico/${selected.id}`)
      .then(r=>r.ok?r.json():Promise.reject(r.status))
      .then(d=>setHistorico(Array.isArray(d?.historico)?d.historico:gerarHistorico(selected)))
      .catch(()=>setHistorico(gerarHistorico(selected)));
  },[selected]);

  const handleVotar = (id, tipo, justificativa) => {
    // otimista: atualiza UI na hora
    setVotos(prev => {
      const atual = prev[id] || { confirmar:0, contestar:0, meuVoto:null };
      if (atual.meuVoto === tipo) return prev;
      const novo = { ...atual };
      if (atual.meuVoto) novo[atual.meuVoto]--;
      novo[tipo]++;
      novo.meuVoto = tipo;
      return { ...prev, [id]: novo };
    });
    // persiste no backend + gamificação
    fetch(`${API}/reportar`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({barragem_id:id, tipo, usuario_id:userId, justificativa})
    }).then(r=>r.json()).then(d=>{
      if(d.status==='ticket_registrado'){
        setPerfil(p=>({...p, ...(d.perfil||{}), badge:d.perfil?.badge}));
        setToast({pontos:d.pontos_ganhos, streak:d.streak});
        setTimeout(()=>setToast(null), 3200);
      } else if(d.status==='ja_reportado_hoje'){
        setToast({msg:'Você já verificou esta barragem hoje'});
        setTimeout(()=>setToast(null), 2600);
      }
    }).catch(()=>{});
  };

  const filtradas = useMemo(()=>
    barragens
      .filter(b=>{ const q=busca.toLowerCase(); return b.nome.toLowerCase().includes(q)||b.municipio.toLowerCase().includes(q)||b.empresa.toLowerCase().includes(q)||b.estado.toLowerCase().includes(q); })
      .filter(b=>filtroRisco==='Todos'||b.risco===filtroRisco)
      .sort((a,b)=>RISK_ORDER[a.risco]-RISK_ORDER[b.risco]),
  [barragens,busca,filtroRisco]);

  const criticos = barragens.filter(b=>b.risco==='Crítico').length;
  const atencao  = barragens.filter(b=>b.risco==='Atenção').length;
  const estavel  = barragens.filter(b=>b.risco==='Sem Risco').length;

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <div className="header-logo">
          <div className="logo-icon">🛰️</div>
          <div>
            <div className="logo-text">ORBITALGUARD</div>
            <div className="logo-sub">Sentinel-1 SAR · IA · Validação Comunitária</div>
          </div>
        </div>
        <div style={{display:'flex',gap:16,alignItems:'center'}}>
          {!apiOk&&<div style={{fontFamily:'Space Mono,monospace',fontSize:10,color:'#ecc94b',background:'rgba(236,201,75,0.1)',padding:'4px 10px',borderRadius:4,border:'1px solid rgba(236,201,75,0.3)'}}>MODO DEMO</div>}
          {/* GAMIFICAÇÃO — pontos do guardião */}
          <div title={`Você é ${userId}`} style={{display:'flex',alignItems:'center',gap:8,background:'linear-gradient(135deg,rgba(99,179,237,0.12),rgba(159,122,234,0.12))',border:'1px solid rgba(99,179,237,0.25)',borderRadius:8,padding:'5px 12px'}}>
            <span style={{fontSize:15}}>{perfil.badge?.emoji || '🔰'}</span>
            <div style={{lineHeight:1.1}}>
              <div style={{fontFamily:'Space Mono,monospace',fontSize:12,fontWeight:700,color:'#f6e05e'}}>{(perfil.pontos||0).toLocaleString('pt-BR')} pts</div>
              <div style={{fontFamily:'Space Mono,monospace',fontSize:8,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em'}}>{perfil.badge?.nivel || 'Aspirante'}{perfil.streak>1?` · 🔥${perfil.streak}d`:''}</div>
            </div>
          </div>
          <div style={{display:'flex',background:'#0a0f1e',border:'1px solid rgba(99,179,237,0.15)',borderRadius:6,overflow:'hidden'}}>
            {['mapa','card','divergencias','brumadinho'].map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{padding:'5px 12px',fontSize:11,fontFamily:'Space Mono,monospace',background:view===v?'rgba(99,179,237,0.15)':'transparent',color:view===v?'#63b3ed':'#94a3b8',border:'none',cursor:'pointer',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'}}>
                {v==='mapa'?'🗺 Mapa':v==='card'?'📋 Cards':v==='divergencias'?'🚩 Divergências':'🛰 Caso Real'}
              </button>
            ))}
          </div>
          <div className="header-status"><div className="pulse"/>SISTEMA ATIVO · {new Date().toLocaleString('pt-BR')}</div>
        </div>
      </header>

      <main className="main">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="stats-bar">
            {[['Crítico',criticos,'#fc8181'],['Atenção',atencao,'#ecc94b'],['Estável',estavel,'#48bb78']].map(([label,val,cor])=>(
              <div key={label} className="stat-item" onClick={()=>setFiltroRisco(filtroRisco===(label==='Estável'?'Sem Risco':label)?'Todos':(label==='Estável'?'Sem Risco':label))} style={{cursor:'pointer'}}>
                <div className="stat-value" style={{color:cor}}>{val}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>

          {/* BUSCA */}
          <div style={{padding:'10px 12px',borderBottom:'1px solid rgba(99,179,237,0.12)',display:'flex',flexDirection:'column',gap:8}}>
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="🔍  Buscar barragem, município..."
              style={{background:'#0a0f1e',border:'1px solid rgba(99,179,237,0.2)',borderRadius:6,padding:'8px 10px',color:'#e2e8f0',fontFamily:'DM Sans,sans-serif',fontSize:13,width:'100%',outline:'none'}}/>
            <div style={{display:'flex',gap:6}}>
              {['Todos','Crítico','Atenção','Sem Risco'].map(r=>(
                <button key={r} onClick={()=>setFiltroRisco(r)} style={{flex:1,padding:'4px 0',fontSize:10,fontFamily:'Space Mono,monospace',background:filtroRisco===r?'rgba(99,179,237,0.15)':'transparent',color:filtroRisco===r?'#63b3ed':r==='Crítico'?'#fc8181':r==='Atenção'?'#ecc94b':r==='Sem Risco'?'#48bb78':'#94a3b8',border:`1px solid ${filtroRisco===r?'rgba(99,179,237,0.4)':'rgba(99,179,237,0.1)'}`,borderRadius:4,cursor:'pointer',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                  {r==='Sem Risco'?'Estável':r}
                </button>
              ))}
            </div>
            <div style={{fontFamily:'Space Mono,monospace',fontSize:10,color:'#4a5568'}}>{filtradas.length} de {barragens.length} barragens</div>
          </div>

          {/* LIST */}
          <div className="barragem-list">
            {filtradas.length===0?(
              <div style={{padding:24,textAlign:'center',color:'#4a5568',fontFamily:'Space Mono,monospace',fontSize:12}}>Nenhuma barragem encontrada</div>
            ):filtradas.map(b=>(
              <div key={b.id} className={`barragem-item ${selected?.id===b.id?'active':''}`} onClick={()=>{setSelected(b);setView('mapa');}}>
                <div className={`risk-dot ${RISK_COLOR[b.risco]}`}/>
                <div className="barragem-info">
                  <div className="barragem-name">{b.nome}</div>
                  <div className="barragem-meta">{b.municipio}/{b.estado} · {b.deformacao_atual_dB} dB</div>
                </div>
                <div className={`risk-badge ${RISK_COLOR[b.risco]}`}>{b.risco}</div>
              </div>
            ))}
          </div>

          {/* MINI CHART */}
          {selected&&historico.length>0&&(
            <div className="detail-panel">
              <div className="detail-title">📍 {selected.id} — Histórico SAR</div>
              <ResponsiveContainer width="100%" height={80}>
                <AreaChart data={historico} margin={{top:4,right:4,bottom:0,left:-20}}>
                  <defs>
                    <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={RISK_HEX[selected.risco]} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={RISK_HEX[selected.risco]} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="data" hide/>
                  <YAxis tick={{fontSize:9,fill:'#4a5568',fontFamily:'Space Mono'}}/>
                  <RTooltip content={<CustomTooltip/>}/>
                  <ReferenceLine y={-2.5} stroke="#ecc94b" strokeDasharray="3 3" strokeWidth={1}/>
                  <ReferenceLine y={-5.0} stroke="#fc8181" strokeDasharray="3 3" strokeWidth={1}/>
                  <Area type="monotone" dataKey="deformacao_dB" stroke={RISK_HEX[selected.risco]} strokeWidth={2} fill="url(#grad1)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
              <div style={{display:'flex',gap:12,marginTop:4}}>
                <span style={{fontSize:9,color:'#ecc94b',fontFamily:'Space Mono'}}>— atenção (-2.5 dB)</span>
                <span style={{fontSize:9,color:'#fc8181',fontFamily:'Space Mono'}}>— crítico (-5.0 dB)</span>
              </div>
            </div>
          )}
        </aside>

        {/* CONTENT */}
        <div style={{flex:1,position:'relative',overflow:view==='card'?'auto':'hidden'}}>

          {/* MAP VIEW */}
          {view==='mapa'&&(
            <>
              <MapContainer center={[-20.2,-43.9]} zoom={8} style={{height:'100%',width:'100%'}}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap"/>
                <FlyTo center={selected?[selected.lat,selected.lon]:null}/>
                {barragens.map(b=>(
                  <CircleMarker key={b.id} center={[b.lat,b.lon]}
                    radius={b.risco==='Crítico'?14:b.risco==='Atenção'?10:8}
                    pathOptions={{color:RISK_HEX[b.risco],fillColor:RISK_HEX[b.risco],fillOpacity:b.risco==='Crítico'?0.8:0.5,weight:b.id===selected?.id?3:1.5}}
                    eventHandlers={{click:()=>setSelected(b)}}>
                    <Tooltip permanent={b.risco==='Crítico'} direction="top" offset={[0,-10]}>
                      <div style={{fontFamily:'Space Mono,monospace',fontSize:11}}>
                        <strong>{b.id}</strong> — {b.risco}<br/>{b.deformacao_atual_dB} dB
                      </div>
                    </Tooltip>
                  </CircleMarker>
                ))}
              </MapContainer>

              {/* POPUP LATERAL */}
              <MapPopup
                barragem={selected}
                historico={historico}
                votos={votos}
                onVotar={handleVotar}
                onClose={()=>setSelected(null)}
                imgError={imgError}
                setImgError={setImgError}
              />

              {/* ALERTA BANNER */}
              {criticos>0&&!selected&&(
                <div className="alert-banner">
                  <div className="alert-banner-title">⚠️ ALERTA CRÍTICO ATIVO</div>
                  {barragens.filter(b=>b.risco==='Crítico').map(b=>(
                    <div key={b.id} style={{marginTop:4,cursor:'pointer'}} onClick={()=>setSelected(b)}>{b.nome}<br/>{b.deformacao_atual_dB} dB</div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* CARDS VIEW */}
          {view==='card'&&(
            <div style={{padding:24,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:20}}>
              {filtradas.map(b=>{
                const cor=RISK_HEX[b.risco];
                const v=votos[b.id]||{confirmar:0,contestar:0,meuVoto:null};
                const total=v.confirmar+v.contestar;
                const pctC=total>0?Math.round((v.confirmar/total)*100):0;
                return(
                  <div key={b.id} style={{background:'#0a0f1e',border:`1px solid ${b.id===selected?.id?cor:'rgba(99,179,237,0.12)'}`,borderRadius:12,overflow:'hidden',boxShadow:b.risco==='Crítico'?`0 0 20px rgba(252,129,129,0.15)`:'none',transition:'transform 0.15s'}}
                    onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
                    onMouseLeave={e=>e.currentTarget.style.transform='none'}>

                    {/* FOTO */}
                    <div style={{height:160,position:'relative',background:'#050810',overflow:'hidden'}}>
                      {!imgError[b.id]?(
                        <img src={b.imagem} alt={b.nome} onError={()=>setImgError(p=>({...p,[b.id]:true}))}
                          style={{width:'100%',height:'100%',objectFit:'cover',filter:'brightness(0.7) saturate(0.7)'}}/>
                      ):(
                        <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8,background:'linear-gradient(135deg,#0a0f1e,#151d35)'}}>
                          <div style={{fontSize:32}}>🛰️</div>
                          <div style={{fontFamily:'Space Mono,monospace',fontSize:10,color:'#4a5568'}}>Imagem SAR</div>
                        </div>
                      )}
                      <div style={{position:'absolute',top:8,left:8,background:'rgba(0,0,0,0.7)',border:`1px solid ${cor}`,borderRadius:5,padding:'3px 8px',fontFamily:'Space Mono,monospace',fontSize:10,fontWeight:700,color:cor,backdropFilter:'blur(4px)'}}>
                        {b.risco==='Crítico'?'⚠️ ':b.risco==='Atenção'?'⚡ ':'✅ '}{b.risco}
                      </div>
                      <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent,rgba(0,0,0,0.8))',padding:'16px 12px 8px'}}>
                        <div style={{fontSize:13,fontWeight:600,color:'#e2e8f0',lineHeight:1.3}}>{b.nome}</div>
                        <div style={{fontFamily:'Space Mono,monospace',fontSize:10,color:'#94a3b8'}}>{b.empresa} · {b.municipio}/{b.estado}</div>
                      </div>
                    </div>

                    <div style={{padding:14}}>
                      <div style={{fontSize:12,color:'#94a3b8',lineHeight:1.6,marginBottom:12,borderLeft:`2px solid ${cor}`,paddingLeft:8}}>{b.descricao}</div>

                      {/* MÉTRICAS */}
                      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:12}}>
                        {[['Altura',b.altura_m+'m'],['Volume',fmt(b.volume_m3)],['SAR',b.deformacao_atual_dB+' dB']].map(([k,val])=>(
                          <div key={k} style={{background:'#050810',borderRadius:6,padding:'6px 8px',textAlign:'center'}}>
                            <div style={{fontFamily:'Space Mono,monospace',fontSize:12,fontWeight:700,color:k==='SAR'?cor:'#e2e8f0'}}>{val}</div>
                            <div style={{fontSize:9,color:'#4a5568',textTransform:'uppercase',letterSpacing:'0.06em',marginTop:1}}>{k}</div>
                          </div>
                        ))}
                      </div>

                      {/* VOTAÇÃO NO CARD */}
                      <div style={{background:'#050810',borderRadius:8,padding:10,border:'1px solid rgba(99,179,237,0.1)',marginBottom:10}}>
                        <div style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'#63b3ed',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>👥 Validação Comunitária</div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:total>0?8:0}}>
                          {[['confirmar','⚠️ Confirmar','#fc8181'],['contestar','✅ Contestar','#48bb78']].map(([tipo,label,c])=>(
                            <button key={tipo} onClick={()=>handleVotar(b.id,tipo)} style={{padding:'6px 0',borderRadius:6,cursor:'pointer',fontSize:10,fontFamily:'Space Mono,monospace',fontWeight:700,transition:'all 0.15s',background:v.meuVoto===tipo?`rgba(${tipo==='confirmar'?'252,129,129':'72,187,120'},0.2)`:'transparent',border:`1px solid ${v.meuVoto===tipo?c:c+'50'}`,color:v.meuVoto===tipo?c:'#94a3b8'}}>{label}</button>
                          ))}
                        </div>
                        {total>0&&(
                          <>
                            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                              <span style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'#fc8181'}}>⚠️ {v.confirmar} ({pctC}%)</span>
                              <span style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'#48bb78'}}>✅ {v.contestar} ({100-pctC}%)</span>
                            </div>
                            <div style={{height:5,borderRadius:3,background:'#151d35',overflow:'hidden'}}>
                              <div style={{height:'100%',width:`${pctC}%`,background:'linear-gradient(90deg,#fc8181,#f56565)',borderRadius:3,transition:'width 0.4s ease'}}/>
                            </div>
                            <div style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'#4a5568',marginTop:3,textAlign:'center'}}>{total} voto{total!==1?'s':''}</div>
                          </>
                        )}
                      </div>

                      <button onClick={()=>{setSelected(b);setView('mapa');}} style={{width:'100%',padding:'8px 0',background:'rgba(99,179,237,0.08)',border:'1px solid rgba(99,179,237,0.2)',borderRadius:6,color:'#63b3ed',fontFamily:'Space Mono,monospace',fontSize:11,cursor:'pointer',letterSpacing:'0.05em'}}>
                        VER NO MAPA →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW: DIVERGÊNCIAS (fiscal independente — satélite vs laudo oficial) */}
          {view==='divergencias'&&(
            <div style={{padding:'24px 28px',maxWidth:1000,margin:'0 auto'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                <span style={{fontSize:24}}>🚩</span>
                <h2 style={{margin:0,fontSize:20,color:'#e2e8f0'}}>Divergências — Satélite vs. Laudo Oficial</h2>
              </div>
              <div style={{fontSize:13,color:'#94a3b8',lineHeight:1.6,marginBottom:20,maxWidth:720}}>
                O <b style={{color:'#cbd5e0'}}>OrbitalGuard</b> compara o que o satélite vê <b style={{color:'#4fd1c5'}}>hoje</b> com a
                Categoria de Risco oficial do SNISB/ANM — que se baseia em vistorias espaçadas.
                Quando o satélite detecta deformação que o laudo oficial <b style={{color:'#fc8181'}}>ainda não registrou</b>,
                levantamos a bandeira. <b style={{color:'#cbd5e0'}}>Foi esse o padrão de Brumadinho.</b>
              </div>

              {divergencias?.divergencias?.length>0 ? divergencias.divergencias.map(d=>(
                <div key={d.id} style={{background:'linear-gradient(135deg,rgba(252,129,129,0.08),rgba(10,15,30,0.5))',border:'1px solid rgba(252,129,129,0.3)',borderRadius:12,padding:18,marginBottom:14}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
                    <div>
                      <div style={{fontSize:16,fontWeight:600,color:'#e2e8f0'}}>🚩 {d.nome}</div>
                      <div style={{fontFamily:'Space Mono,monospace',fontSize:11,color:'#94a3b8',marginTop:2}}>{d.municipio}/MG</div>
                    </div>
                    <div style={{textAlign:'center',background:'#050810',borderRadius:10,padding:'8px 16px',border:'1px solid rgba(252,129,129,0.3)'}}>
                      <div style={{fontFamily:'Space Mono,monospace',fontSize:22,fontWeight:700,color:'#fc8181'}}>+{d.divergencia_sar_vs_oficial}</div>
                      <div style={{fontSize:8,color:'#4a5568',textTransform:'uppercase',letterSpacing:'0.06em'}}>divergência</div>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:14}}>
                    <div style={{background:'rgba(79,209,197,0.08)',borderRadius:8,padding:'10px 12px',border:'1px solid rgba(79,209,197,0.2)'}}>
                      <div style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'#4fd1c5',textTransform:'uppercase',marginBottom:3}}>🛰️ Satélite (hoje)</div>
                      <div style={{fontSize:15,fontWeight:700,color:'#4fd1c5'}}>{d.deformacao_atual_dB} dB</div>
                      <div style={{fontSize:10,color:'#94a3b8'}}>deformação severa detectada</div>
                    </div>
                    <div style={{background:'rgba(160,174,192,0.06)',borderRadius:8,padding:'10px 12px',border:'1px solid rgba(160,174,192,0.15)'}}>
                      <div style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'#a0aec0',textTransform:'uppercase',marginBottom:3}}>🏛️ Laudo oficial</div>
                      <div style={{fontSize:15,fontWeight:700,color:'#a0aec0'}}>CRI {d.categoria_anm}</div>
                      <div style={{fontSize:10,color:'#94a3b8'}}>baseado em vistoria espaçada</div>
                    </div>
                  </div>
                  <div style={{marginTop:12,fontFamily:'Space Mono,monospace',fontSize:11,color:'#fc8181',display:'flex',alignItems:'center',gap:6}}>
                    ⚠️ Fusion Score {d.fusion_score} — o satélite indica risco maior que o registro oficial.
                  </div>
                </div>
              )) : (
                <div style={{background:'#0a0f1e',border:'1px solid rgba(72,187,120,0.2)',borderRadius:12,padding:30,textAlign:'center'}}>
                  <div style={{fontSize:32,marginBottom:8}}>✅</div>
                  <div style={{color:'#94a3b8',fontSize:13}}>Nenhuma divergência crítica no momento — satélite e laudos oficiais alinhados.</div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: CASO BRUMADINHO (dados SAR reais) */}
          {view==='brumadinho'&&(
            <div style={{padding:'24px 28px',maxWidth:1000,margin:'0 auto'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                <span style={{fontSize:24}}>🛰️</span>
                <h2 style={{margin:0,fontSize:20,color:'#e2e8f0'}}>Caso Brumadinho — Validação com Dados Reais</h2>
              </div>
              <div style={{fontFamily:'Space Mono,monospace',fontSize:11,color:'#63b3ed',marginBottom:20}}>
                {brumadinho?.fonte || 'Sentinel-1 GRD (ESA/Copernicus)'} · {brumadinho?.n_cenas||16} cenas processadas
              </div>

              <div style={{background:'#0a0f1e',border:'1px solid rgba(252,129,129,0.2)',borderRadius:12,padding:20,marginBottom:20}}>
                <div style={{fontFamily:'Space Mono,monospace',fontSize:10,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>
                  Backscatter SAR (VV) — Barragem B1 · antes e depois do colapso
                </div>
                {brumadinho?.serie?.length>0?(
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={brumadinho.serie} margin={{top:10,right:20,bottom:0,left:-10}}>
                      <defs>
                        <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4fd1c5" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#4fd1c5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="data" tick={{fontSize:9,fill:'#4a5568',fontFamily:'Space Mono'}} interval={2}/>
                      <YAxis domain={['dataMin-1','dataMax+1']} tick={{fontSize:9,fill:'#4a5568',fontFamily:'Space Mono'}} label={{value:'dB',angle:-90,position:'insideLeft',fill:'#4a5568',fontSize:10}}/>
                      <RTooltip contentStyle={{background:'#0a0f1e',border:'1px solid rgba(99,179,237,0.3)',borderRadius:8,fontFamily:'Space Mono',fontSize:11}}/>
                      <ReferenceLine x="2019-01-22" stroke="#f56565" strokeDasharray="4 4" strokeWidth={2} label={{value:'⚠ Colapso 25/jan',fill:'#f56565',fontSize:10,position:'top'}}/>
                      {brumadinho.baseline_pre_dB&&<ReferenceLine y={brumadinho.baseline_pre_dB} stroke="#a0aec0" strokeDasharray="2 2" strokeWidth={1}/>}
                      <Area type="monotone" dataKey="vv_dB" stroke="#4fd1c5" strokeWidth={2.5} fill="url(#gradB)" dot={{r:3,fill:'#4fd1c5'}}/>
                    </AreaChart>
                  </ResponsiveContainer>
                ):(
                  <div style={{padding:40,textAlign:'center',color:'#4a5568',fontFamily:'Space Mono',fontSize:12}}>Carregando dados SAR reais…</div>
                )}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
                {[
                  ['Baseline pré',`${brumadinho?.baseline_pre_dB??'—'} dB`,'#63b3ed'],
                  ['Média pós-colapso',`${brumadinho?.media_pos_dB??'—'} dB`,'#fc8181'],
                  ['Variação',`${brumadinho?.delta_pos_pre_dB>0?'+':''}${brumadinho?.delta_pos_pre_dB??'—'} dB`,'#f6e05e'],
                ].map(([k,v,c])=>(
                  <div key={k} style={{background:'#0a0f1e',border:'1px solid rgba(99,179,237,0.12)',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
                    <div style={{fontFamily:'Space Mono,monospace',fontSize:18,fontWeight:700,color:c}}>{v}</div>
                    <div style={{fontSize:10,color:'#4a5568',textTransform:'uppercase',letterSpacing:'0.06em',marginTop:4}}>{k}</div>
                  </div>
                ))}
              </div>

              <div style={{background:'#0a0f1e',borderLeft:'3px solid #4fd1c5',borderRadius:8,padding:'14px 18px'}}>
                <div style={{fontFamily:'Space Mono,monospace',fontSize:10,color:'#4fd1c5',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>🔬 Interpretação científica</div>
                <div style={{fontSize:13,color:'#cbd5e0',lineHeight:1.6}}>
                  {brumadinho?.interpretacao || 'O backscatter pós-colapso aumenta progressivamente: assinatura SAR da deposição de rejeito. Demonstração com dados reais de que eventos de barragem deixam rastro detectável por satélite.'}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* TOAST DE GAMIFICAÇÃO */}
      {toast && (
        <div style={{
          position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:9999,
          background:'linear-gradient(135deg,#1a2138,#0a0f1e)',
          border:'1px solid rgba(246,224,94,0.4)', borderRadius:12,
          padding:'12px 22px', boxShadow:'0 8px 32px rgba(0,0,0,0.6), 0 0 24px rgba(246,224,94,0.15)',
          display:'flex', alignItems:'center', gap:12, animation:'slideUp 0.3s ease',
        }}>
          <style>{`@keyframes slideUp{from{opacity:0;transform:translate(-50%,16px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
          {toast.pontos!=null ? (
            <>
              <span style={{fontSize:26}}>🌟</span>
              <div>
                <div style={{fontFamily:'Space Mono,monospace',fontSize:15,fontWeight:700,color:'#f6e05e'}}>+{toast.pontos} pontos!</div>
                <div style={{fontFamily:'Space Mono,monospace',fontSize:10,color:'#94a3b8'}}>Verificação registrada{toast.streak>1?` · 🔥 streak de ${toast.streak} dias`:''}</div>
              </div>
            </>
          ) : (
            <div style={{fontFamily:'Space Mono,monospace',fontSize:12,color:'#94a3b8'}}>{toast.msg}</div>
          )}
        </div>
      )}
    </div>
  );
}

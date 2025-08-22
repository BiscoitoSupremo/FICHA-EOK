(() => {
  // ===== Estado =====
  let charge = 0;                 // 0..100
  let stockPoints = 0;            // pontos disponíveis
  const perTurnReward = 3;        // +3 por giro completo
  const CIRC = 2 * Math.PI * 60;  // circunferência do SVG (r=60)

  // ===== Seletores =====
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // Core ring
  const progressEl    = $('.progress');
  const chargeDisplay = $('#chargeDisplay');
  const stockDisplay  = $('#stockDisplay');
  const btnOpenDep1   = $('#openDeposit');
  const btnOpenDep2   = $('#openDeposit2');

  // Modal depósito (custom)
  const depModal      = $('#depositModal');
  const depAmount     = $('#depositAmount');
  const depConfirm    = $('#confirmDeposit');
  const depCancel     = $('#cancelDeposit');
  const burstFX       = $('.burst');

  // Mods
  const plusBtns      = $$('.plus');
  const modValues     = [0,1,2,3,4].map(i => $(`#modVal${i}`));

  // Header
  const nome          = $('#nome');
  const idade         = $('#idade');
  const essencia      = $('#essencia');
  const fotoInput     = $('#fotoInput');
  const fotoPreview   = $('#fotoPreview');
  const bgURL         = $('#bgURL');
  const btnAplicarBG  = $('#btnAplicarBG');
  const btnSalvar     = $('#btnSalvar');
  const btnCarregar   = $('#btnCarregar');
  const btnBaixarJSON = $('#btnBaixarJSON');
  const importarArq   = $('#importarArquivo');
  const headerEl      = $('.header');

  // Mochila/Grimório
  const togglePack    = $('#togglePack');
  const packBody      = $('#packBody');
  const book          = $('#book');
  const bookToggle    = $('#bookToggle');
  const grimoireText  = $('#grimoireText');
  const saveGrimoire  = $('#saveGrimoire');
  const exportTxt     = $('#exportTxt');
  const exportPdf     = $('#exportPdf');

  // Dados
  const dieSelect     = $('#dieSelect');
  const rollBtn       = $('#rollBtn');
  const dieIcon       = $('#dieIcon');
  const diceResult    = $('#diceResult');

  // Decisão/Temas
  const decisionOverlay = $('#decisionOverlay');
  const openDecision    = $('#openDecision');
  const chooseSangue    = $('#chooseSangue');
  const choosePoeira    = $('#choosePoeira');

  // Footer
  const contactDM     = $('#contactDM');

  // ===== Helpers =====
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
  const easeInOutCubic = x => x<0.5 ? 4*x*x*x : 1 - Math.pow(-2*x+2,3)/2;

  // ===== Init =====
  function init(){
    // Ring
    progressEl.style.strokeDasharray = CIRC;
    updateRing();
    render();

    // Depósito
    [btnOpenDep1, btnOpenDep2].forEach(b => b.addEventListener('click', showDepositModal));
    depConfirm.addEventListener('click', confirmDeposit);
    depCancel.addEventListener('click', hideDepositModal);
    depModal.addEventListener('click', e => { if (e.target === depModal) hideDepositModal(); });

    // Mods
    plusBtns.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        if (stockPoints<=0) return;
        const idx = parseInt(btn.dataset.index,10);
        const el = modValues[idx];
        el.textContent = (parseInt(el.textContent,10)||0) + 1;
        stockPoints--; render();
      });
    });

    // Header: Foto
    fotoInput.addEventListener('change', e=>{
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      fotoPreview.src = url;
      // (não revoga agora pra manter preview)
    });

    // Header: Fundo
    btnAplicarBG.addEventListener('click', ()=>{
      const url = (bgURL.value||'').trim();
      headerEl.style.backgroundImage = url ? `url('${url}')` : 'none';
      headerEl.style.backgroundSize = 'cover';
      headerEl.style.backgroundPosition = 'center';
    });

    // Salvar/Carregar/Exportar/Importar
    btnSalvar.addEventListener('click', salvarLocal);
    btnCarregar.addEventListener('click', carregarLocal);
    btnBaixarJSON.addEventListener('click', baixarJSON);
    importarArq.addEventListener('change', importarJSON);

    // Mochila/Grimório
    togglePack.addEventListener('click', ()=>{
      const open = packBody.hasAttribute('hidden');
      if (open){ packBody.removeAttribute('hidden'); packBody.classList.add('open'); togglePack.setAttribute('aria-expanded','true'); }
      else { packBody.setAttribute('hidden',''); packBody.classList.remove('open'); togglePack.setAttribute('aria-expanded','false'); }
    });
    bookToggle.addEventListener('click', ()=> book.classList.toggle('open'));
    saveGrimoire.addEventListener('click', salvarLocal);
    exportTxt.addEventListener('click', exportarTxt);
    exportPdf.addEventListener('click', exportarPdf);

    // Dados
    rollBtn.addEventListener('click', rollDie);

    // Decisão/Temas
    openDecision.addEventListener('click', ()=> decisionOverlay.classList.add('on'));
    decisionOverlay.addEventListener('click', e=>{ if (e.target === decisionOverlay) decisionOverlay.classList.remove('on'); });
    chooseSangue.addEventListener('click', ()=>{
      document.body.classList.remove('theme-poeira');
      document.body.classList.add('theme-sangue-dark');
      decisionOverlay.classList.remove('on');
    });
    choosePoeira.addEventListener('click', ()=>{
      document.body.classList.remove('theme-sangue-dark');
      document.body.classList.add('theme-poeira');
      decisionOverlay.classList.remove('on');
    });

    // DM
    contactDM.addEventListener('click', ()=>{
      const txt = encodeURIComponent('ilumine-me, ó lustre divino');
      window.open(`https://wa.me/5519990030340?text=${txt}`, '_blank');
    });
  }
  document.addEventListener('DOMContentLoaded', init);

  // ===== UI core =====
  function showDepositModal(){ depModal.classList.remove('hidden'); depAmount.focus(); }
  function hideDepositModal(){ depModal.classList.add('hidden'); }

  function confirmDeposit(){
    const val = clamp(parseInt((depAmount.value||'').trim(),10)||0, 1, 10000);
    if (!Number.isFinite(val) || val<=0) return;
    animateBurst();
    hideDepositModal();
    depAmount.value = '';
    depositPercentage(val);
  }


  function depositPercentage(perc){
    const total = charge + perc;
    const fullTurns = Math.floor(total / 100);
    const remainder = total % 100;

    if (fullTurns > 0){
      animateChargeTo(100, () => {
        stockPoints += fullTurns * perTurnReward;
        charge = 0; updateRing(); render();
        if (remainder > 0){ setTimeout(()=>animateChargeTo(remainder, render), 220); }
      });
    } else {
      animateChargeTo(remainder, render);
    }
  }

  function animateChargeTo(target, onDone){
    const start = charge;
    const end = clamp(target, 0, 100);
    const dur = 1100;
    const t0 = performance.now();

    function tick(t){
      const p = Math.min(1, (t - t0) / dur);
      const eased = easeInOutCubic(p);
      const current = start + (end - start)*eased;
      charge = current; updateRing();
      if (p < 1) requestAnimationFrame(tick);
      else { charge = end; updateRing(); onDone && onDone(); }
    }
    requestAnimationFrame(tick);
  }

  function updateRing(){
    const filled = clamp(charge,0,100)/100;
    const offset = CIRC * (1 - filled);
    progressEl.style.strokeDashoffset = offset;
    chargeDisplay.textContent = `${Math.round(charge)}%`;
  }
  function render(){
    stockDisplay.textContent = `${stockPoints}`;
    plusBtns.forEach(b => b.disabled = stockPoints<=0);
  }
  function animateBurst(){
    burstFX.classList.remove('on'); void burstFX.offsetWidth; burstFX.classList.add('on');
    setTimeout(()=>burstFX.classList.remove('on'), 550);
  }

  // ===== Persistência & Export =====
  function getState(){
    return {
      header:{
        nome: nome.value, idade: idade.value, essencia: essencia.value, foto: fotoPreview.src || ''
      },
      core:{ charge: Math.round(charge), stockPoints },
      mods: [0,1,2,3,4].map(i => ({
        nome: document.getElementById(`modName${i}`).value,
        valor: parseInt(document.getElementById(`modVal${i}`).textContent,10)||0
      })),
      mochila:{
        itens: Array.from(document.querySelectorAll('.item .item-name')).map(i=>i.value),
        grimoire: grimoireText.value
      },
      tema: document.body.className
    };
  }
  function setState(st){
    if (!st) return;
    nome.value = st.header?.nome || '';
    idade.value = st.header?.idade || '';
    essencia.value = st.header?.essencia || '';
    if (st.header?.foto) fotoPreview.src = st.header.foto;

    charge = clamp(st.core?.charge ?? 0, 0, 100);
    stockPoints = Math.max(0, st.core?.stockPoints ?? 0);
    updateRing(); render();

    (st.mods||[]).forEach((m,i)=>{
      document.getElementById(`modName${i}`).value = m?.nome || '';
      document.getElementById(`modVal${i}`).textContent = m?.valor ?? 0;
    });

    const names = document.querySelectorAll('.item .item-name');
    (st.mochila?.itens||[]).forEach((txt,i)=>{ if (names[i]) names[i].value = txt || ''; });
    grimoireText.value = st.mochila?.grimoire || '';

    document.body.className = st.tema || 'theme-sangue';
  }
  function salvarLocal(){ localStorage.setItem('ficha_portal', JSON.stringify(getState())); alert('Salvo localmente!') }
  function carregarLocal(){
    const raw = localStorage.getItem('ficha_portal');
    if (!raw) return alert('Nada salvo.');
    try{ setState(JSON.parse(raw)); }catch{ alert('JSON salvo inválido.'); }
  }
  function baixarJSON(){
    const blob = new Blob([JSON.stringify(getState(), null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'ficha_portal.json'; a.click();
    URL.revokeObjectURL(url);
  }
  function importarJSON(e){
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => { try{ setState(JSON.parse(ev.target.result)); }catch{ alert('Arquivo JSON inválido.'); } };
    reader.readAsText(f);
  }

  function exportarTxt(){
    const blob = new Blob([grimoireText.value||''], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'grimorio.txt'; a.click();
    URL.revokeObjectURL(url);
  }
  function exportarPdf(){
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF){ alert('jsPDF não carregou.'); return; }
    const doc = new jsPDF({ unit:'pt', format:'a4' });
    const margin = 40, maxWidth = 515;
    const text = grimoireText.value || '';
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.setFont('Times','Normal'); doc.setFontSize(12);
    doc.text(lines, margin, margin);
    doc.save('grimorio.pdf');
  }

  // ===== Dados =====
  function rollDie(){
    const faces = parseInt(dieSelect.value,10) || 20;
    diceResult.hidden = true;
    dieIcon.classList.add('rolling');
    setTimeout(()=>{
      dieIcon.classList.remove('rolling');
      const result = Math.floor(Math.random()*faces) + 1;
      diceResult.textContent = result;
      diceResult.hidden = false;
      setTimeout(()=> diceResult.hidden = true, 1600);
    }, 2000);
  }

  // ===== Bind persistência & export =====
  window.salvarLocal = salvarLocal;
  window.carregarLocal = carregarLocal;
  window.baixarJSON = baixarJSON;
  window.importarJSON = importarJSON;
  window.exportarTxt = exportarTxt;
  window.exportarPdf = exportarPdf;

})();

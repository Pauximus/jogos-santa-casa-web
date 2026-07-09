// V0.9.0 — base para aviso de atualização futura
(function(){
  function current(){ return window.APP_INFO?.label || 'V0.9.0'; }
  function showUpdateNotice(nextLabel){
    if(document.getElementById('v09UpdateNotice')) return;
    const el=document.createElement('div');
    el.id='v09UpdateNotice';
    el.className='v09-update-notice';
    el.innerHTML=`<strong>🍀 Nova versão disponível</strong><span>Estás em ${current()} · disponível ${nextLabel}</span><button type="button">Atualizar</button>`;
    el.querySelector('button')?.addEventListener('click',()=>location.reload());
    document.body.appendChild(el);
  }
  window.JSCUpdatesV09={showUpdateNotice,current};
})();

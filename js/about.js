// V0.9.0 — painel Sobre / diagnóstico simples
(function(){
  function q(id){ return document.getElementById(id); }
  function info(){ return window.APP_INFO || {}; }
  function versionText(){ const i=info(); return `${i.label || 'V0.9.0'} · ${i.codename || 'Release Candidate'}`; }

  function ensureAboutPanel(){
    if (q('v09AboutPanel')) return q('v09AboutPanel');
    const settings = q('paginaDefinicoes') || q('definicoes') || document.querySelector('[data-page="definicoes"]') || document.querySelector('.settings-page') || document.querySelector('main');
    if(!settings) return null;
    const panel = document.createElement('section');
    panel.id = 'v09AboutPanel';
    panel.className = 'card v09-about-panel';
    panel.innerHTML = `
      <div class="v09-about-head">
        <div>
          <h2>ℹ️ Sobre a aplicação</h2>
          <p>Informação técnica para suporte e preparação de lançamento.</p>
        </div>
        <span class="v54-pill" data-app-version>${info().label || 'V0.9.0'}</span>
      </div>
      <div class="v09-about-grid">
        <div><span>Versão</span><b id="v09AboutVersion">—</b></div>
        <div><span>Build</span><b id="v09AboutBuild">—</b></div>
        <div><span>Codename</span><b id="v09AboutCodename">—</b></div>
        <div><span>Ambiente</span><b id="v09AboutEnv">—</b></div>
        <div><span>Backend</span><b id="v09AboutBackend">—</b></div>
        <div><span>Push</span><b id="v09AboutPush">—</b></div>
        <div><span>Cloud</span><b id="v09AboutCloud">—</b></div>
        <div><span>Browser</span><b id="v09AboutBrowser">—</b></div>
      </div>
      <div class="v09-about-actions">
        <button type="button" id="v09CopyInfo">📋 Copiar info</button>
      </div>
      <pre id="v09AboutDebug" class="v09-debug" hidden></pre>
    `;
    settings.appendChild(panel);
    return panel;
  }

  function refresh(){
    const i=info();
    document.querySelectorAll('[data-app-version], .v72-pill, .v54-pill, .version-badge').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(el.hasAttribute('data-app-version') || /^V\d/.test(t)) el.textContent=i.label || 'V0.9.0';
    });
    const set=(id,val)=>{ const el=q(id); if(el) el.textContent=val; };
    set('v09AboutVersion', i.label || 'V0.9.0');
    set('v09AboutBuild', i.build || '—');
    set('v09AboutCodename', i.codename || '—');
    set('v09AboutEnv', i.environment || '—');
    set('v09AboutBackend', i.backend || '—');
    set('v09AboutPush', i.push || '—');
    set('v09AboutCloud', i.cloud ? 'Online' : '—');
    set('v09AboutBrowser', navigator.userAgent.split(') ')[0] + ')');
  }

  function copyInfo(){
    const i=info();
    const text = [
      i.name || 'Assistente Jogos Santa Casa',
      `Versão: ${i.label || 'V0.9.0'}`,
      `Build: ${i.build || '—'}`,
      `Codename: ${i.codename || '—'}`,
      `Ambiente: ${i.environment || '—'}`,
      `Backend: ${i.backend || '—'}`,
      `Push: ${i.push || '—'}`,
      `Cloud: ${i.cloud ? 'Online' : '—'}`,
      `URL: ${location.href}`,
      `Browser: ${navigator.userAgent}`
    ].join('\n');
    navigator.clipboard?.writeText(text).then(()=>alert('Informação copiada.')).catch(()=>{ prompt('Copia a informação:', text); });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    ensureAboutPanel();
    refresh();
    q('v09CopyInfo')?.addEventListener('click', copyInfo);
    console.log('APP_VERSION', versionText());
  });
  window.JSCAboutV09 = { refresh, ensureAboutPanel, copyInfo };
})();

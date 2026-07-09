// V0.9.0 — base para feedback futuro
(function(){
  window.JSCFeedbackV09 = {
    open(type='sugestao'){
      const subject = encodeURIComponent(`[${type}] Assistente Jogos Santa Casa ${window.APP_INFO?.label || ''}`);
      const body = encodeURIComponent(`Descreve aqui a tua sugestão/erro.\n\nVersão: ${window.APP_INFO?.label || ''}\nURL: ${location.href}`);
      location.href = `mailto:pauximus@gmail.com?subject=${subject}&body=${body}`;
    }
  };
})();

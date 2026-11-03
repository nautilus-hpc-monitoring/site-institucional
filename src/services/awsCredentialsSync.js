module.exports = function criar({ provider, model, now = Date.now, log = console, schedule = setTimeout, cancel = clearTimeout }) {
    const margem = 5 * 60 * 1000;
    let pending, timer, running = false;
    const valido = c => c && c.accessKeyId && c.secretAccessKey && c.sessionToken && Number.isFinite(new Date(c.expiration).getTime()) && new Date(c.expiration).getTime() - now() > margem;
    function atualizar() {
        if (!pending) pending = (async () => {
            const c = await provider();
            if (!valido(c)) throw new Error('Credenciais indisponiveis');
            await model.salvar(c);
            return c;
        })().finally(() => { pending = null; });
        return pending;
    }
    async function obter() {
        const c = await model.buscar();
        return valido(c) ? c : atualizar();
    }
    async function ciclo() {
        let delay = 30000;
        try {
            const c = await atualizar();
            delay = Math.max(30000, Math.min(60000, new Date(c.expiration).getTime() - now() - margem));
        } catch (_) { log.error('Sincronizacao AWS indisponivel; nova tentativa em 30 segundos.'); }
        if (running) { timer = schedule(ciclo, delay); timer.unref?.(); }
    }
    return { obter, atualizar, iniciar() { if (!running) { running = true; return ciclo(); } }, parar() { running = false; cancel(timer); } };
};

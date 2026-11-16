// Sessão assinada: o servidor confia no login validado, nunca no ID do navegador.
const crypto = require('crypto');
const chave = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const nome = 'nautilus_cluster';
function assinatura(texto) { return crypto.createHmac('sha256', chave).update(texto).digest('hex'); }
function criar(req, res, id) {
    const corpo = Buffer.from(JSON.stringify({id, exp: Date.now() + 8*60*60*1000})).toString('base64url');
    res.cookie(nome, corpo + '.' + assinatura(corpo), {httpOnly:true, sameSite:'strict', secure:req.secure, maxAge:8*60*60*1000, path:'/'});
}
function identificar(req, res, next) {
    try {
        const cookie = (req.headers.cookie || '').split(';').map(v=>v.trim()).find(v=>v.startsWith(nome+'='));
        if (!cookie) throw Error();
        const [corpo, ass] = decodeURIComponent(cookie.slice(nome.length+1)).split('.');
        const esperado = assinatura(corpo);
        if (!ass || ass.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(ass),Buffer.from(esperado))) throw Error();
        const dados = JSON.parse(Buffer.from(corpo,'base64url').toString());
        if (!Number.isSafeInteger(dados.id) || dados.exp <= Date.now()) throw Error();
        req.usuarioClusterId = dados.id;
        next();
    } catch (_) { res.status(401).json({erro:'Entre novamente para acessar os dados do cluster.'}); }
}
module.exports = {criar, identificar};

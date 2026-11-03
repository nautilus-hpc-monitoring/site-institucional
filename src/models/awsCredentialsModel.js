const db = require('../database/config');

exports.salvar = c => db.executar(
    'INSERT INTO aws_credentials (id, access_key_id, secret_access_key, session_token, expiration_ms) VALUES (1, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE access_key_id = VALUES(access_key_id), secret_access_key = VALUES(secret_access_key), session_token = VALUES(session_token), expiration_ms = VALUES(expiration_ms)',
    [c.accessKeyId, c.secretAccessKey, c.sessionToken, new Date(c.expiration).getTime()]);
exports.buscar = async () => {

    const rows = await db.executar('SELECT access_key_id, secret_access_key, session_token, expiration_ms FROM aws_credentials WHERE id = 1');
    if (!rows[0]) return null;
    const r = rows[0];
    return { accessKeyId: r.access_key_id, secretAccessKey: r.secret_access_key, sessionToken: r.session_token, expiration: new Date(Number(r.expiration_ms)).toISOString() };
};

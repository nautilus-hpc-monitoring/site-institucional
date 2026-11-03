const { test } = require('node:test');
const assert = require('node:assert/strict');
const criar = require('../src/services/awsCredentialsSync');
const now = 1000000;
const fresh = { accessKeyId: 'test', secretAccessKey: 'fake', sessionToken: 'fake', expiration: new Date(now + 3600000) };
test('concurrent refresh calls share one provider and one atomic write', async () => {
    let calls = 0, writes = 0;
    const s = criar({ now: () => now, provider: async () => { calls++; return fresh; }, model: { salvar: async () => { writes++; } } });
    await Promise.all([s.atualizar(), s.atualizar(), s.atualizar()]);
    assert.equal(calls, 1); assert.equal(writes, 1);
});
test('valid database credentials do not call metadata', async () => {
    const s = criar({ now: () => now, provider: () => { throw Error('unexpected'); }, model: { buscar: async () => fresh } });
    assert.equal(await s.obter(), fresh);
});
test('expired credentials are never returned when provider fails', async () => {
    const s = criar({ now: () => now, provider: async () => { throw Error('offline'); }, model: { buscar: async () => ({ ...fresh, expiration: new Date(now - 1) }) } });
    await assert.rejects(s.obter(), /offline/);
});
test('provider credentials without adequate expiration are never saved', async () => {
    let saved = false;
    const s = criar({ now: () => now, provider: async () => ({ ...fresh, expiration: new Date(now + 1000) }), model: { salvar: async () => { saved = true; } } });
    await assert.rejects(s.atualizar()); assert.equal(saved, false);
});
test('startup failure schedules retry and never logs secrets', async () => {
    let delay, logs = [];
    const s = criar({ provider: async () => { throw Error('SECRET'); }, model: {}, log: { error: m => logs.push(m) }, schedule: (_, ms) => { delay = ms; return {}; }, cancel: () => {} });
    await s.iniciar(); s.parar(); assert.equal(delay, 30000); assert.ok(!logs.join('').includes('SECRET'));
});
test('database write failure fails refresh and subsequent retry works', async () => {
    let fail = true;
    const s = criar({ now: () => now, provider: async () => fresh, model: { salvar: async () => { if (fail) throw Error('database'); } } });
    await assert.rejects(s.atualizar()); fail = false; assert.equal(await s.atualizar(), fresh);
});

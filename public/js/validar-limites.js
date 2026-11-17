// A mesma regra é usada pela tela e pela API. Retorna uma mensagem ou null.
function validarLimitesComponente(componente, tipo) {
    tipo = String(tipo).trim().toUpperCase();
    if (!["CPU", "RAM", "DISCO", "SWAP"].includes(tipo)) {
        return "Tipo de componente não suportado: " + tipo;
    }

    function vazio(valor) {
        return valor === null || valor === undefined || (typeof valor === "string" && valor.trim() === "");
    }

    function validarNumero(valor, nome, obrigatorio) {
        if (vazio(valor)) return obrigatorio ? tipo + ": preencha " + nome + "." : null;
        if (!["number", "string"].includes(typeof valor)) return tipo + ": " + nome + " deve ser um número.";
        const numero = Number(valor);
        if (!Number.isFinite(numero) || numero < 0 || numero > 100) {
            return tipo + ": " + nome + " deve estar entre 0 e 100%.";
        }
        if (Math.abs(numero * 100 - Math.round(numero * 100)) > 0.00000001) {
            return tipo + ": use no máximo duas casas decimais em " + nome + ".";
        }
        return null;
    }

    const ehSwap = tipo === "SWAP";
    if (!ehSwap) {
        const erro = validarNumero(componente.picoMin, "Mínimo", true)
            || validarNumero(componente.picoMax, "Máximo", true);
        if (erro) return erro;
        if (Number(componente.picoMin) >= Number(componente.picoMax)) {
            return tipo + ": Mínimo deve ser menor que Máximo. Use mínimo 0 para desativar alertas por baixo uso.";
        }
    }

    // Na swap são obrigatórios; nos outros componentes só valida se forem preenchidos.
    const exigeLimites = ehSwap || !vazio(componente.limiteAtencao) || !vazio(componente.limiteCritico);
    if (exigeLimites) {
        const erro = validarNumero(componente.limiteAtencao, "Atenção", true)
            || validarNumero(componente.limiteCritico, "Crítico", true);
        if (erro) return erro;
        if (Number(componente.limiteAtencao) >= Number(componente.limiteCritico)) {
            return tipo + ": Atenção deve ser menor que Crítico.";
        }
    }

    return validarNumero(componente.percentual, "Variância", false);
}

if (typeof module !== "undefined") module.exports = validarLimitesComponente;

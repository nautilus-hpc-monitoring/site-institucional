if (sessionStorage.NOME_USUARIO) {
    document.getElementById("b_usuario").innerHTML = sessionStorage.NOME_USUARIO;
}

const fkEmpresaUsuario = sessionStorage.ID_EMPRESA;

let memoriaHPCs = [];
let hpcSelecionado = null;
let memoriaClusters = [];
let clusterSelecionado = null;
let memoriaNodes = [];

window.onload = function () {
    validarSessao();
    listarHPC();
};

function chamarAPI(rota, dados) {
    return fetch("/hpc/" + rota, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados || {})
    }).then(async function (resposta) {
        if (resposta.ok) return resposta.json();
        if (resposta.status === 404) throw new Error("Rota indisponivel no servidor. Atualize o projeto e reinicie o servico nautilus-web na EC2.");

        var mensagem = await resposta.text();
        try {
            var erro = JSON.parse(mensagem);
            mensagem = erro.erro || erro.mensagem || mensagem;
        } catch (erro) {
            // Algumas validações retornam texto simples, em vez de JSON.
        }
        throw new Error(mensagem || "Não foi possível concluir a operação.");
    });
}

function mostrarErro(erro) {
    alert(erro.message || "Não foi possível acessar o servidor. Tente novamente.");
}

//HPC

function listarHPC() {
    chamarAPI("listarHPC", { empresaServer: fkEmpresaUsuario })
        .then(lista => {
            memoriaHPCs = lista;
            desenharTabelaHPC(lista);
        })
        .catch(mostrarErro);
}

function desenharTabelaHPC(lista) {
    let html = `
        <!-- Cabeçalho FORA do painel -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
            <div>
                <h2 style="margin:0; color:#0F172A;">Ambientes HPC</h2>
                <p class="page-subtitle" style="margin: 5px 0 0 0;">Ambientes HPC da sua empresa</p>
            </div>
            <div>
                <button class="btn btn-primary" onclick="abrirFormularioHPC()">Novo HPC</button>
            </div>
        </div>
        
        <!-- Painel contendo APENAS a tabela -->
        <div class="panel-card">
            <div class="tabela-wrap">
                <table class="tabela">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Localização</th>
                            <th>Clusters</th> 
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    if (lista.length === 0) {
        html += `<tr><td colspan="5" class="vazio">Nenhum HPC encontrado.</td></tr>`;
    } else {
        for (let i = 0; i < lista.length; i++) {
            let hpc = lista[i];

            let badgeClass = "badge-ativo";
            if (hpc.status === "inativo") badgeClass = "badge-inativo";
            if (hpc.status === "manut.") badgeClass = "badge-manut";

            html += `
                        <tr class="clicavel" onclick="listarClusters(${hpc.id})">
                            <td><strong>${hpc.nome}</strong></td>
                            <td>${hpc.localizacao}</td>
                            <td>${hpc.totalClusters || 0}</td>
                            <td><span class="badge ${badgeClass}">${hpc.status}</span></td>
                            <td>
                                <button class="btn" onclick="event.stopPropagation(); abrirFormularioHPC(${hpc.id})">Editar</button>
                                <button class="btn btn-danger" onclick="event.stopPropagation(); deletarHPC(${hpc.id})">Excluir</button>
                            </td>
                        </tr>
            `;
        }
    }

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `; 
        
    document.getElementById("conteudo").innerHTML = html;
}

function abrirFormularioHPC(id) {
    let nome = "";
    let localizacao = "";
    let status = "ativo";

    if (id) {
        let hpc = memoriaHPCs.find(h => h.id === id);
        nome = hpc.nome;
        localizacao = hpc.localizacao;
        status = hpc.status;
    }

    document.getElementById("conteudo").innerHTML = `
            <div class="form-card">
                <h2>${id ? "Editar HPC" : "Novo HPC"}</h2>
                
                <label>Nome do Ambiente:</label>
                <input type="text" id="ipt_nome_hpc" value="${nome}">
                
                <label>Localização / Endereço:</label>
                <input type="text" id="ipt_loc_hpc" value="${localizacao}">
                
                <label>Status:</label>
                <select id="sel_status_hpc">
                    <option value="ativo" ${status === 'ativo' ? 'selected' : ''}>Ativo</option>
                    <option value="inativo" ${status === 'inativo' ? 'selected' : ''}>Inativo</option>
                    <option value="manut." ${status === 'manut.' ? 'selected' : ''}>Manutenção</option>
                </select>
                
                <div class="form-actions">
                    <button class="btn" onclick="listarHPC()">Cancelar</button>
                    <button class="btn btn-primary" onclick="salvarHPC(${id || null})">Salvar</button>
                </div>
            </div>
        `;
}

function salvarHPC(id) {
    let dados = {
        nomeServer: document.getElementById("ipt_nome_hpc").value,
        enderecoServer: document.getElementById("ipt_loc_hpc").value,
        statusServer: document.getElementById("sel_status_hpc").value,
        empresaServer: fkEmpresaUsuario
    };

    let rota = id ? "editarHPC" : "cadastrarHPC";
    if (id) dados.idHpcServer = id;

    chamarAPI(rota, dados)
        .then(() => listarHPC())
        .catch(mostrarErro);
}

function deletarHPC(id) {
    abrirModal("Deseja mesmo excluir este HPC? Ele só pode ser excluído quando não possui clusters.", () => {
        chamarAPI("deletarHPC", { idHpcServer: id })
            .then(() => listarHPC())
            .catch(mostrarErro);
    });
}


//CLUSTERS
function listarClusters(idHpc) {
    hpcSelecionado = memoriaHPCs.find(h => h.id === idHpc);

    chamarAPI("listarClusters", { idHpcServer: idHpc })
        .then(lista => {
            memoriaClusters = lista;
            desenharTabelaClusters(lista);
        })
        .catch(mostrarErro);
}

function desenharTabelaClusters(lista) {
    let html = `
        <!-- Cabeçalho FORA do painel -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
            <div>
                <h2 style="margin:0; color:#0F172A;">Clusters de: ${hpcSelecionado.nome}</h2>
                <p class="page-subtitle" style="margin: 5px 0 0 0;">Clusters Do HPC Escolhido</p>
            </div>
            <div>
                <button class="btn" onclick="listarHPC()">Voltar</button>
                <button class="btn btn-primary" onclick="abrirFormularioCluster()">Novo Cluster</button>
            </div>
        </div>
        
        <!-- Painel contendo APENAS a tabela -->
        <div class="panel-card">
            <div class="tabela-wrap">
                <table class="tabela">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Total de Nodes</th> 
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    if (lista.length === 0) {
        html += `<tr><td colspan="4" class="vazio">Nenhum cluster encontrado.</td></tr>`;
    } else {
        for (let i = 0; i < lista.length; i++) {
            let cluster = lista[i];
            let badgeClass = cluster.status === "ativo" ? "badge-ativo" : "badge-inativo";
            if (cluster.status === "manut.") badgeClass = "badge-manut";

            html += `
                        <tr class="clicavel" onclick="listarNodes(${cluster.id})">
                            <td><strong>${cluster.nome}</strong></td>
                            <td>${cluster.totalNodes || 0}</td> 
                            <td><span class="badge ${badgeClass}">${cluster.status}</span></td>
                            <td>
                                <button class="btn" onclick="event.stopPropagation(); abrirFormularioCluster(${cluster.id})">Editar</button>
                                <button class="btn btn-danger" onclick="event.stopPropagation(); deletarCluster(${cluster.id})">Excluir</button>
                            </td>
                        </tr>
            `;
        }
    }

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    document.getElementById("conteudo").innerHTML = html;
}

function abrirFormularioCluster(id) {
    let nome = "";
    let status = "ativo";

    if (id) {
        let cluster = memoriaClusters.find(c => c.id === id);
        nome = cluster.nome;
        status = cluster.status;
    }

    document.getElementById("conteudo").innerHTML = `
            <div class="form-card">
                <h2>${id ? "Editar Cluster" : "Novo Cluster"}</h2>
                
                <label>Nome do Cluster:</label>
                <input type="text" id="ipt_nome_cluster" value="${nome}">
                
                <label>Status:</label>
                <select id="sel_status_cluster">
                    <option value="ativo" ${status === 'ativo' ? 'selected' : ''}>Ativo</option>
                    <option value="inativo" ${status === 'inativo' ? 'selected' : ''}>Inativo</option>
                    <option value="manut." ${status === 'manut.' ? 'selected' : ''}>Manutenção</option>
                </select>
                
                <div class="form-actions">
                    <button class="btn" onclick="listarClusters(${hpcSelecionado.id})">Cancelar</button>
                    <button class="btn btn-primary" onclick="salvarCluster(${id || null})">Salvar</button>
                </div>
            </div>
        `;
}

function salvarCluster(id) {
    let dados = {
        idHpcServer: hpcSelecionado.id,
        nomeServer: document.getElementById("ipt_nome_cluster").value,
        statusServer: document.getElementById("sel_status_cluster").value
    };

    let rota = id ? "editarCluster" : "cadastrarCluster";
    if (id) dados.idClusterServer = id;

    chamarAPI(rota, dados)
        .then(() => listarClusters(hpcSelecionado.id))
        .catch(mostrarErro);
}

function deletarCluster(id) {
    abrirModal("Deseja mesmo excluir este Cluster? Ele só pode ser excluído quando não possui nodes.", () => {
        chamarAPI("deletarCluster", { idClusterServer: id })
            .then(() => listarClusters(hpcSelecionado.id))
            .catch(mostrarErro);
    });
}


//NODES
function listarNodes(idCluster) {
    clusterSelecionado = memoriaClusters.find(c => c.id === idCluster);

    chamarAPI("listarNodes", { idClusterServer: idCluster })
        .then(lista => {
            memoriaNodes = lista;
            desenharTabelaNodes(lista);
        })
        .catch(mostrarErro);
}

function desenharTabelaNodes(lista) {
    let html = `
        <!-- Cabeçalho FORA do painel -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
            <div>
                <h2 style="margin:0; color:#0F172A;">Nodes de: ${clusterSelecionado.nome}</h2>
                <p class="page-subtitle" style="margin: 5px 0 0 0;">Lista de Nodes associados ao Cluster</p>
            </div>
            <div>
                <button class="btn" onclick="listarClusters(${hpcSelecionado.id})">Voltar</button>
                <button class="btn btn-primary" onclick="abrirFormularioNode()">Novo Node</button>
            </div>
        </div>
        
        <!-- Painel contendo APENAS a tabela -->
        <div class="panel-card">
            <div class="tabela-wrap">
                <table class="tabela">
                    <thead>
                        <tr>
                            <th>Hostname</th>
                            <th>SO</th> 
                            <th>IP</th>
                            <th>Componentes</th> 
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    if (lista.length === 0) {
        html += `<tr><td colspan="6" class="vazio">Nenhum node encontrado.</td></tr>`;
    } else {
        for (let i = 0; i < lista.length; i++) {
            let node = lista[i];
            let badgeClass = node.status === "ativo" ? "badge-ativo" : "badge-inativo";
            if (node.status === "manut.") badgeClass = "badge-manut";

            html += `
                        <tr>
                            <td><strong>${node.hostname}</strong></td>
                            <td>${node.sistemaOperacional}</td>
                            <td>${node.ip}</td>
                            <td>${node.componentes || 'Nenhum'}</td>
                            <td><span class="badge ${badgeClass}">${node.status}</span></td>
                            <td>
                                <button class="btn" onclick="abrirFormularioNode(${node.id})">Editar</button>
                                <button class="btn btn-danger" onclick="deletarNode(${node.id})">Excluir</button>
                            </td>
                        </tr>
            `;
        }
    }
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    document.getElementById("conteudo").innerHTML = html;
}

function gerarCaixaComponente(nome, idComp) {
    let ehSwap = nome.toUpperCase().includes("SWAP");

    return `
        <div class="componente-box" data-tipo="${nome}" style="border: 1px solid #E2E8F0; padding: 12px; border-radius: 6px; margin-bottom: 10px; display:flex; align-items:center; gap: 10px; flex-wrap: wrap; background: #FAFAF9;">
            <div style="width: 140px;">
                <label style="cursor:pointer; display:flex; align-items:center; gap:5px; margin:0; font-size: 14px;">
                    <input type="checkbox" class="chk-comp" value="${idComp}"> <strong>${nome}</strong>
                </label>
            </div>
            ${ehSwap ? "" : `
                <input type="number" min="0" max="100" step="0.01" class="cfg-picomax" placeholder="Máximo" title="Pico Máximo" style="width:95px; margin:0; padding:6px;">
                <input type="number" min="0" max="100" step="0.01" class="cfg-picomin" placeholder="Mínimo" title="Pico Mínimo" style="width:95px; margin:0; padding:6px;">
            `}
            <input type="number" min="0" max="100" step="0.01" class="cfg-perc" placeholder="Variância %" title="A partir de qual variância de porcentagem esse dado será exibido no gráfico" style="width:95px; margin:0; padding:6px;">
            <input type="number" min="0" max="100" step="0.01" class="cfg-atencao" placeholder="Atenção" title="Limite de alerta de Atenção" style="width:95px; margin:0; padding:6px;">
            <input type="number" min="0" max="100" step="0.01" class="cfg-critico" placeholder="Crítico" title="Limite Crítico (Perigo)" style="width:95px; margin:0; padding:6px;">
        </div>
        `;
}

function abrirFormularioNode(id) {
    chamarAPI("listarComponentes")
        .then(componentes => desenharFormularioNode(id, componentes))
        .catch(mostrarErro);
}

function desenharFormularioNode(id, componentes) {
    let node = id ? memoriaNodes.find(n => n.id === id) : null;
    let hostname = node ? node.hostname : "";
    let ip = node ? node.ip : "";
    let so = node ? node.sistemaOperacional : "";
    let status = node ? node.status : "ativo";

    document.getElementById("conteudo").innerHTML = `
            <div class="form-card" style="max-width: 850px;">
                <h2>${id ? "Editar Node" : "Novo Node"}</h2>
                
                <div style="display:flex; gap: 20px;">
                    <div style="flex:1;">
                        <label>Hostname:</label>
                        <input type="text" id="ipt_hostname_node" value="${hostname}">
                        
                        <label>Sistema Operacional (SO):</label>
                        <input type="text" id="ipt_so_node" value="${so}">
                    </div>
                    <div style="flex:1;">
                        <label>Endereço IP:</label>
                        <input type="text" id="ipt_ip_node" value="${ip}">
                        
                        <label>Status:</label>
                        <select id="sel_status_node">
                            <option value="ativo" ${status === 'ativo' ? 'selected' : ''}>Ativo</option>
                            <option value="inativo" ${status === 'inativo' ? 'selected' : ''}>Inativo</option>
                            <option value="manut." ${status === 'manut.' ? 'selected' : ''}>Manutenção</option>
                        </select>
                    </div>
                </div>
 
                <hr style="margin: 20px 0; border: 1px solid #E2E8F0;">
                
                <div style="margin-bottom: 20px;">
                    <h3 style="margin: 0 0 5px 0; color: #0F172A; text-align: left;">Componentes Monitorados</h3>
                    <p style="margin: 0; font-size: 13px; color: #64748B;">CPU, RAM e disco: preencha Mínimo e Máximo. Swap: preencha Atenção e Crítico. Use valores de 0 a 100%, com até duas casas decimais. Variância é opcional.</p>
                </div>
 
                <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; color: #334155;">
                    <strong style="color: #0F172A;">Entenda os Limites:</strong>
                    <ul style="margin: 8px 0 0 20px; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <li><b>Máximo / Mínimo:</b> Limites de uso para CPU, RAM e disco. Mínimo 0 desativa alertas por baixo uso.</li>
                        <li><b>Variância %:</b> A partir de qual variância de porcentagem o dado será exibido no gráfico (Ex: Se puser 3, variações de 2% são ignoradas).</li>
                        <li><b>Atenção / Crítico:</b> Obrigatórios para swap, com Atenção menor que Crítico. Opcionais nos demais componentes; se preencher um, preencha os dois.</li>
                    </ul>
                </div>
                
                <div id="lista_componentes">
                    ${componentes.map(componente => gerarCaixaComponente(componente.tipo, componente.id)).join("")}
                    ${componentes.length == 0 ? "<p>Nenhum componente disponível para monitoramento.</p>" : ""}
                </div>
                
                <div class="form-actions" style="margin-top: 24px;">
                    <button class="btn" onclick="listarNodes(${clusterSelecionado.id})">Cancelar</button>
                    <button class="btn btn-primary" onclick="salvarNode(${id || null})">Salvar</button>
                </div>
            </div>
        `;

    if (id) {
        chamarAPI("buscarNode", { idNodeServer: id })
            .then(nodeCompleto => {
                let caixas = document.querySelectorAll(".componente-box");

                nodeCompleto.componentes.forEach(comp => {
                    for (let i = 0; i < caixas.length; i++) {
                        let chk = caixas[i].querySelector(".chk-comp");

                        if (chk.value == comp.idComponente) {
                            chk.checked = true;
                            let campoMaximo = caixas[i].querySelector(".cfg-picomax");
                            let campoMinimo = caixas[i].querySelector(".cfg-picomin");
                            if (campoMaximo) campoMaximo.value = comp.picoMax ?? "";
                            if (campoMinimo) campoMinimo.value = comp.picoMin ?? "";
                            caixas[i].querySelector(".cfg-perc").value = comp.percentual ?? "";
                            caixas[i].querySelector(".cfg-atencao").value = comp.limiteAtencao ?? "";
                            caixas[i].querySelector(".cfg-critico").value = comp.limiteCritico ?? "";
                        }
                    }
                });
            })
            .catch(mostrarErro);
    }
}

function salvarNode(id) {
    let arrComponentes = [];
    let caixas = document.querySelectorAll(".componente-box");

    for (let i = 0; i < caixas.length; i++) {
        let chk = caixas[i].querySelector(".chk-comp");

        if (chk.checked) {
            let componente = {
                idComponente: chk.value,
                picoMax: caixas[i].querySelector(".cfg-picomax")?.value || null,
                picoMin: caixas[i].querySelector(".cfg-picomin")?.value || null,
                percentual: caixas[i].querySelector(".cfg-perc").value || null,
                limiteAtencao: caixas[i].querySelector(".cfg-atencao").value || null,
                limiteCritico: caixas[i].querySelector(".cfg-critico").value || null
            };
            let erro = validarLimitesComponente(componente, caixas[i].dataset.tipo);
            if (erro) {
                alert(erro);
                return;
            }
            arrComponentes.push(componente);
        }
    }

    let dados = {
        idClusterServer: clusterSelecionado.id,
        hostnameServer: document.getElementById("ipt_hostname_node").value,
        sistemaOperacionalServer: document.getElementById("ipt_so_node").value,
        ipServer: document.getElementById("ipt_ip_node").value,
        statusServer: document.getElementById("sel_status_node").value,
        componentesServer: arrComponentes
    };

    let rota = id ? "editarNode" : "cadastrarNode";
    if (id) dados.idNodeServer = id;

    chamarAPI(rota, dados)
        .then(() => listarNodes(clusterSelecionado.id))
        .catch(mostrarErro);
}

function deletarNode(id) {
    abrirModal("Deseja mesmo excluir este Node?", () => {
        chamarAPI("deletarNode", { idNodeServer: id })
            .then(() => listarNodes(clusterSelecionado.id))
            .catch(mostrarErro);
    });
}
function abrirModal(mensagem, acaoAoConfirmar) {
    document.getElementById("textoModalConfirmacao").innerText = mensagem;
    document.getElementById("modalConfirmacao").style.display = "flex";

    // Atribui a função de deletar ao botão "Sim"
    document.getElementById("btnConfirmarModal").onclick = function () {
        acaoAoConfirmar();
        fecharModal();
    };
}

function fecharModal() {
    document.getElementById("modalConfirmacao").style.display = "none";
}
document.getElementById('open-sidebar-btn').onclick = function () {

    mobileSidebar.classList.add('active');

    document
        .getElementById('sidebar-overlay')
        .classList.add('active');

};


document.getElementById('close-sidebar-btn').onclick = function () {

    mobileSidebar.classList.remove('active');

    document
        .getElementById('sidebar-overlay')
        .classList.remove('active');

};


document.getElementById('sidebar-overlay').onclick = function () {

    mobileSidebar.classList.remove('active');

    document
        .getElementById('sidebar-overlay')
        .classList.remove('active');

};

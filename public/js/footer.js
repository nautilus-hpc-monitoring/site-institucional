fetch('footer.html')
    .then(resposta => resposta.text())
    .then(codigoHtml => {
        document.getElementById('footer').innerHTML = codigoHtml;
    })
    .catch(erro => console.error('Erro ao carregar o footer:', erro));

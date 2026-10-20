 if (sessionStorage.NOME_USUARIO) {
    document.getElementById("b_usuario").innerHTML = sessionStorage.NOME_USUARIO;
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
 const ctx = document.getElementById('line-chart').getContext('2d');

        const labels = ['07 abr', '', '', '', '05 mai', '', '', '02 jun', '', '', '30 jun', '', '', '28 jul', '', '', '25 ago', '', '15 set'];
        const dataCPU = [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30];
        const dataRAM = [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50];
        const dataDisco = [70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70];

        const myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Média CPU',
                        data: dataCPU,
                        borderColor: '#3b82f6',
                        backgroundColor: '#3b82f6',
                        borderWidth: 2,
                        tension: 0.4,
                    },
                    {
                        label: 'Média RAM',
                        data: dataRAM,
                        borderColor: '#8b5cf6',
                        backgroundColor: '#8b5cf6',
                        borderWidth: 2,
                        tension: 0.4,
                    },
                    {
                        label: 'Média Disco',
                        data: dataDisco,
                        borderColor: '#f97316',
                        backgroundColor: '#f97316',
                        borderWidth: 2,
                        tension: 0.4,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        min: 0,
                        max: 100,
                        ticks: {
                            stepSize: 25,
                            callback: function (value) { return value + '%'; },
                            color: '#9ca3af',
                            font: { size: 12 }
                        },
                        grid: {
                            color: '#f3f4f6',
                            borderDash: [5, 5],
                            drawBorder: false
                        }
                    },
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: '#9ca3af',
                            font: { size: 12 },
                            maxRotation: 0
                        }
                    }
                }
            }
        });
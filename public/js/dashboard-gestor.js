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

        document.addEventListener('DOMContentLoaded', function () {

            if (typeof Chart === 'undefined') {

                console.error(
                    'Chart.js não carregou.'
                );

                document
                    .querySelectorAll('.chart-load-error')
                    .forEach(el => el.style.display = 'flex');

                return;
            }

            criarGraficos();

        });


        /* GRÁFICOS */

        function criarGraficos() {


            /* GRÁFICO 1 */

            const ctxHistorico =
                document.getElementById('chartHistorico');


            new Chart(ctxHistorico, {

                type: 'bar',

                data: {

                    labels: [
                        'Node-037',
                        'Node-114',
                        'Node-021',
                        'Node-089'
                    ],

                    datasets: [

                        {

                            label: 'Incidentes',

                            data: [8, 5, 3, 2],

                            backgroundColor: [
                                '#0E5E75',
                                '#0D9488',
                                '#5B8DEF',
                                '#7C3AED'
                            ],

                            borderRadius: 6,

                            borderSkipped: false,

                            barPercentage: 0.65

                        }

                    ]

                },


                options: {

                    indexAxis: 'y',

                    responsive: true,

                    maintainAspectRatio: false,


                    plugins: {

                        legend: {

                            display: false

                        },


                        tooltip: {

                            callbacks: {

                                label: function (context) {

                                    return `${context.raw} incidentes`;

                                }

                            }

                        }

                    },


                    scales: {

                        x: {

                            beginAtZero: true,

                            ticks: {

                                precision: 0

                            },

                            grid: {

                                color: '#F1F5F9'

                            }

                        },


                        y: {

                            grid: {

                                display: false

                            }

                        }

                    }

                }

            });



            /* GRÁFICO 2 */

            const ctxPrevisao =
                document.getElementById('chartPrevisao');


            new Chart(ctxPrevisao, {

                type: 'bar',

                data: {

                    labels: [

                        'Node-037 • Armazenamento',

                        'Node-114 • CPU',

                        'Node-021 • Memória',

                        'Node-089 • Armazenamento',

                        'Node-052 • CPU'

                    ],

                    datasets: [

                        {

                            label: 'Risco previsto',

                            data: [

                                92,
                                84,
                                77,
                                68,
                                61

                            ],

                            backgroundColor: '#0D9488',

                            borderRadius: 6,

                            borderSkipped: false,

                            barPercentage: 0.65

                        }

                    ]

                },


                options: {

                    indexAxis: 'y',

                    responsive: true,

                    maintainAspectRatio: false,


                    plugins: {

                        legend: {

                            display: false

                        },


                        tooltip: {

                            callbacks: {

                                label: function (context) {

                                    return `${context.raw}% de risco previsto`;

                                }

                            }

                        }

                    },


                    scales: {

                        x: {

                            min: 0,

                            max: 100,

                            ticks: {

                                callback: function (value) {

                                    return value + '%';

                                }

                            },

                            grid: {

                                color: '#F1F5F9'

                            }

                        },


                        y: {

                            grid: {

                                display: false

                            }

                        }

                    }

                }

            });

        }

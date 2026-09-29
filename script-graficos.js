// Espera o DOM estar completamente carregado
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('meuGrafico');
  
  // Identifica se estamos na página de gráficos
  const isChartPage = window.location.pathname.includes('grafico-sentimentos.html') || document.title.includes('Gráfico de Sentimentos'); 

  if (canvas && isChartPage) {
      // Na página dedicada, o gráfico carrega automaticamente
      gerarGrafico(); 
  }
});

const sentimentTypes = ['Felicidade', 'Amor', 'Raiva', 'Tristeza', 'Nostalgia'];

// Função para gerar o gráfico
async function gerarGrafico() {
  const dados = await fetchSentimentCounts();  // Espera a contagem de sentimentos

  // Chama a função para gerar o gráfico com os dados passados
  grafico(sentimentTypes, dados);
}

function grafico(labels, dados) {
  const ctx = document.getElementById('meuGrafico').getContext('2d');
  
  // Destruir qualquer instância anterior de gráfico 
  if (window.myChart instanceof Chart) {
      window.myChart.destroy();
  }

  window.myChart = new Chart(ctx, {
    type: 'bar',  // Tipo de gráfico (barra)
    data: {
      labels: labels,  // Labels dos itens no eixo X
      datasets: [{
        label: 'Contagem de Memórias', 
        data: dados,  // Dados para o gráfico
        backgroundColor: [
            'rgba(255, 198, 10, 0.75)', 
            'rgba(255, 3, 179, 0.67)', 
            'rgba(255, 21, 4, 0.6)', 
            'rgba(0, 132, 255, 0.42)', 
            'rgba(166, 88, 255, 0.61)'
        ],
    
        borderWidth: 1 
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, 
     scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1, 
            font: {
              size: 14,  // Tamanho da fonte no eixo Y
              weight: 'bold',
            },
            color: '#ba74488e' 
          },
          title: {
            display: true,
            text: 'Memórias',
            font: {
              size: 18,
              weight: 'bold',
            },
             color: '#ba744886'
          }
        },
        x: {
          title: {
            display: true,
          }
        }
      },
      plugins: {
        legend: {
          display: false 
        }
      }
    }
  });
}

// Função para buscar a contagem de sentimentos (mantida)
const fetchSentimentCounts = async () => {
  try {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser) return new Array(sentimentTypes.length).fill(0);

    const API_URL = "http://localhost:3000";
    const response = await fetch(`${API_URL}/sentiments/${loggedInUser.id}`);
    
    if (!response.ok) {
        throw new Error(`Erro na API de Sentimentos: ${response.statusText}`);
    }
    
    const data = await response.json();

    const sentimentCountsMap = data.reduce((acc, current) => {
      acc[current.sentiment] = Number(current.count);
      return acc;
    }, {});

    const completeSentimentCounts = sentimentTypes.map(sentiment => {
      return sentimentCountsMap[sentiment] || 0;
    });

    return completeSentimentCounts;

  } catch (error) {
    console.error("Erro ao carregar contagens de sentimentos para o gráfico:", error);
    return new Array(sentimentTypes.length).fill(0);
  }


  
};
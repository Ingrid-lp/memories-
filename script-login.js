const showCustomAlert = (message, type = 'success', duration = 3000) => {
    const container = document.getElementById('custom-alert-container');
    if (!container) {
        // Fallback para o alert() padrão se o container não for encontrado
        console.warn('Container de alerta customizado não encontrado, usando alert() padrão.');
        alert(message);
        return;
    }

    const alertElement = document.createElement('div');
    alertElement.className = `custom-alert ${type}`;
    alertElement.textContent = message;

    container.appendChild(alertElement);

    // Forçar reflow para garantir a transição de entrada
    void alertElement.offsetWidth;
    alertElement.classList.add('show');

    // Remover após a duração especificada
    setTimeout(() => {
        alertElement.classList.remove('show');
        // Esperar o tempo da transição (0.3s definido no CSS) antes de remover o elemento
        alertElement.addEventListener('transitionend', () => {
            alertElement.remove();
        });
    }, duration);
};

// NOVO/REORGANIZADO: Função para alternar a visibilidade da senha
const togglePasswordVisibility = (e) => {
    const button = e.currentTarget;
    const targetId = button.getAttribute('data-target-id');
    const passwordInput = document.getElementById(targetId);
    const icon = button.querySelector('.material-icons');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.textContent = 'visibility'; // Altera o ícone para olho aberto
    } else {
        passwordInput.type = 'password';
        icon.textContent = 'visibility_off'; // Altera o ícone para olho fechado
    }
    // Evita que o clique no botão (que está dentro do form) envie o formulário
    e.preventDefault();
};


document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    const registerScreen = document.getElementById('register-screen');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');

    document.body.style.backgroundImage = "url('img/loginimage.png')";
    const API_URL = 'http://localhost:3000';

    // ESSENCIAL: Adiciona o event listener a todos os botões de alternância de senha
    // O seletor '.toggle-password' agora encontra os botões adicionados ao HTML.
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', togglePasswordVisibility);
    });

    loginForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        const email = e.target['login-email'].value;
        // ATUALIZADO: Obtém o valor do input de senha pelo ID
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('loggedInUser', JSON.stringify(data.user));
                window.location.href = 'app.html';
            } else {
                showCustomAlert(data.message, 'warning');
            }
        } catch (error) {
            showCustomAlert('Erro ao tentar fazer login. Servidor indisponível.', 'error');
            console.error('Login error:', error);
        }
    });

    registerForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        const name = e.target['register-name'].value;
        const email = e.target['register-email'].value;
        // ATUALIZADO: Obtém o valor do input de senha pelo ID
        const password = document.getElementById('register-password').value;

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();
            if (response.ok) {
                showCustomAlert(data.message, 'success');
                showLoginLink.click();
            } else {
                showCustomAlert(data.message, 'warning');
            }
        } catch (error) {
            showCustomAlert('Erro ao tentar criar a conta. Servidor indisponível.', 'error');
            console.error('Registration error:', error);
        }
    });

    // Lógica para mostrar a tela de cadastro e mudar o fundo
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginScreen.style.display = 'none';
        registerScreen.style.display = 'block';
        document.body.style.backgroundImage = "url('img/cadastroimage.png')";
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginScreen.style.display = 'block';
        registerScreen.style.display = 'none';
        document.body.style.backgroundImage = "url('img/loginimage.png')";
    });
});
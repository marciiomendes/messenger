const GLPI_URL = window.location.origin;

let currentUserId = null;
let pollingInterval = null;
let mensagensCache = new Set();
let chatPositions = [];

async function obterCurrentUserId() {
    try {
        const response = await fetch(`${GLPI_URL}/plugins/messenger/ajax/get_user_name.php`);
        const data = await response.json();

        if (data.status === 'success' && data.user_id) {
            currentUserId = data.user_id;
            console.log('UsuÃ¡rio logado:', currentUserId);
        } else {
            console.error('Erro ao obter currentUserId:', data.message);
        }
    } catch (error) {
        console.error('Erro ao obter currentUserId:', error);
    }
}

async function iniciarPollingGlobal() {
    if (window.__pollingInterval__) return; // evitar múltiplas instâncias

    window.__pollingInterval__ = setInterval(async () => {
        try {
            const response = await fetch(`${GLPI_URL}/plugins/messenger/ajax/check_new_messages.php?t=${Date.now()}`, {
                method: 'GET',
                credentials: 'same-origin'
            });

            const data = await response.json();
            console.log('Resposta de check_new_messages:', data); // Log para depuração
            if (data.status === 'success' && Array.isArray(data.novas_mensagens)) {
                for (const msg of data.novas_mensagens) {
                    if (!mensagensCache.has(msg.id)) {
                        console.log(`Nova mensagem ID ${msg.id} adicionada ao cache`); // Log para rastrear cache
                        mensagensCache.add(msg.id);

                        const chatId = msg.sender_id;
                        const chatPopup = document.getElementById(`chat-popup-${chatId}`);
                        const chatsSalvos = JSON.parse(localStorage.getItem('chatsAbertos')) || [];
                        const chat = chatsSalvos.find(c => c.userId == chatId);
                        const estado = chat?.estado === 'minimized' ? 'minimized' : 'minimized'; // Força minimized

                        // Abrir em estado minimized se não aberto
                        if (!chatPopup) {
                            await startChatPopup(chatId, msg.sender_name, estado, true);
                        }

                        // Agora o DOM está pronto, podemos exibir a mensagem
                        exibirMensagens(chatId, [msg]);

                        const updatedPopup = document.getElementById(`chat-popup-${chatId}`);
                        if (updatedPopup?.classList.contains('minimized')) {
                            exibirAlertaChatMinimizado(chatId);
                        }
                    } else {
                        console.log(`Mensagem ID ${msg.id} já está no cache, ignorando`); // Log para mensagens ignoradas
                    }
                }
            }
        } catch (err) {
            console.error("❌ Erro no polling de mensagens:", err);
        }
    }, 1500);
}

window.sendMessage = async function (userId, messageOverride, skipSanitize = false) {
    const messageInput = document.getElementById(`messageInput-${userId}`);
    const message = messageOverride || messageInput.value.trim();
    if (!message) return;

    const historico = document.getElementById(`historico-${userId}`);
    const timestamp = formatarDataHora(new Date().toISOString());
    historico.innerHTML += `
        <div class="mensagem sent-message">
            <div class="message-content">
                <strong>Você:</strong> ${message}
            </div>
            <div class="timestamp">${timestamp}</div>
        </div>
    `;
    historico.scrollTop = historico.scrollHeight;
    messageInput.value = '';

    try {
        const response = await fetch(`${GLPI_URL}/plugins/messenger/ajax/send_message.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sender_id: currentUserId,
                receiver_id: userId,
                message: message
            }),
            credentials: 'same-origin'
        });
        const data = await response.json();
        if (data.status === 'success') {
            // Forçar verificação imediata de novas mensagens
            console.log('Mensagem enviada com sucesso, forçando verificação de novas mensagens');
            await fetch(`${GLPI_URL}/plugins/messenger/ajax/check_new_messages.php?t=${Date.now()}`, {
                method: 'GET',
                credentials: 'same-origin'
            });
        } else {
            console.error('Erro ao enviar mensagem:', data.message);
        }
    } catch (error) {
        console.error('Erro na requisição de envio:', error);
    }
};

function sanitizeHTML(input) {
    const tempDiv = document.createElement('div');
    tempDiv.textContent = input;
    return tempDiv.innerHTML;
}

function exibirMensagens(userId, mensagens) {
    const historico = document.getElementById(`historico-${userId}`);
    if (!historico) return;

    let unreadCount = 0;
    const chatPopup = document.getElementById(`chat-popup-${userId}`);

    mensagens.forEach(msg => {
        if (document.getElementById(`message-${msg.id}`)) return;

        const isSentByCurrentUser = msg.sender_id === currentUserId;
        const nomeFormatado = formatarNomeUsuario(msg.sender_name, msg.sender_id);
		const senderName = isSentByCurrentUser ? 'Você' : nomeFormatado;
        const messageClass = isSentByCurrentUser ? 'sent-message' : 'received-message';

        historico.innerHTML += `
            <div id="message-${msg.id}" class="mensagem ${messageClass}">
                <div class="message-content">
                    <strong>${senderName}:</strong> ${msg.message}
                </div>
                <div class="timestamp">${formatarDataHora(msg.date)}</div>
            </div>
        `;

        if (!isSentByCurrentUser && chatPopup && chatPopup.classList.contains('minimized')) {
            unreadCount++;
        }
    });

    historico.scrollTop = historico.scrollHeight;
}

function formatarDataHora(dataISO) {
    const date = new Date(dataISO);
    return date.toLocaleString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function adicionarEventoEnter(userId) {
    const inputField = document.getElementById(`messageInput-${userId}`);
    if (!inputField) return;

    inputField.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendMessage(userId);
        }
    });
}

function atualizarPosicoesChats() {
    const chats = document.querySelectorAll('.chat-popup');
    const totalChats = chats.length;

    chatPositions = [];
    chats.forEach((chat, index) => {
        const rightPosition = 10 + (index * 310);
        chat.style.right = `${rightPosition}px`;
        chat.style.left = 'auto';
        chatPositions.push(rightPosition);
    });
}

function formatarNomeUsuario(nome) {
    if (!nome) return "Usuário";

    const cacheKey = `nome_formatado_${nome}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;

    const formatado = nome
        .replace(/\./g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .split(' ')
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');

    localStorage.setItem(cacheKey, formatado);
    return formatado;
}

function getNomeFormatadoDoCache(userId) {
    const cache = JSON.parse(localStorage.getItem('chatUserNames') || '{}');
    const entry = cache[userId];
    if (!entry) return null;

    const expirado = Date.now() - entry.timestamp > 86400000; // 24 horas
    return expirado ? null : entry.nome;
}

window.startChatPopup = async function (userId, userName = null, state = 'expanded', forceOpen = false) {
    const existingChat = document.getElementById(`chat-popup-${userId}`);
    if (existingChat) return;

    const chatsSalvos = JSON.parse(localStorage.getItem('chatsAbertos')) || [];
    const chatSalvo = chatsSalvos.find(c => c.userId == userId);
    const estadoAnterior = chatSalvo?.estado;

    if (estadoAnterior === 'closed' && !forceOpen) {
        console.log(`🔕 Chat com ${userId} está fechado manualmente. Ignorando reabertura.`);
        return;
    }

    if (!userName) {
        try {
            const res = await fetch(`${GLPI_URL}/plugins/messenger/ajax/get_user_name.php?user_id=${userId}`);
            const data = await res.json();
            if (data.status === 'success') {
                userName = data.name;
            } else {
                console.error('❌ Erro ao obter nome do usuário:', data.message);
                return;
            }
        } catch (err) {
            console.error('❌ Erro na requisição do nome do usuário:', err);
            return;
        }
    }

    const rightPosition = chatPositions.length * 310;
    chatPositions.push(rightPosition);

    const chatPopup = document.createElement('div');
    chatPopup.id = `chat-popup-${userId}`;
    chatPopup.className = `chat-popup ${state}`;
    chatPopup.style.right = `${rightPosition}px`;

    chatPopup.innerHTML = `
        <div class="chat-header">
            <span class="chat-title">${formatarNomeUsuario(userName)}</span>
            <div class="chat-buttons">
                <button class="toggle-chat" onclick="alternarEstadoChat(${userId})" title="Minimizar/Restaurar">&#8212;</button>
                <button class="close-chat" onclick="fecharChat(${userId})" title="Fechar">X</button>
            </div>
        </div>
        <div id="historico-${userId}" class="chat-historico"></div>
        <div class="chat-footer">
            <textarea id="messageInput-${userId}" placeholder="Digite sua mensagem"></textarea>
            <input type="file" id="fileInput-${userId}" accept=".jpg,.jpeg,.png,.gif,.pdf,.docx,.xlsx,.txt" style="display: none;" />
            <button class="send-button" onclick="sendMessage(${userId})">Enviar</button>
            <button class="send-button" onclick="document.getElementById('fileInput-${userId}').click()">📎</button>
        </div>
    `;

    document.body.appendChild(chatPopup);

    // Auto ajuste de altura do textarea
    const textarea = chatPopup.querySelector(`#messageInput-${userId}`);
    if (textarea) {
        textarea.addEventListener('input', function () {
            this.style.height = '40px';
            this.style.height = this.scrollHeight + 'px';
        });
    }

    await obterMensagens(userId);
    adicionarEventoEnter(userId);
    atualizarPosicoesChats();
    salvarEstadoChats();
};

function obterMensagens(userId) {
    fetch(`${GLPI_URL}/plugins/messenger/ajax/get_messages.php?user_id=${userId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro na resposta do servidor');
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success' && data.mensagens) {
                exibirMensagens(userId, data.mensagens);
            } else {
                console.warn('Nenhuma mensagem encontrada ou erro ao obter mensagens:', data.message);
            }
        })
        .catch(error => console.error('Erro ao obter mensagens:', error));
}

window.sendMessage = async function (userId, messageOverride, skipSanitize = false) {
    const messageInput = document.getElementById(`messageInput-${userId}`);
    const message = messageOverride || messageInput.value.trim();
	if (!message) return;


    if (message === '') {
        console.warn('Mensagem vazia. Nada serÃ¡ enviada.');
        return;
    }

    const historico = document.getElementById(`historico-${userId}`);
    const timestamp = formatarDataHora(new Date().toISOString());
    historico.innerHTML += `
        <div class="mensagem sent-message">
            <div class="message-content">
                <strong>Você:</strong> ${message}
            </div>
            <div class="timestamp">${timestamp}</div>
        </div>
    `;
    historico.scrollTop = historico.scrollHeight;
    messageInput.value = '';

    fetch(`${GLPI_URL}/plugins/messenger/ajax/send_message.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sender_id: currentUserId,
            receiver_id: userId,
            message: message
        }),
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            if (data.status !== 'success') {
                console.error('Erro ao enviar mensagem:', data.message);
            }
        })
        .catch(error => console.error('Erro na requisição de envio:', error));
};

document.addEventListener('change', function (event) {
    if (!event.target.matches('input[type="file"]')) return;

    const input = event.target;
    const userId = input.id.split('-')[1];
    const file = input.files[0];

    if (!file || file.size > 10 * 1024 * 1024) {
        alert("Arquivo muito grande. Máx: 10MB");
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    fetch(`${GLPI_URL}/plugins/messenger/ajax/upload_attachment.php`, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            const link = `${GLPI_URL}/plugins/messenger/download.php?f=${encodeURIComponent(data.filename)}`;
            const msg = `<a href="${link}" target="_blank">📎 ${file.name}</a>`;

            sendMessage(userId, msg, true);
        } else {
            alert("Erro ao enviar o arquivo: " + data.message);
        }
    })
    .catch(err => {
        console.error("Erro no upload:", err);
        alert("Erro no upload.");
    });
});

async function processarNovaMensagem(msg) {
    const userId = msg.sender_id;

    console.log(`📩 Nova mensagem recebida de ${msg.sender_name} (ID: ${userId})`);

    let chatPopup = document.getElementById(`chat-popup-${userId}`);
    if (!chatPopup) {
        await startChatPopup(userId, msg.sender_name, 'minimized', true);
    }

    exibirMensagens(userId, [msg]);

    chatPopup = document.getElementById(`chat-popup-${userId}`);
    if (chatPopup && chatPopup.classList.contains('minimized')) {
        exibirAlertaChatMinimizado(userId);
    }
}

async function marcarMensagensComoLidas(senderId) {
    try {
        const response = await fetch(`${GLPI_URL}/plugins/messenger/ajax/mark_messages_read.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                user_id: senderId,
                _glpi_uid: currentUserId // garante autenticação mesmo sem sessão
            })
        });

        const result = await response.json();
        if (result.status === 'success') {
            console.log(`📩 Mensagens de ${senderId} marcadas como lidas.`);
        } else {
            console.warn(`⚠️ Falha ao marcar mensagens como lidas: ${result.message}`);
        }
    } catch (error) {
        console.error('❌ Erro na requisição para marcar mensagens como lidas:', error);
    }
}

function alternarEstadoChat(userId) {
    const chatPopup = document.getElementById(`chat-popup-${userId}`);
    if (!chatPopup) return;

    const titleEl = chatPopup.querySelector('.chat-title');
    const isMinimized = chatPopup.classList.contains('minimized');

    if (isMinimized) {
        // Expandindo o chat: remover sino, marcar mensagens como lidas
        chatPopup.classList.remove('minimized');
        chatPopup.classList.remove('has-new-message');
        if (titleEl) titleEl.querySelector('.sino-alerta')?.remove();
        marcarMensagensComoLidas(userId); // Marcar mensagens como lidas
    } else {
        // Minimizando o chat
        chatPopup.classList.add('minimized');
    }

    salvarEstadoChats();
}

function salvarEstadoChats() {
    const chatsAbertos = [];
    document.querySelectorAll('.chat-popup').forEach(chat => {
        const userId = chat.id.split('-')[2];
        const estado = chat.classList.contains('minimized') ? 'minimized' : 'expanded';
        chatsAbertos.push({ userId, estado });
    });

    const chatsFechados = JSON.parse(localStorage.getItem('chatsAbertos')) || [];
    chatsFechados.forEach(chat => {
        if (!chatsAbertos.find(c => c.userId === chat.userId)) {
            chatsAbertos.push({ userId: chat.userId, estado: 'closed' });
        }
    });

    localStorage.setItem('chatsAbertos', JSON.stringify(chatsAbertos));
}

function minimizarChat(userId) {
    const chatPopup = document.getElementById(`chat-popup-${userId}`);
    const minimizeButton = chatPopup.querySelector('.minimize-chat');

    if (chatPopup) {
        chatPopup.classList.toggle('minimized');
        chatPopup.classList.remove('has-new-message');

        const isMinimized = chatPopup.classList.contains('minimized');
        salvarEstadoChats(userId, chatPopup.querySelector('.chat-title').innerText, isMinimized ? 'minimized' : 'expanded');

        minimizeButton.textContent = isMinimized ? 'â¬œ' : '_';
    }
}

function restaurarChats() {
    const chatsAbertos = JSON.parse(localStorage.getItem('chatsAbertos')) || [];
    chatsAbertos.forEach(chat => {
        if (chat.estado !== 'closed') {
            startChatPopup(chat.userId, null, chat.estado);
        }
    });
}

function fecharChat(userId) {
    const chatPopup = document.getElementById(`chat-popup-${userId}`);
    if (chatPopup) {
        // Remover sino e classe ao fechar o chat
        chatPopup.classList.remove('has-new-message');
        const titleEl = chatPopup.querySelector('.chat-title');
        if (titleEl) titleEl.querySelector('.sino-alerta')?.remove();
        
        chatPopup.remove();
        let chatsAbertos = JSON.parse(localStorage.getItem('chatsAbertos')) || [];
        const chatIndex = chatsAbertos.findIndex(chat => chat.userId == userId);
        if (chatIndex >= 0) {
            chatsAbertos[chatIndex].estado = 'closed';
        } else {
            chatsAbertos.push({ userId, estado: 'closed' });
        }
        localStorage.setItem('chatsAbertos', JSON.stringify(chatsAbertos));
    }
}

function exibirAlertaChatMinimizado(userId) {
    const chatPopup = document.getElementById(`chat-popup-${userId}`);
    if (chatPopup && chatPopup.classList.contains('minimized')) {
        chatPopup.classList.add('has-new-message');
        const title = chatPopup.querySelector('.chat-title');
        if (!title.querySelector('.sino-alerta')) {
            const sino = document.createElement('span');
            sino.classList.add('sino-alerta');
            sino.innerHTML = '🔔';
            title.appendChild(sino);
        }
    }
}

window.adicionarIconeChat = function () {
    fetch('/plugins/messenger/ajax/get_user_list.php')
        .then(response => response.json())
        .then(data => {
            if (data.status !== 'success') return;

            document.querySelectorAll('.actor_entry[data-itemtype="User"], .user-info-card h4.card-title')
				.forEach(userElement => {
					let userId = userElement.dataset.itemsId || userElement.querySelector('a')?.href.match(/(\d+)$/)?.[0];
					if (!userId || userElement.querySelector('.chat-icon')) return;

					const foundUser = data.users.find(user => user.id == userId);
					if (!foundUser) return;
	
					const chatIcon = document.createElement('a');
					chatIcon.href = "#";
					chatIcon.classList.add('chat-icon', 'ms-2');
					chatIcon.title = `Iniciar chat com ${foundUser.name}`;
					chatIcon.innerHTML = '<i class="fas fa-comments"></i>';

					chatIcon.addEventListener('click', event => {
						event.preventDefault();
						startChatPopup(userId, foundUser.name, 'expanded', true);
					});

					userElement.appendChild(chatIcon);
				});

        })
        .catch(error => console.error("❌ Erro ao buscar usuários para o chat:", error));
};

const observer = new MutationObserver(() => {
    console.log("🔄 Detectando mudanças no DOM... Atualizando ícones de chat.");
    adicionarIconeChat();
});
observer.observe(document.body, { childList: true, subtree: true });

function exibirNotificacaoMensagem(senderName, message) {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
        new Notification(`Nova mensagem de ${senderName}`, {
            body: message,
            icon: "/images/chat_icon.png"
        });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification(`Nova mensagem de ${senderName}`, {
                    body: message,
                    icon: "/images/chat_icon.png"
                });
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    obterCurrentUserId().then(() => {
        restaurarChats();
        iniciarPollingGlobal();
		adicionarIconeChat();
    });
});

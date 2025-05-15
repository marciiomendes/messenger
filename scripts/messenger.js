const GLPI_URL = window.location.origin;

let currentUserId = null;
let pollingIntervals = {};
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

function iniciarPolling(userId) {
    if (pollingIntervals[userId]) return;

    pollingIntervals[userId] = setInterval(() => {
        fetch(`${GLPI_URL}/plugins/messenger/ajax/check_new_messages.php?user_id=${userId}`, {
            method: 'GET',
            credentials: 'same-origin'
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success' && data.novas_mensagens.length > 0) {
                    data.novas_mensagens.forEach(msg => {
                        if (!mensagensCache[msg.id]) {
                            mensagensCache[msg.id] = true;
                            exibirMensagens(userId, [msg]);
                        }
                    });
                    marcarMensagemComoLida(userId);
                }
            })
            .catch(error => console.error('Erro ao verificar novas mensagens:', error));
    }, 1500);
}

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
        const senderName = isSentByCurrentUser ? 'Você' : msg.sender_name;
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
    atualizarContadorMensagens(userId, unreadCount);
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

window.startChatPopup = function (userId, userName = null, state = 'expanded') {
    let existingChat = document.getElementById(`chat-popup-${userId}`);

    if (!existingChat) {
        if (!userName) {
            fetch(`${GLPI_URL}/plugins/messenger/ajax/get_user_name.php?user_id=${userId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        window.startChatPopup(userId, data.name, state);
                    } else {
                        console.error('Erro ao obter nome do usuÃ¡rio:', data.message);
                    }
                })
                .catch(error => console.error('Erro ao obter nome do usuÃ¡rio:', error));
            return;
        }

        if (typeof chatPositions === 'undefined') {
            chatPositions = [];
        }
        const rightPosition = chatPositions.length * 310;
        chatPositions.push(rightPosition);

        const chatPopup = document.createElement('div');
        chatPopup.id = `chat-popup-${userId}`;
        chatPopup.className = `chat-popup ${state}`;
        chatPopup.style.right = `${rightPosition}px`;
        chatPopup.innerHTML = `
            <div class="chat-header">
                <span class="chat-title">${userName}</span>
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
        chatPositions.push(rightPosition);
        obterMensagens(userId);
        iniciarPolling(userId);
		adicionarEventoEnter(userId);
    }

    atualizarPosicoesChats();
	salvarEstadoChats();
};

document.addEventListener('input', function (event) {
    if (event.target.matches('textarea')) {
        event.target.style.height = '40px';
        event.target.style.height = event.target.scrollHeight + 'px';
    }
});

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

function alternarEstadoChat(userId) {
    const chatPopup = document.getElementById(`chat-popup-${userId}`);
    if (!chatPopup) return;

    const isMinimized = chatPopup.classList.contains('minimized');
    
    if (isMinimized) {
        chatPopup.classList.remove('minimized');
        chatPopup.querySelector('.toggle-chat').innerHTML = '&#8212;';
        chatPopup.querySelector('.toggle-chat').setAttribute('title', 'Minimizar');
        atualizarContadorMensagens(userId, 0);
        marcarMensagemComoLida(userId);
    } else {
        chatPopup.classList.add('minimized');
        chatPopup.querySelector('.toggle-chat').innerHTML = '&#9633;';
        chatPopup.querySelector('.toggle-chat').setAttribute('title', 'Restaurar');
    }

    salvarEstadoChats(userId, chatPopup.querySelector('.chat-title').innerText, isMinimized ? 'expanded' : 'minimized');
}

// Salva estado dos chats
function salvarEstadoChats() {
    const chatsAbertos = [];
    document.querySelectorAll('.chat-popup').forEach(chat => {
        const userId = chat.id.split('-')[2];
        const estado = chat.classList.contains('minimized') ? 'minimized' : 'expanded';
        const userName = chat.querySelector('.chat-title')?.innerText || 'Usuário';

        chatsAbertos.push({ userId, userName, estado });
    });
    localStorage.setItem('chatsAbertos', JSON.stringify(chatsAbertos));
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
        .catch(error => console.error('Erro na requisiÃ§Ã£o de envio:', error));
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

            sendMessage(userId, msg, true); // true = já formatado
        } else {
            alert("Erro ao enviar o arquivo: " + data.message);
        }
    })
    .catch(err => {
        console.error("Erro no upload:", err);
        alert("Erro no upload.");
    });
});


function processarNovaMensagem(msg) {
    const userId = msg.sender_id; 

    console.log(`📩 Nova mensagem recebida de ${msg.sender_name} (ID: ${userId})`);

    let chatPopup = document.getElementById(`chat-popup-${userId}`);

    if (!chatPopup) {
        console.log(`🆕 Criando chat para ${msg.sender_name}...`);
        startChatPopup(userId, msg.sender_name, 'expanded');
    }

    exibirMensagens(userId, [msg]);

    chatPopup = document.getElementById(`chat-popup-${userId}`);
    if (chatPopup && chatPopup.classList.contains('minimized')) {
        exibirAlertaChatMinimizado(userId);
    }
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

// Fechar chat
function fecharChat(userId) {
    const chatPopup = document.getElementById(`chat-popup-${userId}`);
    if (chatPopup) {
        chatPopup.remove();
        chatPositions.pop();
        salvarEstadoChats();
    }
}

function restaurarChats() {
    const chatsAbertos = JSON.parse(localStorage.getItem('chatsAbertos')) || [];
    chatsAbertos.forEach(chat => {
        if (chat.estado === 'minimized' || chat.estado === 'expanded') {
            startChatPopup(chat.userId, chat.userName || "Usuário", chat.estado);
        }
    });
}

function exibirAlertaChatMinimizado(userId) {
    const chatPopup = document.getElementById(`chat-popup-${userId}`);
    if (chatPopup && chatPopup.classList.contains('minimized')) {
        chatPopup.classList.add('has-new-message');
    }
}

function verificarNovasMensagens() {
    fetch(`${GLPI_URL}/plugins/messenger/ajax/check_new_messages.php`, {
        method: 'GET',
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success' && data.novas_mensagens.length > 0) {
            data.novas_mensagens.forEach(novaMensagem => {
                const userId = novaMensagem.sender_id;

                if (!document.getElementById(`chat-popup-${userId}`)) {
                    startChatPopup(userId, novaMensagem.sender_name, 'minimized');
                }

                exibirMensagens(userId, [novaMensagem]);

                marcarMensagemComoLida(userId);
            });
        }
    })
    .catch(error => console.error('Erro ao verificar novas mensagens:', error));
}

function atualizarTituloComMensagensNaoLidas() {
    const totalNaoLidas = Object.values(pollingIntervals).reduce((acc, value) => acc + value.novasMensagens || 0, 0);
    document.title = totalNaoLidas > 0 ? `(${totalNaoLidas}) GLPI Chat` : 'GLPI Chat';
}

function marcarMensagemComoLida(userId) {
    const chatPopup = document.getElementById(`chat-popup-${userId}`);

    if (!chatPopup || chatPopup.classList.contains('minimized')) {
        console.log(`Chat com ${userId} estÃ¡ minimizado. Mensagens nÃ£o serÃ£o marcadas como lidas.`);
        return;
    }

    if (!currentUserId || !userId) {
        console.error('ParÃ¢metros ausentes ao marcar mensagens como lidas.', {
            receiver_id: currentUserId,
            sender_id: userId
        });
        return;
    }

  }

function atualizarContadorMensagens(userId, unreadCount) {
    const chatHeader = document.querySelector(`#chat-popup-${userId} .chat-title`);
    if (!chatHeader) return;

    let notificationBadge = chatHeader.querySelector('.notification-badge');

    if (!notificationBadge && unreadCount > 0) {
        notificationBadge = document.createElement('span');
        notificationBadge.classList.add('notification-badge');
        chatHeader.appendChild(notificationBadge);
    }

    if (notificationBadge) {
        notificationBadge.textContent = unreadCount;
        notificationBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    obterCurrentUserId().then(() => {
        restaurarChats();
        iniciarPolling();
		setInterval(verificarNovasMensagens, 1500);
    });
});

window.adicionarIconeChat = function () {
    fetch('/plugins/messenger/ajax/get_user_list.php')
        .then(response => response.json())
        .then(data => {
            if (data.status !== 'success') return;

            document.querySelectorAll('.actor_entry[data-itemtype="User"]')
				.forEach(userElement => {
					const itemType = userElement.getAttribute('data-itemtype');
					const userId = userElement.getAttribute('data-items-id');

					if (itemType !== 'User' || !userId || userElement.querySelector('.chat-icon')) return;

                    if (!userId || userElement.querySelector('.chat-icon')) return;

                    const chatIcon = document.createElement('a');
                    chatIcon.href = "#";
                    chatIcon.classList.add('chat-icon', 'ms-2');
                    chatIcon.innerHTML = '<i class="fas fa-comments"></i>';
                    chatIcon.addEventListener('click', event => {
                        event.preventDefault();
                        startChatPopup(userId, data.users.find(u => u.id == userId)?.name || "Usuário");
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
    console.log("🚀 Página carregada! Adicionando ícones de chat...");
    adicionarIconeChat();
});

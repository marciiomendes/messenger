/**
 * Messenger Plugin para GLPI - UI Estilo Telegram com Persistência
 *
 * Este script cria uma janela de chat única que persiste a lista de conversas
 * e o estado do popup. Inclui um sistema de notificação robusto e uma
 * sinalização visual no cabeçalho quando minimizado com novas mensagens.
 *
 * Autor: Márcio Mendes (Lógica Original), Refatorado por IA (Nova UI e Persistência)
 * Versão: 2.6
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- BLOCO 1: CONSTANTES E ESTADO GLOBAL ---

    const GLPI_URL = window.location.origin;
    const CONVERSATIONS_STORAGE_KEY = 'glpi_messenger_conversations';
    const UI_STATE_STORAGE_KEY = 'glpi_messenger_ui_state';
    let currentUserId = null;
    let activeChatUserId = null;
    const mensagensCache = new Set();
    let conversations = new Map();
    const originalDocumentTitle = document.title;


    // --- BLOCO 2: INJEÇÃO DE HTML E CSS ---

    function injetarEstruturaChat() {
        const chatContainerHTML = `
            <div id="telegram-chat-container" class="chat-container closed">
                <div class="chat-header">
                    <h3 id="chat-main-title">Mensagens</h3>
                    <div class="header-buttons">
                        <button id="chat-minimize-btn" title="Minimizar">−</i></button>
                        <button id="chat-maximize-btn" title="Maximizar/Restaurar"><i class="fas fa-expand-alt"></i></button>
                        <button id="chat-close-btn" title="Ocultar"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <div class="chat-body">
                    <div id="conversation-list-view" class="view active">
                        <div id="conversation-list-items"></div>
                    </div>
                    <div id="message-window-view" class="view">
                        <div class="message-header">
                            <button id="back-to-list-btn" title="Voltar"><i class="fas fa-arrow-left"></i></button>
                            <strong id="active-chat-username"></strong>
                        </div>
                        <div id="message-area" class="message-area"></div>
                        <div class="message-input-area">
                             <input type="file" id="telegram-file-input" accept=".jpg,.jpeg,.png,.gif,.pdf,.docx,.xlsx,.txt" style="display: none;" />
                             <button id="attachment-btn" class="attachment-btn" title="Anexar arquivo"><i class="fas fa-paperclip"></i></button>
                            <textarea id="message-input" placeholder="Digite uma mensagem..."></textarea>
                            <button id="send-message-btn" title="Enviar"><i class="fas fa-paper-plane"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const chatCSS = `
            @keyframes header-flash { 50% { background-color: #639cd4; } }
            :root { --tg-primary: #5288c1; --tg-header-height: 48px; --tg-chat-bg: #e5ddd5; --tg-white: #fff; --tg-border: #f0f0f0; --tg-sent-bubble: #dcf8c6; --tg-unread-bg: #f5f7fa; }
            .chat-container { position: fixed; bottom: 0; left: 20px; width: 370px; height: 550px; background-color: var(--tg-white); border-radius: 10px 10px 0 0; box-shadow: 0 5px 20px rgba(0,0,0,0.2); display: flex; flex-direction: column; transition: all 0.3s ease; overflow: hidden; z-index: 9998; }
            .chat-container.maximized { width: 90vw; height: 90vh; left: 5vw; bottom: 0; }
            .chat-container.closed { transform: translateY(110%); box-shadow: none; }
            .chat-container.minimized { height: var(--tg-header-height); }
            .chat-container.minimized .chat-body { display: none; }
            .chat-header { background-color: var(--tg-primary); color: var(--tg-white); padding: 12px 15px; display: flex; justify-content: space-between; align-items: center; cursor: grab; height: var(--tg-header-height); flex-shrink: 0; }
            .chat-header.has-new-message { animation: header-flash 1.5s infinite ease-in-out; }
            .chat-header h3 { margin: 0; font-size: 16px; flex-grow: 1; }
            .header-buttons button { background: none; border: none; color: white; font-size: 16px; cursor: pointer; margin-left: 10px; padding: 5px; line-height: 1; }
            #chat-minimize-btn { font-weight: bold; font-size: 20px; }
            .chat-body { flex-grow: 1; position: relative; overflow: hidden; }
            .view { position: absolute; width: 100%; height: 100%; transition: transform 0.3s ease-in-out; background-color: var(--tg-white); display: flex; flex-direction: column; }
            .view:not(.active) { transform: translateX(-100%); }
            #message-window-view { transform: translateX(100%); }
            #message-window-view.active { transform: translateX(0); }
            #conversation-list-items { overflow-y: auto; flex-grow: 1; }
            .conversation-item { display: flex; align-items: center; padding: 12px 15px; cursor: pointer; border-bottom: 1px solid var(--tg-border); position: relative; }
            .conversation-item:hover { background-color: #f0f0f0; }
            .conversation-item.unread { background-color: var(--tg-unread-bg); }
            .conversation-item.unread .username, .conversation-item.unread .last-message { font-weight: bold; color: #333; }
            .conversation-details { flex: 1; min-width: 0; }
            .conversation-header { display: flex; justify-content: space-between; }
            .conversation-header .username { font-size: 15px; }
            .conversation-header span { font-size: 12px; color: #888; }
            .last-message { margin: 4px 0 0; font-size: 14px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .unread-badge { background-color: var(--tg-primary); color: white; border-radius: 12px; padding: 2px 8px; font-size: 11px; position: absolute; right: 15px; top: 50%; transform: translateY(-50%); display: flex; align-items: center; justify-content: center; }
            .message-header { display: flex; align-items: center; padding: 12px 15px; border-bottom: 1px solid var(--tg-border); background: #f9f9f9; }
            .message-header button { background: none; border: none; font-size: 18px; margin-right: 15px; cursor: pointer; color: #555; }
            #active-chat-username { font-size: 16px; font-weight: bold; }
            .message-area { flex-grow: 1; padding: 15px; overflow-y: auto; background-color: var(--tg-chat-bg); display: flex; flex-direction: column; }
            .message { padding: 8px 12px; border-radius: 18px; max-width: 75%; margin-bottom: 10px; line-height: 1.4; word-wrap: break-word; }
            .message strong { display: block; margin-bottom: 4px; color: var(--tg-primary); font-size: 13px; }
            .message .timestamp { font-size: 11px; color: #999; text-align: right; margin-top: 5px; }
            .message.sent { background-color: var(--tg-sent-bubble); align-self: flex-end; }
            .message.received { background-color: var(--tg-white); align-self: flex-start; }
            .message-input-area { display: flex; padding: 10px; border-top: 1px solid var(--tg-border); align-items: flex-end; }
            #message-input { flex-grow: 1; border: 1px solid #ccc; border-radius: 20px; padding: 10px 15px; outline: none; resize: none; max-height: 100px; font-size: 14px; }
            .message-input-area button { background: var(--tg-primary); border: none; color: white; border-radius: 50%; width: 40px; height: 40px; margin-left: 10px; cursor: pointer; font-size: 16px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
            .attachment-btn { background-color: transparent !important; color: #555 !important; }
        `;

        document.head.insertAdjacentHTML('beforeend', `<style>${chatCSS}</style>`);
        document.body.insertAdjacentHTML('beforeend', chatContainerHTML);
        if (!document.querySelector('link[href*="font-awesome"]')) {
             const fa = document.createElement('link'); fa.rel = 'stylesheet'; fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css'; document.head.appendChild(fa);
        }
    }


    // --- BLOCO 3: GERENCIAMENTO DE ESTADO (PERSISTÊNCIA) ---
    function saveConversationsToStorage() {
        localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(Array.from(conversations.entries())));
    }

    function loadConversationsFromStorage() {
        const storedConversations = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
        if (storedConversations) {
            try {
                conversations = new Map(JSON.parse(storedConversations));
            } catch (e) {
                console.error("Erro ao carregar conversas do localStorage:", e);
                conversations = new Map();
            }
        }
    }


    // --- BLOCO 4: FUNÇÕES DE API ---
    async function fetchAPI(endpoint, options = {}) {
        try {
            const response = await fetch(`${GLPI_URL}/plugins/messenger/ajax/${endpoint}`, { credentials: 'same-origin', ...options });
            if (!response.ok) throw new Error(`Erro na resposta da rede: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`❌ Erro na API (${endpoint}):`, error);
            return { status: 'error', message: error.message };
        }
    }

    const api = {
        getCurrentUserId: () => fetchAPI('get_user_name.php'),
        getUserName: (userId) => fetchAPI(`get_user_name.php?user_id=${userId}`),
        getMessages: (userId) => fetchAPI(`get_messages.php?user_id=${userId}`),
        checkNewMessages: () => fetchAPI(`check_new_messages.php?t=${Date.now()}`),
        markMessagesAsRead: (senderId) => fetchAPI('mark_messages_read.php', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: senderId, _glpi_uid: currentUserId })
        }),
        sendMessage: (receiverId, message) => fetchAPI('send_message.php', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender_id: currentUserId, receiver_id: receiverId, message: message })
        }),
        uploadFile: (formData) => fetchAPI('upload_attachment.php', { method: 'POST', body: formData })
    };


    // --- BLOCO 5: MANIPULAÇÃO DA UI ---
    
    function renderConversationList() {
        const listContainer = document.getElementById('conversation-list-items');
        if (!listContainer) return;
        listContainer.innerHTML = '';

        const sortedConversations = Array.from(conversations.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        sortedConversations.forEach(convo => {
            const item = document.createElement('div');
            item.className = 'conversation-item';
            item.dataset.userId = convo.userId;
            const unreadCount = convo.unreadCount || 0;
            if (unreadCount > 0) {
                item.classList.add('unread');
            }

            item.innerHTML = `
                <div class="conversation-details">
                    <div class="conversation-header">
                        <strong class="username">${formatarNomeUsuario(convo.userName)}</strong>
                        <span class="timestamp">${formatarDataHora(convo.timestamp)}</span>
                    </div>
                    <p class="last-message">${convo.lastMessage}</p>
                </div>
                <span class="unread-badge" style="display: ${unreadCount > 0 ? 'flex' : 'none'};">${unreadCount}</span>`;
            
            item.addEventListener('click', () => openConversation(convo.userId, convo.userName));
            listContainer.appendChild(item);
        });
    }

    function renderMessages(messages, messageArea) {
        messages.forEach(msg => {
            if (document.getElementById(`message-${msg.id}`)) return;
            const isSent = msg.sender_id == currentUserId;
            const senderName = isSent ? 'Você' : formatarNomeUsuario(msg.sender_name);
            const msgEl = document.createElement('div');
            msgEl.id = `message-${msg.id}`;
            msgEl.className = `message ${isSent ? 'sent' : 'received'}`;
            msgEl.innerHTML = `<strong>${senderName}</strong> ${msg.message} <div class="timestamp">${formatarDataHora(msg.date, true)}</div>`;
            messageArea.appendChild(msgEl);
        });
        messageArea.scrollTop = messageArea.scrollHeight;
    }

    async function updateAndRenderConversations(msg) {
        const userId = msg.sender_id == currentUserId ? msg.receiver_id : msg.sender_id;
        if (!userId) return;

        let convo = conversations.get(String(userId)) || { userId: String(userId), unreadCount: 0 };

        convo.userName = msg.sender_id == currentUserId ? (await api.getUserName(msg.receiver_id)).name || convo.userName : msg.sender_name;
        convo.lastMessage = msg.message;
        convo.timestamp = msg.date;

        if (msg.sender_id != currentUserId && (String(userId) !== activeChatUserId || document.hidden)) {
            convo.unreadCount = (convo.unreadCount || 0) + 1;
        }

        conversations.set(String(userId), convo);
        saveConversationsToStorage();
        renderConversationList();
        updateNotifications();
    }

    async function openConversation(userId, userName) {
        activeChatUserId = String(userId);
        const container = document.getElementById('telegram-chat-container');
        
        container.classList.remove('closed', 'minimized');
        container.querySelector('.chat-header').classList.remove('has-new-message');
        localStorage.setItem(UI_STATE_STORAGE_KEY, 'open');

        document.getElementById('active-chat-username').textContent = formatarNomeUsuario(userName);

        const messageArea = document.getElementById('message-area');
        messageArea.innerHTML = '';
        document.getElementById('conversation-list-view').classList.remove('active');
        document.getElementById('message-window-view').classList.add('active');

        const convo = conversations.get(activeChatUserId);
        if (convo) {
            convo.unreadCount = 0;
            conversations.set(activeChatUserId, convo);
            saveConversationsToStorage();
            renderConversationList();
            updateNotifications();
        }

        const data = await api.getMessages(userId);
        if (data.status === 'success' && data.mensagens) { renderMessages(data.mensagens, messageArea); }
        api.markMessagesAsRead(userId);
    }
    
    function showConversationList() {
        activeChatUserId = null;
        document.getElementById('message-window-view').classList.remove('active');
        document.getElementById('conversation-list-view').classList.add('active');
    }

    async function handleSendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        if (!message || !activeChatUserId) return;

        input.value = '';
        input.style.height = 'auto';

        const sentMessage = {
            id: `temp_${Date.now()}`,
            sender_id: currentUserId,
            sender_name: "Você",
            receiver_id: activeChatUserId,
            message: message,
            date: new Date().toISOString()
        };

        renderMessages([sentMessage], document.getElementById('message-area'));
        await updateAndRenderConversations(sentMessage);
        await api.sendMessage(activeChatUserId, message);
    }

    async function handleFileUpload(file) {
        if (!file || !activeChatUserId) return;
        if (file.size > 10 * 1024 * 1024) {
            alert("Arquivo muito grande. Máximo: 10MB");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        const data = await api.uploadFile(formData);

        if (data.status === 'success' && data.filename) {
            const link = `${GLPI_URL}/plugins/messenger/download.php?f=${encodeURIComponent(data.filename)}`;
            const msgContent = `<a href="${link}" target="_blank">📎 ${file.name}</a>`;
            
            const sentMessage = {
                id: `temp_file_${Date.now()}`,
                sender_id: currentUserId,
                receiver_id: activeChatUserId,
                message: msgContent,
                date: new Date().toISOString()
            };

            renderMessages([sentMessage], document.getElementById('message-area'));
            await updateAndRenderConversations(sentMessage);
            await api.sendMessage(activeChatUserId, msgContent);
        } else {
            alert("Erro ao enviar o arquivo: " + data.message);
        }
    }


    // --- BLOCO 6: POLLING E NOTIFICAÇÕES ---

    function updateNotifications() {
        const container = document.getElementById('telegram-chat-container');
        const header = container.querySelector('.chat-header');
        const mainTitle = document.getElementById('chat-main-title');

        const unreadConversations = Array.from(conversations.values()).filter(c => c.unreadCount > 0);
        const totalUnreadCount = unreadConversations.length;
        
        if (totalUnreadCount > 0) {
            mainTitle.textContent = `Mensagens (${totalUnreadCount})`;
            if (document.hidden) {
                document.title = `(${totalUnreadCount}) Nova Mensagem - ${originalDocumentTitle}`;
            }
            if (container.classList.contains('minimized')) {
                header.classList.add('has-new-message');
            }
        } else {
            mainTitle.textContent = 'Mensagens';
            document.title = originalDocumentTitle;
            header.classList.remove('has-new-message');
        }
    }

    function iniciarPolling() {
        if (window.__pollingInterval__) return;
        window.__pollingInterval__ = setInterval(async () => {
            const data = await api.checkNewMessages();
            if (data.status === 'success' && Array.isArray(data.novas_mensagens)) {
                for (const msg of data.novas_mensagens) {
                    if (mensagensCache.has(msg.id)) continue;
                    mensagensCache.add(msg.id);

                    if (String(msg.sender_id) === activeChatUserId && !document.hidden) {
                        renderMessages([msg], document.getElementById('message-area'));
                        api.markMessagesAsRead(activeChatUserId);
                    } else {
                        showBrowserNotification(msg.sender_name, msg.message);
                    }
                    await updateAndRenderConversations(msg);
                }
            }
        }, 3000);
    }
    
    function showBrowserNotification(senderName, message) {
        if (!("Notification" in window) || Notification.permission !== "granted") return;
        new Notification(`Nova mensagem de ${formatarNomeUsuario(senderName)}`, {
            body: message.replace(/<[^>]*>?/gm, ''),
            icon: `${GLPI_URL}/plugins/messenger/assets/icon.png`
        });
    }


    // --- BLOCO 7: INTEGRAÇÃO COM GLPI E HELPERS ---
    window.adicionarIconeChat = function () {
        fetch(`${GLPI_URL}/plugins/messenger/ajax/get_user_list.php`)
            .then(res => res.json())
            .then(data => {
                if (data.status !== 'success' || !data.users) return;
                document.querySelectorAll('.actor_entry[data-itemtype="User"]:not(.chat-icon-added), .user-name[data-user-id]:not(.chat-icon-added)')
                    .forEach(userElement => {
                        const userId = userElement.dataset.itemsId || userElement.dataset.userId;
                        if (!userId) return;
                        
                        userElement.classList.add('chat-icon-added');
                        const foundUser = data.users.find(user => user.id == userId);
                        if (!foundUser || foundUser.id == currentUserId) return;

                        const chatIcon = document.createElement('a');
                        chatIcon.href = "#";
                        chatIcon.classList.add('chat-icon', 'ms-2');
                        chatIcon.title = `Iniciar chat com ${foundUser.name}`;
                        chatIcon.innerHTML = '<i class="fas fa-comments" style="color: var(--tg-primary); cursor: pointer;"></i>';

                        chatIcon.addEventListener('click', (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            openConversation(userId, foundUser.name);
                        });
                        userElement.appendChild(chatIcon);
                    });
            }).catch(error => console.error("❌ Erro ao buscar usuários para o chat:", error));
    };

    const observer = new MutationObserver(() => { adicionarIconeChat(); });

    function formatarNomeUsuario(nome) {
        if (!nome) return "Usuário";
        return nome.replace(/\./g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
                   .split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }

    function formatarDataHora(dataISO, full = false) {
        if (!dataISO) return '';
        const date = new Date(dataISO);
        if (isNaN(date)) return '';
        const options = full ? 
            { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' } :
            { hour: '2-digit', minute: '2-digit' };
        return date.toLocaleString('pt-BR', options);
    }


    // --- BLOCO 8: INICIALIZAÇÃO ---

    async function init() {
        injetarEstruturaChat();

        const container = document.getElementById('telegram-chat-container');
        const header = container.querySelector('.chat-header');
        const savedUiState = localStorage.getItem(UI_STATE_STORAGE_KEY);

        if (savedUiState === 'open') { container.classList.remove('closed'); } 
        else if (savedUiState === 'minimized') { container.classList.remove('closed'); container.classList.add('minimized'); }

        const userData = await api.getCurrentUserId();
        if (userData.status !== 'success' || !userData.user_id) { console.log("Messenger: Usuário não logado."); return; }
        currentUserId = String(userData.user_id);

        loadConversationsFromStorage();
        renderConversationList();
        updateNotifications();

        document.getElementById('chat-close-btn').addEventListener('click', () => {
            container.classList.add('closed');
            header.classList.remove('has-new-message');
            localStorage.setItem(UI_STATE_STORAGE_KEY, 'closed');
        });

        document.getElementById('chat-minimize-btn').addEventListener('click', () => {
            container.classList.remove('maximized');
            const isNowMinimized = container.classList.toggle('minimized');
            localStorage.setItem(UI_STATE_STORAGE_KEY, isNowMinimized ? 'minimized' : 'open');
            if (!isNowMinimized) {
                header.classList.remove('has-new-message');
            }
            updateNotifications();
        });

        document.getElementById('chat-maximize-btn').addEventListener('click', () => {
            if (container.classList.contains('minimized')) {
                container.classList.remove('minimized');
                header.classList.remove('has-new-message');
                localStorage.setItem(UI_STATE_STORAGE_KEY, 'open');
            }
            container.classList.toggle('maximized');
            updateNotifications();
        });
        
        document.getElementById('back-to-list-btn').addEventListener('click', showConversationList);
        document.getElementById('send-message-btn').addEventListener('click', handleSendMessage);
        document.getElementById('attachment-btn').addEventListener('click', () => document.getElementById('telegram-file-input').click());
        document.getElementById('telegram-file-input').addEventListener('change', (e) => { handleFileUpload(e.target.files[0]); e.target.value = null; });
        
        const messageInput = document.getElementById('message-input');
        messageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } });
        messageInput.addEventListener('input', function() { this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px'; });

        window.addEventListener('focus', () => {
            if (document.title !== originalDocumentTitle) {
                document.title = originalDocumentTitle;
            }
            if (activeChatUserId) {
                api.markMessagesAsRead(activeChatUserId);
                const convo = conversations.get(activeChatUserId);
                if (convo && convo.unreadCount > 0) {
                    convo.unreadCount = 0;
                    saveConversationsToStorage();
                    renderConversationList();
                    updateNotifications();
                }
            }
        });

        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') { Notification.requestPermission(); }

        iniciarPolling();
        adicionarIconeChat();
        observer.observe(document.body, { childList: true, subtree: true });
    }

    init();
});
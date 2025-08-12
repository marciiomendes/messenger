<?php
// front/chat_layout.php
include('../../../inc/includes.php');
include_once('../inc/messenger.class.php');
global $DB, $CFG_GLPI;

$currentUserId = Session::getLoginUserID();
?>

<!-- Define currentUserId antes de carregar messenger.js -->
<script>
    const currentUserId = <?php echo json_encode($currentUserId); ?>;
</script>

<style>
    /* Estilo base do container do chat */
    #chat-container {
        position: fixed;
        right: 0;
        bottom: 0;
        width: 400px;
        height: 600px;
        background: #f5f5f5;
        border-radius: 10px 0 0 10px;
        box-shadow: -2px 0 10px rgba(0,0,0,0.1);
        display: flex;
        flex-direction: column;
        z-index: 1000;
    }

    /* Barra lateral de contatos */
    #chat-sidebar {
        width: 300px;
        height: 100%;
        background: #fff;
        border-right: 1px solid #ddd;
        display: flex;
        flex-direction: column;
    }

    /* Cabeçalho da barra lateral */
    #chat-sidebar-header {
        padding: 15px;
        border-bottom: 1px solid #ddd;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    /* Lista de conversas */
    #chat-list {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
    }

    /* Item de conversa */
    .chat-item {
        padding: 12px;
        border-bottom: 1px solid #eee;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .chat-item:hover {
        background-color: #f0f0f0;
    }

    .chat-item.active {
        background-color: #e9ecef;
    }

    /* Área principal do chat */
    #chat-main {
        flex: 1;
        display: none;
        flex-direction: column;
    }

    #chat-main.active {
        display: flex;
    }

    /* Cabeçalho do chat */
    #chat-header {
        padding: 15px;
        border-bottom: 1px solid #ddd;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    /* Área de mensagens */
    #chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 15px;
    }

    /* Área de input */
    #chat-footer {
        padding: 15px;
        border-top: 1px solid #ddd;
        display: flex;
        gap: 10px;
    }

    /* Estilo para mensagens */
    .message {
        margin: 8px 0;
        max-width: 80%;
        padding: 10px;
        border-radius: 15px;
    }

    .message.sent {
        background-color: #dcf8c6;
        margin-left: auto;
    }

    .message.received {
        background-color: #fff;
        border: 1px solid #ddd;
    }

    /* Estilo para o campo de input */
    #messageInput {
        flex: 1;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 20px;
        resize: none;
        min-height: 40px;
    }

    #messageInput:focus {
        outline: none;
        border-color: #0084ff;
    }
</style>

<!-- Container principal do chat -->
<div id="chat-container">
    <!-- Barra lateral com lista de conversas -->
    <div id="chat-sidebar">
        <div id="chat-sidebar-header">
            <h3>Conversas</h3>
            <button id="closeChat" onclick="toggleChat()">×</button>
        </div>
        <div id="chat-list"></div>
    </div>

    <!-- Área principal do chat -->
    <div id="chat-main">
        <div id="chat-header">
            <span id="chat-title">Selecione uma conversa</span>
            <button id="backToChats" onclick="showChatList()">←</button>
        </div>
        <div id="chat-messages"></div>
        <div id="chat-footer">
            <textarea id="messageInput" placeholder="Digite sua mensagem" rows="1" oninput="autoResize(this)"></textarea>
            <button onclick="sendMessage()">Enviar</button>
        </div>
    </div>
</div>

<script>
    // Função para enviar mensagem
    function sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        const receiverId = document.getElementById('chat-title').getAttribute('data-user-id');

        if (message && receiverId) {
            fetch('../ajax/send_message.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    receiver_id: receiverId
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    messageInput.value = '';
                    loadMessages(receiverId);
                }
            });
        }
    }

    // Evento para enviar mensagem ao pressionar Enter
    document.getElementById('messageInput').addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    // Função para auto-ajustar a altura do campo de texto
    function autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
    }

    // Função para mostrar/ocultar o chat
    function toggleChat() {
        const container = document.getElementById('chat-container');
        container.classList.toggle('hidden');
    }

    // Função para mostrar a lista de conversas
    function showChatList() {
        const chatMain = document.getElementById('chat-main');
        chatMain.classList.remove('active');
        document.getElementById('chat-title').textContent = 'Selecione uma conversa';
    }

    // Função para carregar a lista de conversas
    function loadChatList() {
        fetch('../ajax/get_user_list.php')
            .then(response => response.json())
            .then(data => {
                const chatList = document.getElementById('chat-list');
                chatList.innerHTML = '';

                data.users.forEach(user => {
                    const chatItem = document.createElement('div');
                    chatItem.className = 'chat-item';
                    chatItem.setAttribute('data-user-id', user.id);
                    chatItem.innerHTML = `
                        <div class="chat-item-content">
                            <strong>${user.name}</strong>
                            <span class="last-message">Carregando...</span>
                        </div>
                    `;
                    chatItem.onclick = () => selectChat(user.id, user.name);
                    chatList.appendChild(chatItem);
                });

                // Carregar a última mensagem de cada conversa
                data.users.forEach(user => {
                    loadLastMessage(user.id, user.name);
                });
            });
    }

    // Função para carregar a última mensagem de uma conversa
    function loadLastMessage(userId, userName) {
        fetch(`../ajax/get_messages.php?user_id=${userId}&limit=1`)
            .then(response => response.json())
            .then(data => {
                const chatItem = document.querySelector(`[data-user-id="${userId}"]`);
                if (chatItem && data.messages.length > 0) {
                    const lastMessage = data.messages[0];
                    const lastMessageElement = chatItem.querySelector('.last-message');
                    lastMessageElement.textContent = lastMessage.message;
                }
            });
    }

    // Função para selecionar uma conversa
    function selectChat(userId, userName) {
        const chatMain = document.getElementById('chat-main');
        chatMain.classList.add('active');
        document.getElementById('chat-title').textContent = userName;
        document.getElementById('chat-title').setAttribute('data-user-id', userId);
        loadMessages(userId);
    }

    // Função para carregar mensagens de uma conversa
    function loadMessages(userId) {
        fetch(`../ajax/get_messages.php?user_id=${userId}`)
            .then(response => response.json())
            .then(data => {
                const messagesContainer = document.getElementById('chat-messages');
                messagesContainer.innerHTML = '';

                data.messages.forEach(message => {
                    const messageElement = document.createElement('div');
                    messageElement.className = `message ${message.sender_id === currentUserId ? 'sent' : 'received'}`;
                    messageElement.textContent = message.message;
                    messagesContainer.appendChild(messageElement);
                });

                // Scroll para a última mensagem
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            });
    }

    // Carregar a lista de conversas quando o documento estiver pronto
    document.addEventListener('DOMContentLoaded', loadChatList);
</script>

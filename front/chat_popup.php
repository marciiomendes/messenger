<?php
// front/chat_popup.php
include('../../../inc/includes.php');
include_once('../inc/messenger.class.php');
global $DB, $CFG_GLPI;

// Verifica se o usuário está logado
//Session::checkRight("config", READ);
$currentUserId = Session::getLoginUserID();
?>

<!-- Define currentUserId antes de carregar messenger.js -->
<script>
    const currentUserId = <?php echo json_encode($currentUserId); ?>;

    // Função para enviar mensagem
    function sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();

        if (message) {
            // Aqui você coloca o código para enviar a mensagem
            console.log('Mensagem enviada: ' + message);
            messageInput.value = ''; // Limpar o campo de entrada
        }
    }

    // Evento para enviar mensagem ao pressionar Enter
    document.getElementById('messageInput').addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {  // Não enviar com Shift + Enter
            event.preventDefault(); // Evita o envio de quebra de linha
            sendMessage();
        }
    });

    // Função para auto-ajustar a altura do campo de texto conforme o conteúdo
    function autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
    }
</script>

<script src="plugins/messenger/scripts/messenger.js"></script>

<div id="chat-popup" class="chat-popup hidden">
    <div id="chat-header">
        Chat com <span id="receiver_name"></span>
    </div>
    <div id="historico"></div>
    <div id="chat-footer">
        <textarea id="messageInput" placeholder="Digite sua mensagem" rows="4" oninput="autoResize(this)"></textarea>
        <button onclick="sendMessage()">Enviar</button>
    </div>
</div>

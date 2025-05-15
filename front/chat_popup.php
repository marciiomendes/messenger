<?php

include('../../../inc/includes.php');
include_once('../inc/messenger.class.php');
global $DB, $CFG_GLPI;

$currentUserId = Session::getLoginUserID();
?>
<script>
    const currentUserId = <?php echo json_encode($currentUserId); ?>;
  
    function sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();

        if (message) {

            console.log('Mensagem enviada: ' + message);
            messageInput.value = '';
        }
    }

    document.getElementById('messageInput').addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

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

<?php
include('../../../inc/includes.php');
include_once('../inc/messenger.class.php');

global $DB, $CFG_GLPI;

if (isset($_FILES['file']) && isset($_POST['sender_id']) && isset($_POST['receiver_id'])) {
    $uploadDir = GLPI_PLUGIN_DOC_DIR . '/messenger/';
    
    // Cria o diretório se não existir
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $fileName = basename($_FILES['file']['name']);
    $filePath = $uploadDir . $fileName;

    if (move_uploaded_file($_FILES['file']['tmp_name'], $filePath)) {
        PluginMessengerMensagens::sendMessage($_POST['sender_id'], $_POST['receiver_id'], "[Arquivo enviado: $fileName]");
        echo json_encode(['status' => 'success', 'file' => $fileName]);
    } else {
        echo json_encode(['status' => 'error']);
    }
} else {
    echo json_encode(['status' => 'error']);
}

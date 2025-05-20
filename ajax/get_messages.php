<?php
include('../../../inc/includes.php');
include_once('../inc/messenger.class.php');

global $DB, $CFG_GLPI;

if (!Session::getLoginUserID()) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Usuário não autenticado']);
    exit;
}

if (empty($_GET['user_id']) || !is_numeric($_GET['user_id'])) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Parâmetro user_id ausente ou inválido']);
    exit;
}

$sender_id = Session::getLoginUserID();
$receiver_id = (int)$_GET['user_id'];

try {
    $messages = PluginMessengerMensagens::getMessages($sender_id, $receiver_id);

    header('Content-Type: application/json');
    echo json_encode(['status' => 'success', 'mensagens' => $messages]);
} catch (Exception $e) {
    error_log('Erro ao buscar mensagens: ' . $e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Erro ao buscar mensagens']);
}

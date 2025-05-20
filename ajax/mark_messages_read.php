<?php
ob_start();
session_start();
include('../../../inc/includes.php');
ob_end_clean();

header('Content-Type: application/json');

try {
    // Log da sessão
    error_log("mark_messages_read.php: Session ID: " . (session_id() ?: 'Nenhuma sessão'));
    error_log("mark_messages_read.php: Cookies: " . json_encode($_COOKIE));

    $rawInput = file_get_contents('php://input');
    error_log("mark_messages_read.php: Raw JSON: " . $rawInput);

    $input = json_decode($rawInput, true);

    if (!isset($input['user_id']) || !is_numeric($input['user_id'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Parâmetro user_id ausente ou inválido']);
        exit;
    }

    $receiver_id = isset($input['_glpi_uid']) && is_numeric($input['_glpi_uid']) ? (int)$input['_glpi_uid'] : null;

    if (!$receiver_id) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Usuário não autenticado']);
        exit;
    }

    $sender_id = (int)$input['user_id'];

    global $DB;

    error_log("mark_messages_read.php: receiver_id = $receiver_id, sender_id = $sender_id");

    $query = "UPDATE glpi_plugin_messenger SET is_read = 1 WHERE receiver_id = ? AND sender_id = ? AND is_read = 0";
    $stmt = $DB->prepare($query);

    if (!$stmt) {
        throw new Exception("Erro ao preparar consulta: " . $DB->error);
    }

    $stmt->bind_param('ii', $receiver_id, $sender_id);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Mensagens marcadas como lidas']);
    } else {
        throw new Exception('Erro ao atualizar mensagens');
    }

    $stmt->close();
} catch (Exception $e) {
    error_log("mark_messages_read.php: ERRO FATAL: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}

exit;

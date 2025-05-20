<?php
include('../../../inc/includes.php');

header('Content-Type: application/json');

// Verifica se o usuário está logado
if (!Session::getLoginUserID()) {
    echo json_encode(['status' => 'error', 'message' => 'Usuário não autenticado']);
    exit;
}

// Obtém os dados enviados via POST
$data = json_decode(file_get_contents('php://input'), true);

if (empty($data['receiver_id']) || empty($data['sender_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Parâmetros ausentes']);
    exit;
}

$receiver_id = (int) $data['receiver_id'];
$sender_id = (int) $data['sender_id'];

global $DB;

// Atualiza as mensagens para marcá-las como lidas
$query = "
    UPDATE glpi_plugin_messenger
    SET is_read = 1
    WHERE receiver_id = ? AND sender_id = ? AND is_read = 0
";
$stmt = $DB->prepare($query);

if ($stmt === false) {
    error_log('Erro ao preparar a consulta SQL: ' . $DB->error());
    echo json_encode(['status' => 'error', 'message' => 'Erro ao preparar a consulta']);
    exit;
}

$stmt->bind_param('ii', $receiver_id, $sender_id);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success', 'message' => 'Mensagens marcadas como lidas']);
} else {
    error_log('Erro ao executar a consulta SQL: ' . $stmt->error);
    echo json_encode(['status' => 'error', 'message' => 'Erro ao executar a consulta']);
}
$stmt->close();

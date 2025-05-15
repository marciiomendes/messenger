<?php
include('../../../inc/includes.php');

if (!Session::getLoginUserID()) {
    echo json_encode(['status' => 'error', 'message' => 'Usuário não autenticado']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$sender_id = $data['sender_id'];
$receiver_id = $data['receiver_id'];
$message = $data['message'];

if (empty($sender_id) || empty($receiver_id) || empty($message)) {
    echo json_encode(['status' => 'error', 'message' => 'Parâmetros ausentes ou inválidos']);
    exit;
}

global $DB;

// Insere a mensagem no banco
$query = "
    INSERT INTO glpi_plugin_messenger (sender_id, receiver_id, message, date, is_read)
    VALUES (?, ?, ?, NOW(), 0)
";
$stmt = $DB->prepare($query);
$stmt->bind_param('iis', $sender_id, $receiver_id, $message);

if ($stmt->execute()) {
    // Retorna os dados completos da mensagem
    echo json_encode([
        'status' => 'success',
        'message' => [
            'id' => $stmt->insert_id,
            'sender_id' => $sender_id,
            'receiver_id' => $receiver_id,
            'message' => $message,
            'date' => date('Y-m-d H:i:s'),
            'sender_name' => getUserName($sender_id) // Função fictícia para obter o nome do remetente
        ]
    ]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Erro ao enviar mensagem']);
}
$stmt->close();

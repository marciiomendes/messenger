<?php
include('../../../inc/includes.php');

if (!Session::getLoginUserID()) {
    echo json_encode(['status' => 'error', 'message' => 'Usuário não autenticado']);
    exit;
}

$receiver_id = Session::getLoginUserID();
global $DB;

$query = "
    SELECT m.id, m.sender_id, m.receiver_id, m.message, m.date, u.name AS sender_name
    FROM glpi_plugin_messenger AS m
    JOIN glpi_users AS u ON m.sender_id = u.id
    WHERE m.receiver_id = ? AND m.is_read = 0
";
$stmt = $DB->prepare($query);
$stmt->bind_param('i', $receiver_id);

if ($stmt->execute()) {
    $result = $stmt->get_result();
    $messages = $result->fetch_all(MYSQLI_ASSOC);

    echo json_encode(['status' => 'success', 'novas_mensagens' => $messages]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Erro ao buscar mensagens']);
}
$stmt->close();

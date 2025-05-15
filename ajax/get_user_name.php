<?php
include('../../../inc/includes.php');
include_once('../inc/messenger.class.php');

global $DB, $CFG_GLPI;

// Verifica se o usuário está logado
if (!Session::getLoginUserID()) {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Usuário não autenticado']);
    exit;
}

if (isset($_GET['user_id'])) {
    $user = new User();
    if ($user->getFromDB((int)$_GET['user_id'])) {
        echo json_encode(['status' => 'success', 'name' => $user->fields['name']]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Usuário não encontrado']);
    }
} else {
    // Retorna o ID do usuário logado
    echo json_encode(['status' => 'success', 'user_id' => Session::getLoginUserID()]);
}

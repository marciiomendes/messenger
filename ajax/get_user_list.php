<?php
include('../../../inc/includes.php');

// ✅ Carrega as configurações do plugin
$config = include('../config.php');

// ✅ Verifica se o usuário está logado
Session::checkLoginUser();

// ✅ Força listagem de usuários para todos os logados, ignorando permissões
if ($config['force_user_list'] || Session::haveRight(User::class, READ)) {
    $users = [];

    $query = "
        SELECT u.id, u.name, ue.email, u.phone, g.name as group_name
        FROM glpi_users u
        LEFT JOIN glpi_groups_users gu ON u.id = gu.users_id
        LEFT JOIN glpi_groups g ON gu.groups_id = g.id
        LEFT JOIN glpi_useremails ue ON u.id = ue.users_id AND ue.is_default = 1
        WHERE u.is_active = 1
        ORDER BY u.name ASC
    ";
    
    $result = $DB->query($query);

    while ($user = $DB->fetchAssoc($result)) {
        $users[] = [
            "id" => $user["id"],
            "name" => $user["name"],
            "email" => $user["email"] ?? "Não informado",
            "phone" => $user["phone"] ?? "Não informado",
            "group" => $user["group_name"] ?? "Sem grupo"
        ];
    }

    echo json_encode(["status" => "success", "users" => $users]);
} else {
    echo json_encode(["status" => "error", "message" => "Acesso negado"]);
}

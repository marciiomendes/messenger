<?php

class PluginMessengerMensagens extends CommonDBTM {

    public static function sendMessage($sender_id, $receiver_id, $message) {
        global $DB;

        $query = "INSERT INTO `glpi_plugin_messenger`
                  (`sender_id`, `receiver_id`, `message`, `date`, `is_read`)
                  VALUES (?, ?, ?, NOW(), 0)";

        $stmt = $DB->prepare($query);
        $stmt->bind_param('iis', $sender_id, $receiver_id, $message);

        if (!$stmt->execute()) {
            error_log('Erro ao enviar mensagem: ' . $stmt->error);
            return false;
        }

        return true;
    }
	
	public static function getMessages($sender_id, $receiver_id) {
		global $DB;

		$query = "
			SELECT 
				m.id, 
				m.sender_id, 
				m.receiver_id, 
				m.message, 
				m.date, 
				m.is_read, 
				u.name AS sender_name
			FROM glpi_plugin_messenger m
			JOIN glpi_users u ON m.sender_id = u.id
			WHERE (m.sender_id = ? AND m.receiver_id = ?)
				OR (m.sender_id = ? AND m.receiver_id = ?)
			ORDER BY m.date ASC
		";

		$stmt = $DB->prepare($query);

		if ($stmt === false) {
			error_log('Erro ao preparar a consulta SQL em getMessages: ' . $DB->error);
			throw new Exception('Erro ao preparar a consulta SQL em getMessages.');
		}

		// Vincula os parâmetros
		$stmt->bind_param('iiii', $sender_id, $receiver_id, $receiver_id, $sender_id);

		// Executa a consulta
		if (!$stmt->execute()) {
			error_log('Erro ao executar a consulta SQL em getMessages: ' . $stmt->error);
			throw new Exception('Erro ao executar a consulta SQL em getMessages.');
		}

		// Obtém os resultados
		$result = $stmt->get_result();

		if ($result === false) {
			error_log('Erro ao obter resultados em getMessages: ' . $stmt->error);
			throw new Exception('Erro ao obter resultados em getMessages.');
		}

		// Converte os resultados para array associativo
		$messages = $result->fetch_all(MYSQLI_ASSOC);

		$stmt->close();
		return $messages;
	}

    public static function countUnreadMessages($receiver_id) {
        global $DB;

        $query = "SELECT COUNT(*) AS total
                  FROM glpi_plugin_messenger
                  WHERE receiver_id = ? AND is_read = 0";

        $stmt = $DB->prepare($query);
        $stmt->bind_param('i', $receiver_id);

        if (!$stmt->execute()) {
            error_log('Erro ao contar mensagens não lidas: ' . $stmt->error);
            throw new Exception('Erro ao contar mensagens não lidas.');
        }

        $result = $stmt->get_result();
        $row = $result->fetch_assoc();

        return $row['total'];
    }

    public static function getUnreadMessages($receiver_id) {
        global $DB;

        $query = "
            SELECT id, sender_id, receiver_id, message, date, is_read
            FROM glpi_plugin_messenger
            WHERE receiver_id = ? AND is_read = 0
        ";

        $stmt = $DB->prepare($query);

        if ($stmt === false) {
            error_log('Erro ao preparar a consulta SQL: ' . $DB->error);
            throw new Exception('Erro ao preparar a consulta SQL.');
        }

        $stmt->bind_param('i', $receiver_id);

        if (!$stmt->execute()) {
            error_log('Erro ao executar a consulta SQL: ' . $stmt->error);
            throw new Exception('Erro ao executar a consulta SQL.');
        }

        $result = $stmt->get_result();
        $messages = $result->fetch_all(MYSQLI_ASSOC);

        return $messages;
    }

    public static function markMessagesAsRead($receiver_id) {
        global $DB;

        $query = "
            UPDATE glpi_plugin_messenger
            SET is_read = 1
            WHERE receiver_id = ? AND is_read = 0
        ";

        $stmt = $DB->prepare($query);

        if ($stmt === false) {
            error_log('Erro ao preparar a query de atualização: ' . $DB->error);
            throw new Exception('Erro ao preparar a query de atualização.');
        }

        $stmt->bind_param('i', $receiver_id);

        if (!$stmt->execute()) {
            error_log('Erro ao executar a query de atualização: ' . $stmt->error);
            throw new Exception('Erro ao executar a query de atualização.');
        }

        return $stmt->affected_rows; // Retorna o número de linhas afetadas
    }
}

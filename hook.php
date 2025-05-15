<?php

function plugin_messenger_install() {
    global $DB;
    
    // Criar a tabela glpi_plugin_messenger
    if (!$DB->tableExists("glpi_plugin_messenger")) {
        $query = "CREATE TABLE IF NOT EXISTS `glpi_plugin_messenger` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `sender_id` INT UNSIGNED NOT NULL,
            `receiver_id` INT UNSIGNED NOT NULL,
            `message` TEXT NOT NULL,
            `date` TIMESTAMP NOT NULL,
			`is_read` TINYINT(1) NOT NULL DEFAULT 0, -- 0 = não lida, 1 = lida
            FOREIGN KEY (`sender_id`) REFERENCES `glpi_users`(`id`) ON DELETE CASCADE,
            FOREIGN KEY (`receiver_id`) REFERENCES `glpi_users`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
        
        if (!$DB->query($query)) {
            return false;
        }
    }

    // Criar a tabela glpi_plugin_messenger_reactions
    if (!$DB->tableExists("glpi_plugin_messenger_reactions")) {
        $query = "CREATE TABLE IF NOT EXISTS `glpi_plugin_messenger_reactions` (
            `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `message_id` INT UNSIGNED NOT NULL,
            `user_id` INT UNSIGNED NOT NULL,
            `reaction` VARCHAR(10) NOT NULL,
            FOREIGN KEY (`message_id`) REFERENCES `glpi_plugin_messenger`(`id`) ON DELETE CASCADE,
            FOREIGN KEY (`user_id`) REFERENCES `glpi_users`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
        
        if (!$DB->query($query)) {
            return false;
        }
    }
    
    return true;
}

function plugin_messenger_uninstall() {
    global $DB;

    $DB->query("DROP TABLE IF EXISTS `glpi_plugin_messenger_reactions`;");
    $DB->query("DROP TABLE IF EXISTS `glpi_plugin_messenger`;");
    
    return true;
}

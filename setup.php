<?php
define('PLUGIN_MESSENGER_VERSION', '2.0.1');

if (!defined('GLPI_ROOT')) {
    define('GLPI_ROOT', rtrim(GLPI_URL, '/'));
}

function plugin_init_messenger() {
    global $PLUGIN_HOOKS;

    $PLUGIN_HOOKS['csrf_compliant']['messenger'] = true;
    $PLUGIN_HOOKS['add_javascript']['messenger'] = 'scripts/messenger.js';
    $PLUGIN_HOOKS['add_css']['messenger'] = 'css/messenger.css';
}

function plugin_version_messenger() {
    return [
        'name'           => 'Messenger',
        'version'        => PLUGIN_MESSENGER_VERSION,
        'author'         => 'R&M❤️',
        'license'        => 'GPLv3',
        'minGlpiVersion' => '10.0'
    ];
}

function plugin_messenger_check_prerequisites() {
    if (version_compare(GLPI_VERSION, '10.0', '<')) {
        echo "Este plugin requer o GLPI versão 10.0 ou superior!";
        return false;
    }
    return true;
}

function plugin_messenger_check_config() {
    return true;
}

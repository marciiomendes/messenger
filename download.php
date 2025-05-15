<?php

define('UPLOAD_DIR', __DIR__ . '/uploads/');

if (!isset($_GET['f'])) {
    http_response_code(400);
    exit('Arquivo não especificado.');
}

$filename = basename($_GET['f']);
$filepath = UPLOAD_DIR . $filename;

if (!file_exists($filepath)) {
    http_response_code(404);
    exit('Arquivo não encontrado.');
}

$mime = mime_content_type($filepath);
header('Content-Type: ' . $mime);
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . filesize($filepath));
readfile($filepath);
exit;

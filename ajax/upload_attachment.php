<?php
// plugins/messenger/ajax/upload_attachment.php

define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10 MB

header('Content-Type: application/json');

// ⚠ Verifica se foi enviado um arquivo
if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Nenhum arquivo enviado']);
    exit;
}

$file = $_FILES['file'];
$allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'docx', 'xlsx', 'txt'];
$allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
];

// ⚠ Valida tamanho
if ($file['size'] > MAX_FILE_SIZE) {
    http_response_code(413);
    echo json_encode(['status' => 'error', 'message' => 'Arquivo excede 10MB']);
    exit;
}

// ⚠ Valida tipo MIME
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mime, $allowedMimeTypes)) {
    http_response_code(415);
    echo json_encode(['status' => 'error', 'message' => 'Tipo de arquivo não permitido']);
    exit;
}

// ⚠ Valida extensão
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, $allowedExtensions)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Extensão de arquivo inválida']);
    exit;
}

// ⚙️ Gera nome seguro
$hashName = sha1_file($file['tmp_name']) . '_' . time() . '.' . $ext;
$destPath = UPLOAD_DIR . $hashName;

if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0775, true);
}

// 🧾 Move o arquivo
if (move_uploaded_file($file['tmp_name'], $destPath)) {
    echo json_encode(['status' => 'success', 'filename' => $hashName]);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Falha ao salvar o arquivo']);
}

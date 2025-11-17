<?php
// sendMail.php - HTTP endpoint
require_once __DIR__ . '/sendMailFunctions.php';

ob_start();
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");

function respond($success, $error = null, $debug = null)
{
    ob_end_clean();
    $response = ["success" => $success, "error" => $error];
    if ($debug)
        $response['debug'] = $debug;
    echo json_encode($response);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
if (!$data)
    respond(false, "Invalid JSON input");

$sent = sendMailCLI($data);
respond($sent, $sent ? null : "Failed to send email");
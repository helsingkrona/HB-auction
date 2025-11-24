<?php
session_start();
header('Content-Type: application/json');

if (!($_SESSION['is_admin'] ?? false)) {
    http_response_code(403);
    echo json_encode(["success" => false, "error" => "Unauthorized"]);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
$auctionId = $data['id'] ?? null;

if (!$auctionId) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "No auction ID provided"]);
    exit;
}

$storage = __DIR__ . '/../storage/auctions.json';
$auctions = json_decode(file_get_contents($storage), true);

$auctions = array_filter($auctions, fn($a) => $a['id'] !== $auctionId);

file_put_contents($storage, json_encode(array_values($auctions), JSON_PRETTY_PRINT));

echo json_encode(["success" => true]);
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
$newEndTime = $data['endTime'] ?? null;

if (!$auctionId || !$newEndTime) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Missing parameters"]);
    exit;
}

$storage = __DIR__ . '/../storage/auctions.json';
$auctions = json_decode(file_get_contents($storage), true);

foreach ($auctions as &$a) {
    if ($a['id'] === $auctionId) {
        $a['endTime'] = $newEndTime;
        break;
    }
}

file_put_contents($storage, json_encode($auctions, JSON_PRETTY_PRINT));

echo json_encode(["success" => true]);
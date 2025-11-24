<?php
session_start();

// Only allow if logged in as admin
if (!($_SESSION['is_admin'] ?? false)) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

header('Content-Type: application/json');

$storage = __DIR__ . '/../storage/auctions.json';
if (!file_exists($storage)) {
    echo json_encode([]);
    exit;
}

$auctions = json_decode(file_get_contents($storage), true);
if ($auctions === null) {
    echo json_encode([]);
    exit;
}

// Return full auctions with bids
echo json_encode($auctions);
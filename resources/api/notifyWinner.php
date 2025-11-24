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
    echo json_encode(["success" => false, "error" => "Missing auction ID"]);
    exit;
}

$storage = __DIR__ . '/../storage/auctions.json';
if (!file_exists($storage)) {
    echo json_encode(["success" => false, "error" => "Auctions storage not found"]);
    exit;
}

$auctions = json_decode(file_get_contents($storage), true);
if ($auctions === null) {
    echo json_encode(["success" => false, "error" => "Failed to read auctions"]);
    exit;
}

// Find auction
$auctionIndex = null;
foreach ($auctions as $i => $a) {
    if ($a['id'] === $auctionId) {
        $auctionIndex = $i;
        break;
    }
}

if ($auctionIndex === null) {
    http_response_code(404);
    echo json_encode(["success" => false, "error" => "Auction not found"]);
    exit;
}

$auction = $auctions[$auctionIndex];
if (empty($auction['bids'])) {
    echo json_encode(["success" => false, "error" => "No bids to notify"]);
    exit;
}

// Find highest bid / winner
$winner = array_reduce($auction['bids'], function ($carry, $bid) {
    return ($carry === null || $bid['amount'] > $carry['amount']) ? $bid : $carry;
});

// Mark auction as notified
$auctions[$auctionIndex]['winnerNotified'] = true;
file_put_contents($storage, json_encode($auctions, JSON_PRETTY_PRINT));

// Load email template functions
require_once __DIR__ . '/../mail/winnerEmailTemplate.php';
require_once __DIR__ . '/../mail/sendMailFunctions.php';

// Prepare email payload
$templateData = [
    "winnerName" => $winner['name'],
    "auctionTitle" => $auction['title'],
    "auctionDescription" => $auction['description'] ?? '',
    "winningBid" => number_format($winner['amount'], 2) . " SEK",
    "auctionEndTime" => isset($auction['endTime']) ? date('Y-m-d H:i', strtotime($auction['endTime'])) : 'N/A'
];

$emailData = [
    "to" => $winner['email'],
    "subject" => "🎉 You won: " . $auction['title'],
    "template" => "winner",
    "templateData" => $templateData
];

// Send email directly via sendMailCLI
$sent = sendMailCLI($emailData);

if ($sent) {
    echo json_encode(["success" => true, "message" => "Winner notified successfully"]);
} else {
    echo json_encode(["success" => false, "error" => "Failed to send email"]);
}
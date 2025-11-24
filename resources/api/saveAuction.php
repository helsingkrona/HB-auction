<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://auctions.helsingkrona.se');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');

session_start();

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$storage = __DIR__ . '/../storage/auctions.json';

// ----- Read auction payload -----
$raw = file_get_contents('php://input');
$incoming = json_decode($raw, true);

if (!$incoming) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
    exit;
}

// Generate ID for new auctions
if (!isset($incoming['id']) || $incoming['id'] === null || $incoming['id'] === "") {
    $incoming['id'] = uniqid("auc_", true);
}

// ----- Detect if this is a bid-only update -----
$isBidOnly = isset($incoming['bids']) && isset($incoming['highestBid']) && count($incoming) <= 2;

// ----- Admin check (only required for non-bid updates) -----
if (!$isBidOnly && !($_SESSION['is_admin'] ?? false)) {
    http_response_code(403);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

// ===== Base64 Image Upload =====
if (!empty($incoming['imageBase64'])) {

    $uploadDir = __DIR__ . '/../images/';
    if (!is_dir($uploadDir))
        mkdir($uploadDir, 0755, true);

    $imageData = $incoming['imageBase64'];

    if (!preg_match('/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/', $imageData, $matches)) {
        echo json_encode(['success' => false, 'error' => 'Invalid base64 image']);
        exit;
    }

    $mime = $matches[1];
    $base64 = $matches[2];
    $imageBinary = base64_decode($base64);

    if ($imageBinary === false) {
        echo json_encode(['success' => false, 'error' => 'Failed to decode base64']);
        exit;
    }

    $ext = explode('/', $mime)[1];
    if ($ext === 'jpeg')
        $ext = 'jpg';

    $uniqueName = date('ymdHis') . '_' . uniqid() . '.' . $ext;
    $filePath = $uploadDir . $uniqueName;

    if (!file_put_contents($filePath, $imageBinary)) {
        echo json_encode(['success' => false, 'error' => 'Failed to save image']);
        exit;
    }

    // Save path for JSON
    $incoming['image'] = 'resources/images/' . $uniqueName;
    unset($incoming['imageBase64']);
}

// ----- Bulk replace support (admin only) -----
if ($incoming['id'] === '__bulk_replace__' && isset($incoming['replaceAll'])) {
    if (!($_SESSION['is_admin'] ?? false)) {
        http_response_code(403);
        echo json_encode(["error" => "Unauthorized"]);
        exit;
    }

    $fp = fopen($storage, 'c+');
    if (!$fp) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Cannot open storage']);
        exit;
    }

    flock($fp, LOCK_EX);
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($incoming['replaceAll'], JSON_PRETTY_PRINT));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    echo json_encode(['success' => true, 'message' => 'Bulk replace successful']);
    exit;
}

// ----- Read current auctions -----
$fp = fopen($storage, 'c+');
if (!$fp) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Cannot open storage']);
    exit;
}

flock($fp, LOCK_EX);
rewind($fp);
$contents = stream_get_contents($fp);
$auctions = $contents ? json_decode($contents, true) : [];
if (!$auctions)
    $auctions = [];

// ----- Find or update auction -----
$index = null;
for ($i = 0; $i < count($auctions); $i++) {
    if ($auctions[$i]['id'] === $incoming['id']) {
        $index = $i;
        break;
    }
}

if ($index === null) {
    // New auction (admin only)
    if (!$isBidOnly) {
        $auctions[] = $incoming;

    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Auction not found']);
        exit;
    }
} else {
    $existing = $auctions[$index];

    if ($isBidOnly) {
        // Only update bids and highestBid
        $existing['bids'] = $incoming['bids'];
        $existing['highestBid'] = $incoming['highestBid'];
    } else {
        // Full update (admin)
        $existing = $incoming;
    }

    $auctions[$index] = $existing;
}

// ----- Write back -----
ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($auctions, JSON_PRETTY_PRINT));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['success' => true]);
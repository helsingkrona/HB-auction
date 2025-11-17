<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$storage = __DIR__ . '/../storage/auctions.json';
$raw = file_get_contents('php://input');
$incoming = json_decode($raw, true);

if (!$incoming || !isset($incoming['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid payload']);
    exit;
}

// Handle bulk replace (for delete operation)
if ($incoming['id'] === '__bulk_replace__' && isset($incoming['replaceAll'])) {
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

// Read current auctions with locking
$fp = fopen($storage, 'c+');
if (!$fp) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Cannot open storage']);
    exit;
}

flock($fp, LOCK_EX);
$contents = stream_get_contents($fp);
$auctions = $contents ? json_decode($contents, true) : [];
if (!$auctions)
    $auctions = [];

// Find existing auction
$index = null;
for ($i = 0; $i < count($auctions); $i++) {
    if ($auctions[$i]['id'] === $incoming['id']) {
        $index = $i;
        break;
    }
}

$notifyOutbid = false;
$outbidInfo = null;

if ($index === null) {
    // New auction — push
    $auctions[] = $incoming;
} else {
    $existing = $auctions[$index];

    // Detect if bids array grew and if there is a previous highest bidder
    $existingBids = isset($existing['bids']) ? $existing['bids'] : [];
    $incomingBids = isset($incoming['bids']) ? $incoming['bids'] : [];

    if (count($incomingBids) > count($existingBids)) {
        // find previous highest (before incoming)
        $prevHighest = null;
        if (count($existingBids) > 0) {
            $prevHighest = array_reduce($existingBids, function ($carry, $b) {
                if ($carry === null || $b['amount'] > $carry['amount'])
                    return $b;
                return $carry;
            });
        }

        // find new highest (from incoming)
        $newHighest = null;
        if (count($incomingBids) > 0) {
            $newHighest = array_reduce($incomingBids, function ($carry, $b) {
                if ($carry === null || $b['amount'] > $carry['amount'])
                    return $b;
                return $carry;
            });
        }

        if ($prevHighest && $newHighest && $newHighest['email'] !== $prevHighest['email'] && $newHighest['amount'] > $prevHighest['amount']) {
            $notifyOutbid = true;
            $outbidInfo = ['prev' => $prevHighest, 'new' => $newHighest, 'auction' => $incoming['title'] ?? ''];
        }
    }

    // replace
    $auctions[$index] = $incoming;
}

// Truncate & write back
ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($auctions, JSON_PRETTY_PRINT));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

// If outbid notification needed, send email (fire-and-forget style)
if ($notifyOutbid && $outbidInfo) {
    // Build email payload
    $to = $outbidInfo['prev']['email'];
    $subject = "You have been outbid on {$outbidInfo['auction']}";
    $message = "Hi {$outbidInfo['prev']['name']},\n\nYour bid has been outbid on the auction: {$outbidInfo['auction']}.\nThe new highest bid is {$outbidInfo['new']['amount']} SEK.\nIf you want to reclaim the lead, visit the auction and place a new bid.\n\n– Auction System";

    // Try HTTP POST to sendMail.php
    $scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $sendEndpoint = $scheme . '://' . $host . '/resources/mail/sendMail.php';

    // Do a non-blocking curl POST
    $ch = curl_init($sendEndpoint);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["to" => $to, "subject" => $subject, "message" => $message]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
    curl_exec($ch);
    curl_close($ch);
}

echo json_encode(['success' => true]);
?>
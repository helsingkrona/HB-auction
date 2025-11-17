<?php
// CLI script
$storage = __DIR__ . '/resources/storage/auctions.json';
$logFile = __DIR__ . '/resources/logs/checkAuctions.log';

require_once __DIR__ . '/resources/mail/sendMailFunctions.php';

function logMsg($msg)
{
    global $logFile;
    $line = "[" . date("Y-m-d H:i:s") . "] $msg\n";
    file_put_contents($logFile, $line, FILE_APPEND);
}

// load auctions, loop, determine winners, call sendMailCLI()
// (same logic as before, now sendMailCLI works in CLI)
logMsg("Cron job started.");

// Load auctions
if (!file_exists($storage)) {
    logMsg("Storage file not found: $storage");
    exit(0);
}

$fp = fopen($storage, 'c+');
if (!$fp) {
    logMsg("Cannot open storage file.");
    exit(0);
}

flock($fp, LOCK_EX);
$contents = stream_get_contents($fp);
$auctions = $contents ? json_decode($contents, true) : [];
if (!$auctions)
    $auctions = [];

logMsg("Loaded " . count($auctions) . " auctions from storage.");

$changed = false;

foreach ($auctions as &$auction) {
    $auctionId = $auction['id'] ?? $auction['auctionId'] ?? '[no id]';

    if (empty($auction['endTime']))
        continue;
    if (strtotime($auction['endTime']) > time())
        continue;
    if (!empty($auction['winnerNotified']) || !empty($auction['sending']))
        continue;
    if (empty($auction['bids']))
        continue;

    // Determine winner
    $winner = array_reduce($auction['bids'], function ($carry, $b) {
        return ($carry === null || $b['amount'] > $carry['amount']) ? $b : $carry;
    });

    if (empty($winner['email']) || empty($winner['name']))
        continue;

    // Mark as sending immediately
    $auction['sending'] = true;
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($auctions, JSON_PRETTY_PRINT));
    fflush($fp);

    $payload = [
        "to" => $winner['email'],
        "subject" => "🎉 Congratulations! You Won: {$auction['title']}",
        "template" => "winner",
        "templateData" => [
            "winnerName" => $winner['name'],
            "auctionTitle" => $auction['title'],
            "auctionDescription" => $auction['description'] ?? '',
            "winningBid" => number_format($winner['amount'], 2) . " SEK",
            "auctionEndTime" => date("Y-m-d H:i:s", strtotime($auction['endTime'])),
        ]
    ];

    $sent = false;
    $attempts = 0;
    while (!$sent && $attempts < 3) { // retry max 3 times
        $attempts++;
        $sent = sendMailCLI($payload);
        if (!$sent)
            sleep(5); // wait before retry
    }

    if ($sent) {
        $auction['winnerNotified'] = true;
        $changed = true;
    }

    unset($auction['sending']);
    // throttle between emails
    sleep(3);
}

// Save updated auctions if changed
if ($changed) {
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($auctions, JSON_PRETTY_PRINT));
    fflush($fp);
    logMsg("Updated storage with winnerNotified flags.");
}

flock($fp, LOCK_UN);
fclose($fp);

logMsg("Cron job completed. Checked " . count($auctions) . " auctions.\n");
echo "CheckAuctions CLI completed.\n";
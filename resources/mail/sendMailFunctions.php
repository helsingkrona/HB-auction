<?php
require_once __DIR__ . '/winnerEmailTemplate.php';

function sendMailCLI(array $data): bool
{
    $logFile = __DIR__ . '/../logs/checkAuctions.log';
    $log = function ($msg) use ($logFile) {
        file_put_contents($logFile, "[" . date("Y-m-d H:i:s") . "] $msg\n", FILE_APPEND);
    };

    $log("sendMailCLI called (API mode)");

    $env = parse_ini_file('/var/www/auctions/.env');

    $apiToken = $env["SMTP_PASS"];
    $from_email = $env["FROM_EMAIL"];
    $from_name = $env["FROM_NAME"];

    $to = $data['to'];
    $subject = $data['subject'];
    $html = $data['template'] === "winner"
        ? getWinnerEmailTemplate(
            $data['templateData']['winnerName'],
            $data['templateData']['auctionTitle'],
            $data['templateData']['auctionDescription'] ?? '',
            $data['templateData']['winningBid'],
            $data['templateData']['auctionEndTime']
        )
        : $data['message'];

    $log("Now Im building the API payload");

    // Build API payload
    $payload = json_encode([
        "from" => ["email" => $from_email, "name" => $from_name],
        "to" => [["email" => $to]],
        "subject" => $subject,
        "text" => strip_tags($html),
        "html" => $html,
        "category" => "CLI Send",
    ]);

    $log("this is before the curl init");

    $ch = curl_init("https://send.api.mailtrap.io/api/send");
    $log($ch);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer $apiToken",
            "Content-Type: application/json"
        ],
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_RETURNTRANSFER => true
    ]);

    $log("this is after the curl init");

    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $log("Mailtrap API response: HTTP $status, body: $response");

    return $status >= 200 && $status < 300;
}
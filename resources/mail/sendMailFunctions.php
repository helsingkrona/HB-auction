<?php
// sendMailFunctions.php - CLI-safe functions
require_once __DIR__ . '/winnerEmailTemplate.php';

function sendMailCLI(array $data): bool
{
    $logFile = __DIR__ . '/../logs/checkAuctions.log';
    $log = function ($msg) use ($logFile) {
        $line = "[" . date("Y-m-d H:i:s") . "] $msg\n";
        file_put_contents($logFile, $line, FILE_APPEND);
    };

    $log("sendMailCLI called");

    try {
        $envFile = __DIR__ . '/../../.env';
        if (!file_exists($envFile)) {
            $log(".env file not found at $envFile");
            return false;
        }

        $env = parse_ini_file($envFile); // reads key=value lines
        $host = $env["SMTP_HOST"] ?? '';
        $port = isset($env["SMTP_PORT"]) ? (int) $env["SMTP_PORT"] : 587; // cast to int!
        $user = $env["SMTP_USER"] ?? '';
        $pass = $env["SMTP_PASS"] ?? '';
        $from_email = $env["FROM_EMAIL"] ?? '';
        $from_name = $env["FROM_NAME"] ?? 'Auction System';

        $log("SMTP settings: host=$host, port=$port, user=$user, from_email=$from_email");

        $to = $data['to'] ?? '';
        $subject = $data['subject'] ?? '';
        $template = $data['template'] ?? null;
        $templateData = $data['templateData'] ?? null;

        if ($template === "winner" && $templateData) {
            $message = getWinnerEmailTemplate(
                $templateData["winnerName"],
                $templateData["auctionTitle"],
                $templateData["auctionDescription"] ?? '',
                $templateData["winningBid"],
                $templateData["auctionEndTime"]
            );
            $isHtml = true;
        } else {
            $message = $data['message'] ?? '';
            $isHtml = $data['isHtml'] ?? false;
        }

        $log("Message prepared. Length: " . strlen($message));

        // SMTP connection
        $log("Opening SMTP connection to $host:$port...");
        $fp = @fsockopen($host, $port, $errno, $errstr, 10);
        if (!$fp) {
            $log("fsockopen failed: $errstr ($errno)");
            return false;
        }
        $log("SMTP connected");

        $greeting = fread($fp, 1024);
        $log("SMTP greeting: $greeting");

        $send = function ($fp, $cmd, $expect = null) use ($log) {
            fwrite($fp, $cmd . "\r\n");
            $res = fread($fp, 1024);
            $log("SMTP CMD: $cmd | RESP: $res");
            if ($expect && !preg_match("/^$expect/", $res)) {
                throw new Exception("SMTP error on command '$cmd': $res");
            }
            return $res;
        };

        $send($fp, "EHLO localhost", "250");
        $send($fp, "AUTH LOGIN", "334");
        $send($fp, base64_encode($user), "334");
        $send($fp, base64_encode($pass), "235");
        $send($fp, "MAIL FROM:<$from_email>", "250");
        $send($fp, "RCPT TO:<$to>", "250");
        $send($fp, "DATA", "354");

        $headers = "From: $from_name <$from_email>\r\n";
        $headers .= "To: $to\r\n";
        $headers .= "Subject: $subject\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= $isHtml
            ? "Content-Type: text/html; charset=UTF-8\r\n\r\n"
            : "Content-Type: text/plain; charset=UTF-8\r\n\r\n";

        fwrite($fp, $headers . $message . "\r\n.\r\n");
        $send($fp, "QUIT");
        fclose($fp);

        $log("Email sent successfully to $to");
        return true;

    } catch (Exception $e) {
        $log("Exception in sendMailCLI: " . $e->getMessage());
        return false;
    }
}
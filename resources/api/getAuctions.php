<?php
header('Content-Type: application/json');
// Allow CORS from your frontend origin in production change '*' to your domain
header('Access-Control-Allow-Origin: *');


$storage = __DIR__ . '/../storage/auctions.json';
if (!file_exists($storage)) {
    file_put_contents($storage, json_encode([]));
}


$data = file_get_contents($storage);
echo $data;
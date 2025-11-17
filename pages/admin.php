<?php
$envFile = __DIR__ . '/../.env';
$envVars = [];

if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0)
            continue; // skip comments
        [$name, $value] = explode('=', $line, 2);
        $envVars[trim($name)] = trim($value);
    }
}

$ADMIN_PASSWORD = $envVars['ADMIN_PASSWORD'] ?? 'admin123'; // fallback
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="ADMIN_PASSWORD" content="<?= htmlspecialchars($ADMIN_PASSWORD) ?>" />
    <title>Admin Panel</title>
    <link rel="stylesheet" href="../resources/css/style.css" />
</head>

<body>
    <div class="container">
        <!-- Login Form -->
        <div id="loginSection">
            <header>
                <h1>Admin Login</h1>
            </header>
            <form id="loginForm" class="admin-form">
                <div class="form-group">
                    <label>Password:</label>
                    <input type="password" id="adminPassword" required />
                </div>
                <button type="submit" class="btn btn-primary">Login</button>
                <a href="index.html" class="btn btn-secondary">Back</a>
            </form>
        </div>

        <!-- Admin Panel -->
        <div id="adminPanel" style="display: none">
            <header>
                <h1>Admin Panel</h1>
                <button onclick="logout()" class="btn btn-secondary">Logout</button>
            </header>

            <div class="admin-section">
                <h2>Add New Auction</h2>
                <form id="auctionForm" class="admin-form">
                    <div class="form-group">
                        <label>Title:</label>
                        <input type="text" id="auctionTitle" required />
                    </div>
                    <div class="form-group">
                        <label>Description:</label>
                        <textarea id="auctionDescription" rows="4" required></textarea>
                    </div>
                    <div class="form-group">
                        <label>Starting Bid (SEK):</label>
                        <input type="number" id="startingBid" step="1.00" value="0.00" required />
                    </div>
                    <div class="form-group">
                        <label>End Time:</label>
                        <input type="datetime-local" id="endTime" required />
                        <small>Set when the auction should automatically end</small>
                    </div>
                    <div class="form-group">
                        <label>Upload Image:</label>
                        <input type="file" id="auctionImage" accept="image/*" required />
                        <small>Image will be stored as base64 data</small>
                    </div>
                    <button type="submit" class="btn btn-primary">Add Auction</button>
                </form>
            </div>

            <div class="admin-section">
                <h2>Manage Auctions</h2>
                <div id="auctionManagement"></div>
            </div>
        </div>
    </div>

    <script src="../resources/scripts/storage.js"></script>
    <script src="../resources/scripts/adminlogin.js"></script>
</body>

</html>
<?php
session_start();
$isLoggedIn = $_SESSION['is_admin'] ?? false;
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel</title>
    <link rel="stylesheet" href="/resources/css/style.css">
</head>

<body>
    <div class="container">

        <?php if (!$isLoggedIn): ?>
            <!-- LOGIN FORM -->
            <div id="loginSection">
                <header>
                    <h1>Admin Login</h1>
                </header>
                <form id="loginForm" class="admin-form">
                    <div class="form-group">
                        <label>Password:</label>
                        <input type="password" id="password" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Login</button>
                    <button type="button" id="backbtn" class="btn btn-danger">Back</button>
                </form>
            </div>
        <?php else: ?>
            <!-- ADMIN PANEL -->
            <div id="adminPanel">
                <header>
                    <h1>Admin Panel</h1>
                    <button onclick="logout()" class="btn btn-secondary">Logout</button>
                </header>

                <div class="admin-section">
                    <h2 style="text-align:center">Add New Auction</h2>
                    <form id="auctionForm" class="admin-form" enctype="multipart/form-data">
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
                            <input type="datetime-local" id="endTime" value="2025-12-08T00:00" required />
                        </div>
                        <div class="form-group">
                            <label>Upload Image:</label>
                            <input type="file" id="auctionImage" name="auctionImage" accept="image/*" required />
                        </div>
                        <button type="submit" class="btn btn-primary">Add Auction</button>
                    </form>
                </div>

                <div class="admin-section">
                    <h2>Manage Auctions</h2>
                    <div id="auctionManagement"></div>
                </div>
            </div>
        <?php endif; ?>

    </div>
    <script src="/resources/scripts/storage.js?v=12"></script>
    <script src="/resources/scripts/adminlogin.js?v=12"></script>
    <script src="/resources/scripts/display.js?v=12"></script>
</body>

</html>
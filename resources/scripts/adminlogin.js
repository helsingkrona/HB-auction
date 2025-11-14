const ADMIN_PASSWORD = "admin123"; // Change this password!
let auctions = [];

document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const password = document.getElementById("adminPassword").value;

  if (password === ADMIN_PASSWORD) {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("adminPanel").style.display = "block";
    loadAuctionsAdmin();
  } else {
    alert("Incorrect password!");
  }
});

function logout() {
  document.getElementById("loginSection").style.display = "block";
  document.getElementById("adminPanel").style.display = "none";
  document.getElementById("loginForm").reset();
}

async function loadAuctionsAdmin() {
  auctions = (await AuctionStorage.getAllAuctions()) || [];
  displayAuctionsAdmin();
}

function displayAuctionsAdmin() {
  const container = document.getElementById("auctionManagement");

  if (auctions.length === 0) {
    container.innerHTML = "<p>No auctions yet.</p>";
    return;
  }

  const now = new Date();

  container.innerHTML = auctions
    .map((auction) => {
      const hasEnded = AuctionStorage.hasEnded(auction);
      const winner = hasEnded ? AuctionStorage.getWinner(auction) : null;
      const endTime = auction.endTime ? new Date(auction.endTime) : null;
      
      return `
        <div class="admin-auction-card ${hasEnded ? 'auction-ended' : ''}">
            <img src="${auction.image}" alt="${auction.title}">
            <div>
                <h3>${auction.title}</h3>
                ${hasEnded ? '<span class="ended-badge">ENDED</span>' : '<span class="active-badge">ACTIVE</span>'}
                <p>${auction.description}</p>
                <p><strong>Highest Bid:</strong> ${auction.highestBid.toLocaleString(
                  "sv-SE",
                  { style: "currency", currency: "SEK" }
                )}</p>
                ${endTime ? `<p><strong>End Time:</strong> ${endTime.toLocaleString('sv-SE')}</p>` : '<p><strong>End Time:</strong> No end time set</p>'}
                ${hasEnded ? `<p><strong>Status:</strong> Ended ${new Date(auction.endTime).toLocaleString('sv-SE')}</p>` : ''}
                <p><strong>Total Bids:</strong> ${auction.bids?.length || 0}</p>
                ${
                  winner
                    ? `
                        <div class="winner-info">
                            <strong>🎉 WINNER:</strong>
                            <p>${winner.name} (${winner.email})</p>
                            <p>Winning Bid: ${winner.amount.toLocaleString('sv-SE', {
                              style: 'currency',
                              currency: 'SEK'
                            })}</p>
                            ${auction.winnerNotified ? '<p class="notified">✓ Winner Notified</p>' : '<p class="not-notified">⚠ Winner Not Notified</p>'}
                        </div>
                    `
                    : ""
                }
                ${
                  auction.bids?.length > 0
                    ? `
                        <div class="bid-list">
                            <strong>Bid History:</strong>
                            ${auction.bids
                              .sort((a, b) => b.amount - a.amount)
                              .map(
                                (bid) => `
                                <div class="bid-item">
                                    ${bid.name} (${bid.email}) - ${bid.amount.toLocaleString(
                                  "sv-SE",
                                  {
                                    style: "currency",
                                    currency: "SEK",
                                  }
                                )}
                                    <small>${new Date(bid.timestamp).toLocaleString('sv-SE')}</small>
                                </div>
                            `
                              )
                              .join("")}
                        </div>
                        `
                    : ""
                }
                <div class="admin-actions">
                    ${!hasEnded && winner === null ? `<button onclick="extendAuction('${auction.id}')" class="btn btn-warning">Extend Time</button>` : ''}
                    ${hasEnded && winner && !auction.winnerNotified ? `<button onclick="notifyWinner('${auction.id}')" class="btn btn-success">Notify Winner</button>` : ''}
                    <button onclick="deleteAuction('${auction.id}')" class="btn btn-danger">Delete</button>
                </div>
            </div>
        </div>
      `;
    })
    .join("");
}

document.getElementById("auctionForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("auctionTitle").value;
  const description = document.getElementById("auctionDescription").value;
  const startingBid = parseFloat(document.getElementById("startingBid").value);
  const endTime = document.getElementById("endTime").value;
  const imageFile = document.getElementById("auctionImage").files[0];

  if (!imageFile) {
    alert("Please select an image!");
    return;
  }

  if (!endTime) {
    alert("Please select an end time for the auction!");
    return;
  }

  const endDate = new Date(endTime);
  if (endDate <= new Date()) {
    alert("End time must be in the future!");
    return;
  }

  // Convert image to base64
  const reader = new FileReader();
  reader.onload = async function (event) {
    const imageData = event.target.result;

    const auction = {
      id: "auction_" + Date.now(),
      title,
      description,
      highestBid: startingBid,
      image: imageData,
      endTime: endDate.toISOString(),
      bids: [],
      createdAt: new Date().toISOString(),
      winnerNotified: false,
    };

    await AuctionStorage.saveAuction(auction);
    await loadAuctionsAdmin();

    document.getElementById("auctionForm").reset();
    alert("Auction added successfully!");
  };

  reader.readAsDataURL(imageFile);
});

async function deleteAuction(auctionId) {
  if (!confirm("Are you sure you want to delete this auction?")) return;

  await AuctionStorage.deleteAuction(auctionId);
  await loadAuctionsAdmin();
  alert("Auction deleted successfully!");
}

async function extendAuction(auctionId) {
  const auction = await AuctionStorage.getAuction(auctionId);
  if (!auction) return;

  const currentEnd = auction.endTime ? new Date(auction.endTime) : new Date();
  const newEndTime = prompt(
    "Enter new end time (YYYY-MM-DD HH:MM):",
    currentEnd.toISOString().slice(0, 16).replace('T', ' ')
  );

  if (!newEndTime) return;

  const newEndDate = new Date(newEndTime);
  if (newEndDate <= new Date()) {
    alert("End time must be in the future!");
    return;
  }

  auction.endTime = newEndDate.toISOString();
  await AuctionStorage.saveAuction(auction);
  await loadAuctionsAdmin();
  alert("Auction end time updated!");
}

async function notifyWinner(auctionId) {
  const auction = await AuctionStorage.getAuction(auctionId);
  if (!auction) return;

  const winner = AuctionStorage.getWinner(auction);
  if (!winner) {
    alert("No winner found for this auction!");
    return;
  }

  if (confirm(`Send notification to ${winner.name} (${winner.email})?`)) {
    await EmailService.sendWinnerNotification(auction, winner);
    auction.winnerNotified = true;
    auction.notificationSentAt = new Date().toISOString();
    await AuctionStorage.saveAuction(auction);
    await loadAuctionsAdmin();
  }
}
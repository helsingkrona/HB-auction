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

  container.innerHTML = auctions
    .map(
      (auction) => `
                <div class="admin-auction-card">
                    <img src="${auction.image}" alt="${auction.title}">
                    <div>
                        <h3>${auction.title}</h3>
                        <p>${auction.description}</p>
                        <p><strong>Highest Bid:</strong> ${auction.highestBid.toLocaleString(
                          "sv-SE",
                          { style: "currency", currency: "SEK" }
                        )}</p>
                        <p><strong>Total Bids:</strong> ${
                          auction.bids?.length || 0
                        }</p>
                        ${
                          auction.bids?.length > 0
                            ? `
                                <div class="bid-list">
                                    <strong>Bid History:</strong>
                                    ${auction.bids
                                      .map(
                                        (bid) => `
                                        <div class="bid-item">
                                            ${bid.name} (${
                                          bid.email
                                        }) - ${bid.amount.toLocaleString(
                                          "sv-SE",
                                          {
                                            style: "currency",
                                            currency: "SEK",
                                          }
                                        )}
                                            <small>${new Date(
                                              bid.timestamp
                                            ).toLocaleString()}</small>
                                        </div>
                                    `
                                      )
                                      .join("")}
                                </div>
                                `
                            : ""
                        }
                        <button onclick="deleteAuction('${
                          auction.id
                        }')" class="btn btn-danger">Delete</button>
                    </div>
                </div>
            `
    )
    .join("");
}

document.getElementById("auctionForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("auctionTitle").value;
  const description = document.getElementById("auctionDescription").value;
  const startingBid = parseFloat(document.getElementById("startingBid").value);
  const imageFile = document.getElementById("auctionImage").files[0];

  if (!imageFile) {
    alert("Please select an image!");
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
      bids: [],
      createdAt: new Date().toISOString(),
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

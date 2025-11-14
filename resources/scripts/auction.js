document.addEventListener("DOMContentLoaded", () => {
  let auctions = [];

  // Load auctions from storage
  async function loadAuctions() {
    const data = await AuctionStorage.getAllAuctions();
    auctions = data || [];
    displayAuctions();
  }

  // Display auctions in the grid
  function displayAuctions() {
    const grid = document.getElementById("auctionList");
    if (auctions.length === 0) {
      grid.innerHTML =
        '<p class="no-auctions">No auctions available at the moment.</p>';
      return;
    }

    grid.innerHTML = ""; // clear existing

    auctions.forEach((auction) => {
      const card = document.createElement("div");
      card.className = "auction-card";
      card.innerHTML = `
            <img src="${auction.image}" alt="${auction.title}">
            <div class="auction-info">
                <h3>${auction.title}</h3>
                <p class="description">${auction.description.substring(
                  0,
                  100
                )}...</p>
                <p class="highest-bid">Highest Bid: ${auction.highestBid.toLocaleString(
                  "sv-SE",
                  { style: "currency", currency: "SEK" }
                )}</p>
                <div class="button-group">
                    <button class="btn btn-primary bid-btn">Place Bid</button>
                </div>
            </div>
        `;
      grid.appendChild(card);

      // Click anywhere on the card to open details
      card.addEventListener("click", (e) => {
        // Prevent opening detail when clicking the Place Bid button
        if (!e.target.classList.contains("bid-btn")) {
          showDetail(auction.id);
        }
      });

      // Only attach event to Place Bid button
      card.querySelector(".bid-btn").addEventListener("click", (e) => {
        e.stopPropagation(); // prevent triggering card click
        showBidModal(auction.id);
      });
    });
  }

  // Show auction detail modal
  function showDetail(auctionId) {
    const auction = auctions.find((a) => a.id === auctionId);
    if (!auction) return;

    const content = document.getElementById("detailContent");
    content.innerHTML = `
            <h2>${auction.title}</h2>
            <img src="${auction.image}" alt="${
      auction.title
    }" class="detail-image">
            <p><strong>Description:</strong> ${auction.description}</p>
            <p><strong>Current Highest Bid:</strong> ${auction.highestBid.toLocaleString(
              "sv-SE",
              { style: "currency", currency: "SEK" }
            )}</p>
            <button class="btn btn-primary place-bid-btn">Place Bid</button>
        `;

    document.querySelector(".place-bid-btn").addEventListener("click", () => {
      showBidModal(auction.id);
      closeDetailModal();
    });

    document.getElementById("detailModal").style.display = "block";
  }

  function closeDetailModal() {
    document.getElementById("detailModal").style.display = "none";
  }

  // Show bid modal
  function showBidModal(auctionId) {
    const auction = auctions.find((a) => a.id === auctionId);
    if (!auction) return;

    document.getElementById("bidAuctionId").value = auctionId;
    document.getElementById("bidAmount").min = auction.highestBid + 0.01;
    document.getElementById("bidAmount").value = (
      auction.highestBid + 1
    ).toFixed(2);
    document.getElementById("bidModal").style.display = "block";
  }

  function closeBidModal() {
    document.getElementById("bidModal").style.display = "none";
    document.getElementById("bidForm").reset();
  }

  // Submit bid form
  document.getElementById("bidForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const auctionId = document.getElementById("bidAuctionId").value;
    const name = document.getElementById("bidderName").value;
    const email = document.getElementById("bidderEmail").value;
    const amount = parseFloat(document.getElementById("bidAmount").value);

    const auction = auctions.find((a) => a.id === auctionId);
    if (!auction) return;

    if (amount <= auction.highestBid) {
      alert("Bid must be higher than current highest bid!");
      return;
    }

    const bid = { name, email, amount, timestamp: new Date().toISOString() };
    auction.highestBid = amount;
    auction.bids = auction.bids || [];
    auction.bids.push(bid);

    await AuctionStorage.saveAuction(auction);
    await loadAuctions();

    alert("Bid placed successfully!");
    closeBidModal();
  });

  // Close buttons
  document.querySelector(".close").addEventListener("click", closeDetailModal);
  document.querySelector(".close-bid").addEventListener("click", closeBidModal);

  // Close modals when clicking outside
  window.onclick = function (event) {
    if (event.target.id === "detailModal") closeDetailModal();
    if (event.target.id === "bidModal") closeBidModal();
  };

  // Initial load
  loadAuctions();
});

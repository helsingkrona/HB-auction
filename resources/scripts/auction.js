document.addEventListener("DOMContentLoaded", () => {
  let auctions = [];
  let countdownIntervals = {};

  // Start email checking service
  EmailService.startPeriodicCheck();

  // Load auctions from storage
  async function loadAuctions() {
  // Load ALL auctions, not just active ones
  const data = await AuctionStorage.getAllAuctions();
  auctions = data || [];

  // Sort: active first, ended last
  auctions.sort((a, b) => {
    const aEnded = AuctionStorage.hasEnded(a);
    const bEnded = AuctionStorage.hasEnded(b);

    if (aEnded && !bEnded) return 1;
    if (!aEnded && bEnded) return -1;

    return 0;
  });

  displayAuctions();
}

  // Format time remaining
  function getTimeRemaining(endTime) {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;

    if (diff <= 0) return "Ended";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  }

  // Update countdown for a specific auction
  function updateCountdown(auctionId, elementId) {
    const auction = auctions.find((a) => a.id === auctionId);
    if (!auction || !auction.endTime) return;

    const element = document.getElementById(elementId);
    if (!element) return;

    const timeRemaining = getTimeRemaining(auction.endTime);
    element.textContent = timeRemaining;

    if (timeRemaining === "Ended") {
      element.classList.add("ended");
      clearInterval(countdownIntervals[auctionId]);
      loadAuctions(); // Reload to update display
    }
  }

  // Display auctions in the grid
  function displayAuctions() {
    const grid = document.getElementById("auctionList");
    
    // Clear existing intervals
    Object.values(countdownIntervals).forEach(interval => clearInterval(interval));
    countdownIntervals = {};

    if (auctions.length === 0) {
      grid.innerHTML =
        '<p class="no-auctions">No auctions available at the moment.</p>';
      return;
    }

    grid.innerHTML = ""; // clear existing

    auctions.forEach((auction) => {
      const hasEnded = AuctionStorage.hasEnded(auction);
      const card = document.createElement("div");
      card.className = `auction-card ${hasEnded ? 'ended' : ''}`;
      
      const countdownId = `countdown-${auction.id}`;
      
      card.innerHTML = `
            <img src="${auction.image}" alt="${auction.title}">
            <div class="auction-info">
                <h3>${auction.title}</h3>
                <p class="description">${auction.description.substring(0, 100)}...</p>
                <p class="highest-bid">Highest Bid: ${auction.highestBid.toLocaleString(
                  "sv-SE",
                  { style: "currency", currency: "SEK" }
                )}</p>
                ${
                  auction.endTime
                    ? `<p class="time-remaining ${hasEnded ? 'ended' : ''}">
                         <strong>${hasEnded ? '⏰ Ended' : '⏱️ Time Remaining'}:</strong> 
                         <span id="${countdownId}">${hasEnded ? 'Auction Ended' : getTimeRemaining(auction.endTime)}</span>
                       </p>`
                    : ""
                }
                ${hasEnded ? '<p class="auction-ended-label">🔒 Auction Ended</p>' : ''}
                <div class="button-group">
                    <button class="btn ${hasEnded ? 'btn-secondary' : 'btn-primary'} bid-btn" ${hasEnded ? 'disabled' : ''}>
                        ${hasEnded ? 'Bidding Closed' : 'Place Bid'}
                    </button>
                </div>
            </div>
        `;
      grid.appendChild(card);

      // Set up countdown interval if auction has end time and hasn't ended
      if (auction.endTime && !hasEnded) {
        countdownIntervals[auction.id] = setInterval(() => {
          updateCountdown(auction.id, countdownId);
        }, 1000);
        
        // Initial update
        updateCountdown(auction.id, countdownId);
      }

      // Click anywhere on the card to open details
      card.addEventListener("click", (e) => {
        if (!e.target.classList.contains("bid-btn")) {
          showDetail(auction.id);
        }
      });

      // Place Bid button
      if (!hasEnded) {
        card.querySelector(".bid-btn").addEventListener("click", (e) => {
          e.stopPropagation();
          showBidModal(auction.id);
        });
      }
    });
  }

  // Show auction detail modal
  function showDetail(auctionId) {
    const auction = auctions.find((a) => a.id === auctionId);
    if (!auction) return;

    const hasEnded = AuctionStorage.hasEnded(auction);
    const winner = hasEnded ? AuctionStorage.getWinner(auction) : null;

    const content = document.getElementById("detailContent");
    content.innerHTML = `
            <h2>${auction.title}</h2>
            <img src="${auction.image}" alt="${auction.title}" class="detail-image">
            <p><strong>Description:</strong> ${auction.description}</p>
            <p><strong>Current Highest Bid:</strong> ${auction.highestBid.toLocaleString(
              "sv-SE",
              { style: "currency", currency: "SEK" }
            )}</p>
            ${
              auction.endTime
                ? `<p><strong>${hasEnded ? 'Ended' : 'Ends'}:</strong> ${new Date(
                    auction.endTime
                  ).toLocaleString("sv-SE")}</p>`
                : ""
            }
            ${
              hasEnded
                ? `<p class="auction-ended-notice">🔒 This auction has ended</p>`
                : `<button class="btn btn-primary place-bid-btn">Place Bid</button>`
            }
            ${
              winner
                ? `<div class="winner-notice">
                     <h3>🎉 Winner</h3>
                     <p>Winning bid: ${winner.amount.toLocaleString("sv-SE", {
                       style: "currency",
                       currency: "SEK",
                     })}</p>
                   </div>`
                : ""
            }
        `;

    if (!hasEnded) {
      document.querySelector(".place-bid-btn").addEventListener("click", () => {
        showBidModal(auction.id);
        closeDetailModal();
      });
    }

    document.getElementById("detailModal").style.display = "block";
  }

  function closeDetailModal() {
    document.getElementById("detailModal").style.display = "none";
  }

  // Show bid modal
  function showBidModal(auctionId) {
    const auction = auctions.find((a) => a.id === auctionId);
    if (!auction) return;

    if (AuctionStorage.hasEnded(auction)) {
      alert("This auction has ended. Bidding is closed.");
      return;
    }

    document.getElementById("bidAuctionId").value = auctionId;
    document.getElementById("bidAmount").min = auction.highestBid + 0.01;
    document.getElementById("bidAmount").value = (auction.highestBid + 1).toFixed(2);
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

    if (AuctionStorage.hasEnded(auction)) {
      alert("This auction has ended. Bidding is closed.");
      closeBidModal();
      return;
    }

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

  // Refresh auctions every 30 seconds
  setInterval(loadAuctions, 30000);
});
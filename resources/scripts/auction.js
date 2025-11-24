document.addEventListener("DOMContentLoaded", () => {
  let auctions = [];
  let countdownIntervals = {};

  // Load auctions from storage
  async function loadAuctions() {
    // Load active auctions
    const data = await storage.getActiveAuctions();
    auctions = data || [];

    // Ensure each auction has a highestBid
    auctions.forEach((a) => {
      if (a.highestBid === undefined || a.highestBid === null) {
        a.highestBid = a.startingBid || 0;
      }
    });

    // Sort: active first, ended last
    auctions.sort((a, b) => {
      const aEnded = storage.hasEnded(a);
      const bEnded = storage.hasEnded(b);
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
      loadAuctions();
    }
  }

  // Display auctions in the grid
  function displayAuctions() {
    const grid = document.getElementById("auctionList");

    // Clear existing intervals
    Object.values(countdownIntervals).forEach((interval) =>
      clearInterval(interval)
    );
    countdownIntervals = {};

    if (auctions.length === 0) {
      grid.innerHTML =
        '<p class="no-auctions" style="text-align: center">No auctions available at the moment.</p>';
      return;
    }

    grid.innerHTML = ""; // clear existing

    auctions.forEach((auction) => {
      const hasEnded = storage.hasEnded(auction);
      const card = document.createElement("div");
      card.className = `auction-card ${hasEnded ? "ended" : ""}`;

      const countdownId = `countdown-${auction.id}`;
      const highestBid = Number(auction.highestBid ?? auction.startingBid ?? 0);
      const imgSrc = auction.image
        ? "/" + auction.image
        : "/resources/images/default.png";

      card.innerHTML = `
            <img src="${imgSrc}" alt="${auction.title}">
            <div class="auction-info">
                <h3>${auction.title}</h3>
                <p class="description">${auction.description.substring(
                  0,
                  100
                )}...</p>
                <p class="highest-bid">Highest Bid: ${highestBid.toLocaleString(
                  "sv-SE",
                  { style: "currency", currency: "SEK" }
                )}</p>
                ${
                  auction.endTime
                    ? `<p class="time-remaining ${hasEnded ? "ended" : ""}">
                         <strong>${
                           hasEnded ? "⏰ Ended" : "⏱️ Time Remaining"
                         }:</strong>
                         <span id="${countdownId}">${
                        hasEnded
                          ? "Auction Ended"
                          : getTimeRemaining(auction.endTime)
                      }</span>
                       </p>`
                    : ""
                }
                ${
                  hasEnded
                    ? '<p class="auction-ended-label">🔒 Auction Ended</p>'
                    : ""
                }
                <div class="button-group">
                    <button class="btn ${
                      hasEnded ? "btn-secondary" : "btn-primary"
                    } bid-btn" ${hasEnded ? "disabled" : ""}>
                        ${hasEnded ? "Bidding Closed" : "Place Bid"}
                    </button>
                </div>
            </div>
        `;
      grid.appendChild(card);
      // Set up countdown interval
      if (auction.endTime && !hasEnded) {
        countdownIntervals[auction.id] = setInterval(() => {
          updateCountdown(auction.id, countdownId);
        }, 1000);
        updateCountdown(auction.id, countdownId);
      }

      // Click anywhere on card to open details
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

    const hasEnded = storage.hasEnded(auction);
    const winner = hasEnded ? storage.getWinner(auction) : null;

    const content = document.getElementById("detailContent");
    content.innerHTML = `
            <h2>${auction.title}</h2>
            <img src="${
              auction.image
                ? "/" + auction.image
                : "/resources/images/default.png"
            }" alt="${auction.title}" class="detail-image">
            <p><strong>Description:</strong> ${auction.description}</p>
            <p><strong>Current Highest Bid:</strong> ${auction.highestBid.toLocaleString(
              "sv-SE",
              { style: "currency", currency: "SEK" }
            )}</p>
            ${
              auction.endTime
                ? `<p><strong>${
                    hasEnded ? "Ended" : "Ends"
                  }:</strong> ${new Date(auction.endTime).toLocaleString(
                    "sv-SE"
                  )}</p>`
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

  function showBidModal(auctionId) {
    const auction = auctions.find((a) => a.id === auctionId);
    if (!auction) return;

    if (storage.hasEnded(auction)) {
      alert("This auction has ended. Bidding is closed.");
      return;
    }
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
  document
    .getElementById("bidForm")
    .addEventListener("submit", async function (event) {
      event.preventDefault();

      const auctionId = document.getElementById("bidAuctionId").value;
      const amount = parseFloat(document.getElementById("bidAmount").value);
      const name = document.getElementById("bidderName").value;
      const email = document.getElementById("bidderEmail").value;

      if (!auctionId) {
        alert("No auction selected.");
        return;
      }

      try {
        await storage.placeBid(auctionId, name, email, amount);
        await loadAuctions();
        alert("Bid placed successfully!");
        closeBidModal();
      } catch (error) {
        alert(error.message);
      }
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

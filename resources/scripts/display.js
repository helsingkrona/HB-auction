document.addEventListener("DOMContentLoaded", () => {
  const auctionManagement = document.getElementById("auctionManagement");
  if (auctionManagement) loadAuctionsAdmin();

  async function loadAuctionsAdmin() {
    auctionManagement.innerHTML = "<p>Loading auctions...</p>";

    try {
      const res = await fetch("/resources/api/getAuctionsAdmin.php", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch auctions");

      const auctions = await res.json();
      if (!auctions || auctions.length === 0) {
        auctionManagement.innerHTML = "<p>No auctions available.</p>";
        return;
      }

      auctionManagement.innerHTML = "";

      auctions.forEach((auction) => {
        const hasEnded =
          auction.endTime && new Date(auction.endTime) <= new Date();
        const highestBid = Number(
          auction.highestBid ?? auction.startingBid ?? 0
        );
        const imgSrc = auction.image
          ? "/" + auction.image
          : "/resources/images/default.png";

        // CARD CONTAINER
        const card = document.createElement("div");
        card.className = `admin-auction-card ${hasEnded ? "ended" : ""}`;

        // LEFT SIDE: IMAGE + ACTION BUTTONS
        const left = document.createElement("div");
        left.style.flex = "0 0 150px";
        left.style.textAlign = "center";

        const img = document.createElement("img");
        img.src = imgSrc;
        img.alt = auction.title;

        const buttonsDiv = document.createElement("div");
        buttonsDiv.style.marginTop = "8px";

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-danger";
        deleteBtn.textContent = "Delete";
        deleteBtn.style.width = "100px";
        deleteBtn.onclick = () => deleteAuction(auction.id);

        buttonsDiv.appendChild(deleteBtn);

        if (!hasEnded) {
          const extendBtn = document.createElement("button");
          extendBtn.className = "btn btn-secondary";
          extendBtn.textContent = "Extend";
          extendBtn.style.width = "100px";
          extendBtn.onclick = () =>
            extendAuctionPrompt(auction.id, auction.endTime);
          buttonsDiv.appendChild(extendBtn);
        }

        left.appendChild(img);
        left.appendChild(buttonsDiv);
        // RIGHT SIDE: BID HISTORY
        const right = document.createElement("div");
        right.style.flex = "1";

        // Auction title
        const title = document.createElement("h3");
        title.textContent = auction.title;
        right.appendChild(title);
        // Auction end time label
        if (auction.endTime) {
          let endDate = new Date(auction.endTime);

          // If endDate is invalid, try adding ":00" for seconds
          if (isNaN(endDate.getTime())) {
            endDate = new Date(auction.endTime + ":00");
          }

          const endTimeLabel = document.createElement("p");
          endTimeLabel.textContent = `Ends at: ${endDate.toLocaleString(
            "sv-SE",
            {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }
          )}`;
          endTimeLabel.style.fontStyle = "italic";
          endTimeLabel.style.color = "#555";
          right.appendChild(endTimeLabel);
        }

        // Bids container
        const bidsDiv = document.createElement("div");
        bidsDiv.className = "bid-list";
        bidsDiv.innerHTML = `<strong>Bids (${
          auction.bids ? auction.bids.length : 0
        }):</strong>`;
        right.appendChild(bidsDiv);

        // Populate bids
        if (auction.bids && auction.bids.length > 0) {
          auction.bids.forEach((b) => {
            const li = document.createElement("div");
            li.className = "bid-item";
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";

            const bidText = document.createElement("span");
            bidText.innerHTML = `${b.name} (${
              b.email
            }): ${b.amount.toLocaleString("sv-SE", {
              style: "currency",
              currency: "SEK",
            })}`;
            li.appendChild(bidText);

            const rightControls = document.createElement("div");
            rightControls.style.display = "flex";
            rightControls.style.alignItems = "center";
            rightControls.style.gap = "5px";

            if (
              hasEnded &&
              b.amount === highestBid &&
              !auction.winnerNotified
            ) {
              const notifyBtn = document.createElement("button");
              notifyBtn.className = "btn btn-primary";
              notifyBtn.textContent = "Notify Winner";
              notifyBtn.onclick = () => notifyWinner(auction.id);
              rightControls.appendChild(notifyBtn);
            }

            if (hasEnded && b.amount === highestBid && auction.winnerNotified) {
              const notifiedLabel = document.createElement("span");
              notifiedLabel.textContent = "✔ Notification sent";
              notifiedLabel.style.color = "#28a745";
              notifiedLabel.style.fontWeight = "bold";
              rightControls.appendChild(notifiedLabel);
            }

            li.appendChild(rightControls);
            bidsDiv.appendChild(li);
          });
        }

        // Append left and right to the card
        card.appendChild(left);
        card.appendChild(right);
        auctionManagement.appendChild(card);
      });
    } catch (err) {
      console.error(err);
      auctionManagement.innerHTML = "<p>Error loading auctions.</p>";
    }
  }

  // ================= ACTION FUNCTIONS =================
  const auctionForm = document.getElementById("auctionForm");
  if (auctionForm) {
    auctionForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const title = document.getElementById("auctionTitle").value.trim();
      const description = document
        .getElementById("auctionDescription")
        .value.trim();
      const startingBid = Number(document.getElementById("startingBid").value);
      const endTime = document.getElementById("endTime").value;
      const imageFile = document.getElementById("auctionImage").files[0];

      if (!imageFile) {
        alert("Please select an image.");
        return;
      }

      const auctionData = {
        title,
        description,
        startingBid,
        endTime,
      };

      try {
        const response = await storage.saveAuction(auctionData, imageFile);

        if (response.success) {
          alert("Auction added successfully!");
          auctionForm.reset();
          loadAuctionsAdmin();
        } else {
          alert(
            "Failed to add auction: " + (response.error || "Unknown error")
          );
        }
      } catch (err) {
        console.error(err);
        alert("An error occurred while adding the auction.");
      }
    });
  }

  window.deleteAuction = async function (auctionId) {
    if (!confirm("Are you sure you want to delete this auction?")) return;

    const res = await fetch("/resources/api/deleteAuction.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: auctionId }),
    });

    const result = await res.json();
    if (result.success) {
      alert("Auction deleted successfully!");
      loadAuctionsAdmin();
    } else {
      alert("Failed to delete auction: " + (result.error || "Unknown error"));
    }
  };

  window.extendAuctionPrompt = function (auctionId, currentEndTime) {
    const newEnd = prompt(
      "Enter new end time (YYYY-MM-DDTHH:MM):",
      currentEndTime
    );
    if (!newEnd) return;

    window.extendAuction(auctionId, newEnd);
  };

  window.extendAuction = async function (auctionId, newEndTime) {
    const res = await fetch("/resources/api/extendAuction.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: auctionId, endTime: newEndTime }),
    });

    const result = await res.json();
    if (result.success) {
      alert("Auction extended successfully!");
      loadAuctionsAdmin();
    } else {
      alert("Failed to extend auction: " + (result.error || "Unknown error"));
    }
  };

  window.notifyWinner = async function (auctionId) {
    const res = await fetch("/resources/api/notifyWinner.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: auctionId }),
    });

    const result = await res.json();
    if (result.success) {
      alert("Winner notified successfully!");
      loadAuctionsAdmin();
    } else {
      alert("Failed to notify winner: " + (result.error || "Unknown error"));
    }
  };
});

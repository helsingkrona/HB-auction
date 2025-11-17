const meta = document.querySelector('meta[name="ADMIN_PASSWORD"]');
const ADMIN_PASSWORD = meta ? meta.getAttribute("content") : "admin123";
if (!meta)
  console.warn("ADMIN_PASSWORD meta tag not found; using fallback password.");
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
  auctions = (await storage.getAllAuctions()) || [];
  displayAuctionsAdmin();
}

function displayAuctionsAdmin() {
  const container = document.getElementById("auctionManagement");

  if (auctions.length === 0) {
    container.innerHTML = "<p>No auctions yet.</p>";
    return;
  }

  const input = document.getElementById("endTime");

  // Get current date/time + 2 days
  const nowPlus2 = new Date(
    Date.now() + 60 * 60 * 1000 + 2 * 24 * 60 * 60 * 1000
  );

  // Format to YYYY-MM-DDTHH:MM (datetime-local requires this)
  const localISO = nowPlus2.toISOString().slice(0, 16);

  input.value = localISO;

  const now = new Date();

  container.innerHTML = auctions
    .map((auction) => {
      const hasEnded = storage.hasEnded(auction);
      const winner = hasEnded ? storage.getWinner(auction) : null;
      const endTime = auction.endTime ? new Date(auction.endTime) : null;

      return `
        <div class="admin-auction-card ${hasEnded ? "auction-ended" : ""}">
            <img src="${auction.image}" alt="${auction.title}">
            <div>
                <h3>${auction.title}</h3>
                ${
                  hasEnded
                    ? '<span class="ended-badge">ENDED</span>'
                    : '<span class="active-badge">ACTIVE</span>'
                }
                <p>${auction.description}</p>
                <p><strong>Highest Bid:</strong> ${auction.highestBid.toLocaleString(
                  "sv-SE",
                  { style: "currency", currency: "SEK" }
                )}</p>
                ${
                  endTime
                    ? `<p><strong>End Time:</strong> ${endTime.toLocaleString(
                        "sv-SE"
                      )}</p>`
                    : "<p><strong>End Time:</strong> No end time set</p>"
                }
                ${
                  hasEnded
                    ? `<p><strong>Status:</strong> Ended ${new Date(
                        auction.endTime
                      ).toLocaleString("sv-SE")}</p>`
                    : ""
                }
                <p><strong>Total Bids:</strong> ${auction.bids?.length || 0}</p>
                ${
                  winner
                    ? `
                        <div class="winner-info">
                            <strong>🎉 WINNER:</strong>
                            <p>${winner.name} (${winner.email})</p>
                            <p>Winning Bid: ${winner.amount.toLocaleString(
                              "sv-SE",
                              {
                                style: "currency",
                                currency: "SEK",
                              }
                            )}</p>
                            ${
                              auction.winnerNotified
                                ? '<p class="notified">✓ Winner Notified</p>'
                                : '<p class="not-notified">⚠ Winner Not Notified</p>'
                            }
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
                                    ${bid.name} (${
                                  bid.email
                                }) - ${bid.amount.toLocaleString("sv-SE", {
                                  style: "currency",
                                  currency: "SEK",
                                })}
                                    <small>${new Date(
                                      bid.timestamp
                                    ).toLocaleString("sv-SE")}</small>
                                </div>
                            `
                              )
                              .join("")}
                        </div>
                        `
                    : ""
                }
                <div class="admin-actions">
                    ${
                      !hasEnded
                        ? `<button onclick="extendAuction('${auction.id}')" class="btn btn-warning">Extend Time</button>`
                        : ""
                    }
                    ${
                      hasEnded && winner && !auction.winnerNotified
                        ? `<button onclick="notifyWinner('${auction.id}')" class="btn btn-success">Notify Winner</button>`
                        : ""
                    }
                    <button onclick="deleteAuction('${
                      auction.id
                    }')" class="btn btn-danger">Delete</button>
                </div>
            </div>
        </div>
      `;
    })
    .join("");
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("auctionForm");
  console.log("FOUND FORM?", form);

  if (!form) {
    console.error("auctionForm not found in DOM");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("AUCTION FORM SUBMITTED!");

    const title = document.getElementById("auctionTitle").value;
    const description = document.getElementById("auctionDescription").value;
    const startingBid = parseFloat(
      document.getElementById("startingBid").value
    );
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

      await storage.saveAuction(auction);
      await loadAuctionsAdmin();

      form.reset();
      alert("Auction added successfully!");
    };

    reader.readAsDataURL(imageFile);
  });
});

async function deleteAuction(auctionId) {
  if (!confirm("Are you sure you want to delete this auction?")) return;

  await storage.deleteAuction(auctionId);
  await loadAuctionsAdmin();
  alert("Auction deleted successfully!");
}

async function extendAuction(auctionId) {
  const auction = await storage.getAuction(auctionId);
  if (!auction) return;

  const currentEnd = auction.endTime ? new Date(auction.endTime) : new Date();
  const newEndTime = prompt(
    "Enter new end time (YYYY-MM-DD HH:MM):",
    currentEnd.toISOString().slice(0, 16).replace("T", " ")
  );

  if (!newEndTime) return;

  const newEndDate = new Date(newEndTime);
  if (newEndDate <= new Date()) {
    alert("End time must be in the future!");
    return;
  }

  auction.endTime = newEndDate.toISOString();
  await storage.saveAuction(auction);
  await loadAuctionsAdmin();
  alert("Auction end time updated!");
}

async function notifyWinner(auctionId) {
  const auction = await storage.getAuction(auctionId);
  if (!auction) {
    alert("Auction not found!");
    return;
  }

  const winner = storage.getWinner(auction);
  if (!winner) {
    alert("No winner found for this auction!");
    return;
  }

  // Debug: Check winner data
  console.log("Winner data:", winner);

  if (!winner.email || !winner.name) {
    alert("Winner data is incomplete (missing email or name)!");
    console.error("Auction bids:", auction.bids);
    return;
  }

  if (confirm(`Send notification to ${winner.name} (${winner.email})?`)) {
    try {
      const emailPayload = {
        to: winner.email.trim(),
        subject: `🎉 Congratulations! You Won: ${auction.title}`,
        template: "winner", // Tell PHP to use winner template
        templateData: {
          winnerName: winner.name,
          auctionTitle: auction.title,
          auctionDescription: auction.description,
          winningBid: winner.amount.toLocaleString("sv-SE", {
            style: "currency",
            currency: "SEK",
          }),
          auctionEndTime: new Date(auction.endTime).toLocaleString("sv-SE"),
        },
      };

      console.log("Sending email with payload:", emailPayload);

      const response = await fetch("../resources/mail/sendMail.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailPayload),
      });

      // Read the raw response text first
      const resultText = await response.text();
      console.log("Raw sendMail.php response:", resultText);

      // Then try to parse as JSON
      let result;
      try {
        result = JSON.parse(resultText);
      } catch (jsonError) {
        console.error("Failed to parse JSON:", jsonError);
        alert("Failed to parse server response. See console for details.");
        return;
      }

      if (result.success) {
        auction.winnerNotified = true;
        auction.notificationSentAt = new Date().toISOString();
        await storage.saveAuction(auction);
        await loadAuctionsAdmin();
        alert("Winner notification sent successfully!");
      } else {
        alert(
          "Failed to send notification: " + (result.error || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      alert("Error sending notification. Check console for details.");
    }
  }
}

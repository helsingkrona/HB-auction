const storage = {
  STORAGE_KEY: "auctions", // kept for compatibility

  async getAllAuctions() {
    const res = await fetch("/resources/api/getAuctions.php", {
      credentials: "include",
    });
    if (!res.ok) return [];
    return await res.json();
  },

  async getActiveAuctions() {
    const all = await this.getAllAuctions();
    const now = new Date();
    return all.filter((a) => !a.endTime || new Date(a.endTime) > now);
  },

  async getEndedAuctions() {
    const all = await this.getAllAuctions();
    const now = new Date();
    return all.filter((a) => a.endTime && new Date(a.endTime) <= now);
  },

  hasEnded(auction) {
    if (!auction || !auction.endTime) return false;
    return new Date(auction.endTime) <= new Date();
  },

  getWinner(auction) {
    if (!this.hasEnded(auction)) return null;
    if (!auction.bids || auction.bids.length === 0) return null;
    return auction.bids.reduce((highest, bid) =>
      bid.amount > highest.amount ? bid : highest
    );
  },

  // ⭐ Updated for Base64 image upload
  async saveAuction(auction, imageFile = null) {
    let payload = { ...auction };

    if (imageFile) {
      // Convert file to Base64 string
      payload.imageBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
    }

    const res = await fetch("/resources/api/saveAuction.php", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return await res.json();
  },

  async getAuction(auctionId) {
    const all = await this.getAllAuctions();
    return all.find((a) => a.id === auctionId);
  },

  async deleteAuction(auctionId) {
    const all = await this.getAllAuctions();
    const filtered = all.filter((a) => a.id !== auctionId);

    const res = await fetch("/resources/api/saveAuction.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        id: "__bulk_replace__",
        replaceAll: filtered,
      }),
    });

    return await res.json();
  },

  async placeBid(auctionId, bidderName, bidderEmail, amount) {
    const auction = await this.getAuction(auctionId);
    if (!auction) throw new Error("Auction not found");
    if (this.hasEnded(auction)) throw new Error("Auction has ended");
    if (amount <= (auction.highestBid || 0))
      throw new Error("Bid must be higher than current highest bid");

    const bid = {
      name: bidderName,
      email: bidderEmail,
      amount,
      timestamp: new Date().toISOString(),
    };

    // Send bid only to public endpoint
    const res = await fetch("/resources/api/placeBid.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: auctionId,
        name: bidderName,
        email: bidderEmail,
        amount,
      }),
    });

    const result = await res.json();
    if (!result.success) throw new Error(result.error || "Failed to place bid");

    // Update local object for immediate display
    auction.bids = auction.bids || [];
    auction.bids.push(bid);
    auction.highestBid = amount;

    return bid;
  },
};

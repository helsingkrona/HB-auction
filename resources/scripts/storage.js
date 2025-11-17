const storage = {
  STORAGE_KEY: "auctions", // kept for compatibility where needed

  async getAllAuctions() {
    const res = await fetch("../resources/api/getAuctions.php");
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

  async saveAuction(auction) {
    // POST to saveAuction.php with the full auction object
    const res = await fetch("../resources/api/saveAuction.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(auction),
    });
    return await res.json();
  },

  async getAuction(auctionId) {
    const all = await this.getAllAuctions();
    return all.find((a) => a.id === auctionId);
  },

  async deleteAuction(auctionId) {
    // delete by loading all and saving without the id
    const all = await this.getAllAuctions();
    const filtered = all.filter((a) => a.id !== auctionId);
    // save by POSTing each auction? For simplicity, we'll POST the whole list via save endpoint
    // We'll create a simple wrapper: save a fake container that overwrites file
    const res = await fetch("../resources/api/saveAuction.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "__bulk_replace__", replaceAll: filtered }),
    });
    return await res.json();
  },

  async placeBid(auctionId, bidderName, bidderEmail, amount) {
    const auction = await this.getAuction(auctionId);
    if (!auction) throw new Error("Auction not found");
    if (this.hasEnded(auction)) throw new Error("Auction has ended");
    if (amount <= auction.highestBid)
      throw new Error("Bid must be higher than current highest bid");

    const bid = {
      name: bidderName,
      email: bidderEmail,
      amount: amount,
      timestamp: new Date().toISOString(),
    };
    auction.bids = auction.bids || [];
    auction.bids.push(bid);
    auction.highestBid = amount;

    await this.saveAuction(auction);
    return bid;
  },
};

// Make available for Node tests if needed
if (typeof module !== "undefined" && module.exports)
  module.exports = AuctionStorage;

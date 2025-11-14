// Auction Storage Manager
const AuctionStorage = {
    STORAGE_KEY: 'auctions',

    // Get all auctions
    async getAllAuctions() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    // Save or update an auction
    async saveAuction(auction) {
        const auctions = await this.getAllAuctions();
        const index = auctions.findIndex(a => a.id === auction.id);
        
        if (index !== -1) {
            auctions[index] = auction;
        } else {
            auctions.push(auction);
        }
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(auctions));
        return auction;
    },

    // Get a single auction by ID
    async getAuction(auctionId) {
        const auctions = await this.getAllAuctions();
        return auctions.find(a => a.id === auctionId);
    },

    // Delete an auction
    async deleteAuction(auctionId) {
        const auctions = await this.getAllAuctions();
        const filtered = auctions.filter(a => a.id !== auctionId);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
        return true;
    },

    // Place a bid
    async placeBid(auctionId, bidderName, bidderEmail, amount) {
        const auction = await this.getAuction(auctionId);
        if (!auction) throw new Error('Auction not found');
        
        if (amount <= auction.highestBid) {
            throw new Error('Bid must be higher than current highest bid');
        }

        const bid = {
            name: bidderName,
            email: bidderEmail,
            amount: amount,
            timestamp: new Date().toISOString()
        };

        auction.bids = auction.bids || [];
        auction.bids.push(bid);
        auction.highestBid = amount;

        await this.saveAuction(auction);
        return bid;
    }
};

// Make it available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuctionStorage;
}
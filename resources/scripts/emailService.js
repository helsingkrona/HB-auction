// Email Service for Auction Winners
const EmailService = {
    // Configuration - Replace with your EmailJS credentials
    // Sign up at https://www.emailjs.com/ to get these
    EMAILJS_SERVICE_ID: 'service_tnvkds3',
    EMAILJS_TEMPLATE_ID: 'template_s665axe',
    EMAILJS_PUBLIC_KEY: 'pUwknESnkrDZdr3W_',
    
    initialized: false,

    // Initialize EmailJS (call this once on page load)
    async initialize() {
        if (this.initialized) return;
        
        // Check if EmailJS is loaded
        if (typeof emailjs === 'undefined') {
            console.warn('EmailJS library not loaded. Email notifications disabled.');
            return false;
        }

        try {
            emailjs.init(this.EMAILJS_PUBLIC_KEY);
            this.initialized = true;
            console.log('EmailJS initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize EmailJS:', error);
            return false;
        }
    },

    // Send winner notification email
    async sendWinnerNotification(auction, winner) {
        if (!this.initialized) {
            console.log('Email service not initialized. Winner details:', winner);
            return this.showWinnerNotification(auction, winner);
        }

        try {
            const templateParams = {
                to_email: winner.email,
                to_name: winner.name,
                auction_title: auction.title,
                winning_bid: winner.amount.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK' }),
                auction_description: auction.description,
                contact_email: 'pqe@helsingkrona.se'
            };


            const response = await emailjs.send(
                this.EMAILJS_SERVICE_ID,
                this.EMAILJS_TEMPLATE_ID,
                templateParams
            );

            console.log('Email sent successfully:', response);
            return { success: true, response };
        } catch (error) {
            console.error('Failed to send email:', error);
            return { success: false, error };
        }
    },

    // Fallback: Show winner notification in browser
    showWinnerNotification(auction, winner) {
        const message = `
🎉 AUCTION ENDED 🎉

Winner: ${winner.name}
Email: ${winner.email}
Winning Bid: ${winner.amount.toLocaleString('sv-SE', {
            style: 'currency',
            currency: 'SEK'
        })}

Auction: ${auction.title}

Please contact the winner at: ${winner.email}
        `;
        
        console.log(message);
        alert(message);
        
        return { success: true, method: 'browser_notification' };
    },

    // Check for ended auctions and notify winners
    async checkAndNotifyWinners() {
        const endedAuctions = await AuctionStorage.getEndedAuctions();
        
        for (const auction of endedAuctions) {
            // Check if winner has already been notified
            if (auction.winnerNotified) continue;
            
            const winner = AuctionStorage.getWinner(auction);
            if (!winner) continue;

            console.log(`Auction "${auction.title}" has ended. Notifying winner...`);
            
            const result = await this.sendWinnerNotification(auction, winner);
            
            // Mark as notified
            auction.winnerNotified = true;
            auction.notificationSentAt = new Date().toISOString();
            await AuctionStorage.saveAuction(auction);
            
            console.log('Winner notification result:', result);
        }
    },

    // Start periodic check for ended auctions (every 30 seconds)
    startPeriodicCheck(intervalMs = 30000) {
        // Initial check
        this.checkAndNotifyWinners();
        
        // Set up periodic checking
        return setInterval(() => {
            this.checkAndNotifyWinners();
        }, intervalMs);
    }
};

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        EmailService.initialize();
    });
}

// Make it available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailService;
}
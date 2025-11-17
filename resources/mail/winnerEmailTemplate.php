<?php
/**
 * Winner Notification Email Template
 * 
 * Variables available:
 * - $winnerName: Winner's name
 * - $auctionTitle: Title of the auction
 * - $auctionDescription: Description of the auction
 * - $winningBid: Winning bid amount (formatted)
 * - $auctionEndTime: When the auction ended (formatted)
 * - $currentYear: Current year for copyright
 */

function getWinnerEmailTemplate($winnerName, $auctionTitle, $auctionDescription, $winningBid, $auctionEndTime)
{
    $currentYear = date('Y');

    return <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: #ffffff;
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 40px 20px; 
      text-align: center; 
      border-radius: 0;
    }
    .header h1 { 
      margin: 0; 
      font-size: 32px;
      font-weight: bold;
    }
    .header p {
      margin: 10px 0 0 0;
      font-size: 18px;
      opacity: 0.95;
    }
    .content { 
      background: #ffffff; 
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
    }
    .winner-badge { 
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      color: #333; 
      padding: 12px 25px; 
      border-radius: 25px; 
      display: inline-block; 
      font-weight: bold; 
      margin: 20px 0;
      font-size: 16px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .auction-details { 
      background: #f8f9fa; 
      padding: 25px; 
      border-radius: 10px; 
      margin: 25px 0;
      border-left: 4px solid #667eea;
    }
    .auction-details h3 { 
      margin-top: 0; 
      color: #667eea;
      font-size: 22px;
    }
    .auction-details p {
      margin: 10px 0;
      color: #555;
    }
    .winning-bid { 
      font-size: 28px; 
      color: #28a745; 
      font-weight: bold; 
      margin: 20px 0;
      padding: 15px;
      background: #e8f5e9;
      border-radius: 8px;
      text-align: center;
    }
    .next-steps { 
      background: #e7f3ff; 
      padding: 20px; 
      border-left: 4px solid #667eea; 
      margin: 25px 0;
      border-radius: 5px;
    }
    .next-steps h4 {
      margin-top: 0;
      color: #667eea;
      font-size: 18px;
    }
    .next-steps ol {
      margin: 15px 0;
      padding-left: 20px;
    }
    .next-steps li {
      margin: 10px 0;
      line-height: 1.6;
    }
    .signature {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
    }
    .signature strong {
      color: #667eea;
      font-size: 16px;
    }
    .footer { 
      text-align: center; 
      padding: 30px 20px; 
      color: #666; 
      font-size: 14px;
      background-color: #f8f9fa;
      border-top: 1px solid #e0e0e0;
    }
    .footer p {
      margin: 5px 0;
    }
    .footer-small {
      font-size: 12px;
      color: #999;
      margin-top: 15px;
    }
    .highlight {
      color: #667eea;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Congratulations!</h1>
      <p>You've won the auction!</p>
    </div>
    
    <div class="content">
      <p class="greeting">Dear <span class="highlight">{$winnerName}</span>,</p>
      
      <div style="text-align: center;">
        <div class="winner-badge">🏆 WINNING BIDDER 🏆</div>
      </div>
      
      <p>We're thrilled to inform you that you have successfully won the auction for:</p>
      
      <div class="auction-details">
        <h3>{$auctionTitle}</h3>
        <p>{$auctionDescription}</p>
        
        <div class="winning-bid">
          Your Winning Bid: {$winningBid}
        </div>
        
        <p><strong>Auction Ended:</strong> {$auctionEndTime}</p>
      </div>
      
      <div class="next-steps">
        <h4>📋 Next Steps:</h4>
        <ol>
          <li><strong>Payment:</strong> Come to the Helsingkrong Expedition to complete your payment</li>
          <li><strong>Documentation:</strong> Please keep this email for your records</li>
          <li><strong>Timeline:</strong> Payment must be completed within 48 hours to secure your item</li>
        </ol>
      </div>
      
      <p>If you have any questions or concerns, please don't hesitate to contact us. We're here to help!</p>
      
      <p>Thank you for participating in our auction. We hope you enjoy your new acquisition!</p>
      
      <div class="signature">
        <p>
          Best regards,<br>
          <strong>HB Auctions Team</strong><br>
          <a href="mailto:pqe@helsingkrona.se" style="color: #667eea; text-decoration: none;">pqe@helsingkrona.se</a>
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>HB Auctions</strong></p>
      <p>This is an automated message from HB Auctions</p>
      <p class="footer-small">© {$currentYear} HB Auctions. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
HTML;
}
?>
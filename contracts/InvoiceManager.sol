// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title InvoiceManager
 * @dev Enhanced blockchain-based invoicing system with dispute resolution
 */
contract InvoiceManager is ReentrancyGuard, Ownable {
    
    enum InvoiceStatus { Created, Paid, Disputed, Resolved, Cancelled }
    enum DisputeStatus { None, Raised, UnderReview, Resolved }
    
    struct Invoice {
        uint256 id;
        string ipfsHash;        // IPFS hash of the invoice PDF
        address issuer;         // Who created the invoice
        address recipient;      // Who should pay the invoice
        uint256 amount;         // Amount in wei or token units
        address tokenAddress;   // Token contract address (0x0 for ETH)
        InvoiceStatus status;
        uint256 createdAt;
        uint256 dueDate;
        uint256 paidAt;
        string description;
    }
    
    struct Dispute {
        uint256 invoiceId;
        address initiator;
        string reason;
        DisputeStatus status;
        uint256 createdAt;
        uint256 resolvedAt;
        address resolver;
    }
    
    // State variables
    mapping(uint256 => Invoice) public invoices;
    mapping(uint256 => Dispute) public disputes;
    mapping(address => uint256[]) public userInvoices;
    mapping(address => bool) public authorizedResolvers;
    
    uint256 public nextInvoiceId = 1;
    uint256 public disputeFee = 0.01 ether;
    uint256 public platformFee = 250; // 2.5% in basis points
    
    // Events
    event InvoiceCreated(
        uint256 indexed id,
        address indexed issuer,
        address indexed recipient,
        uint256 amount,
        address tokenAddress,
        string ipfsHash
    );
    
    event InvoicePaid(
        uint256 indexed id,
        address indexed payer,
        uint256 amount,
        uint256 fee
    );
    
    event InvoiceDisputed(
        uint256 indexed invoiceId,
        address indexed initiator,
        string reason
    );
    
    event DisputeResolved(
        uint256 indexed invoiceId,
        address indexed resolver,
        InvoiceStatus newStatus
    );
    
    event InvoiceCancelled(uint256 indexed id, address indexed issuer);
    
    // Modifiers
    modifier onlyInvoiceParty(uint256 _invoiceId) {
        Invoice memory invoice = invoices[_invoiceId];
        require(
            msg.sender == invoice.issuer || msg.sender == invoice.recipient,
            "Not authorized for this invoice"
        );
        _;
    }
    
    modifier onlyResolver() {
        require(authorizedResolvers[msg.sender] || msg.sender == owner(), "Not authorized resolver");
        _;
    }
    
    modifier validInvoice(uint256 _invoiceId) {
        require(_invoiceId > 0 && _invoiceId < nextInvoiceId, "Invalid invoice ID");
        _;
    }
    
    constructor() Ownable(msg.sender) {
        authorizedResolvers[msg.sender] = true;
    }
    
    /**
     * @dev Create a new invoice
     */
    function createInvoice(
        string memory _ipfsHash,
        address _recipient,
        uint256 _amount,
        address _tokenAddress,
        uint256 _dueDate,
        string memory _description
    ) external returns (uint256) {
        require(_recipient != address(0), "Invalid recipient");
        require(_recipient != msg.sender, "Cannot invoice yourself");
        require(_amount > 0, "Amount must be greater than 0");
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");
        require(_dueDate > block.timestamp, "Due date must be in the future");
        
        uint256 invoiceId = nextInvoiceId;
        
        invoices[invoiceId] = Invoice({
            id: invoiceId,
            ipfsHash: _ipfsHash,
            issuer: msg.sender,
            recipient: _recipient,
            amount: _amount,
            tokenAddress: _tokenAddress,
            status: InvoiceStatus.Created,
            createdAt: block.timestamp,
            dueDate: _dueDate,
            paidAt: 0,
            description: _description
        });
        
        userInvoices[msg.sender].push(invoiceId);
        userInvoices[_recipient].push(invoiceId);
        
        emit InvoiceCreated(invoiceId, msg.sender, _recipient, _amount, _tokenAddress, _ipfsHash);
        
        nextInvoiceId++;
        return invoiceId;
    }
    
    /**
     * @dev Pay an invoice with ETH
     */
    function payInvoiceETH(uint256 _invoiceId) external payable nonReentrant validInvoice(_invoiceId) {
        Invoice storage invoice = invoices[_invoiceId];
        
        require(invoice.status == InvoiceStatus.Created, "Invoice not payable");
        require(invoice.tokenAddress == address(0), "This invoice requires token payment");
        require(msg.value >= invoice.amount, "Insufficient payment");
        
        uint256 fee = (invoice.amount * platformFee) / 10000;
        uint256 issuerAmount = invoice.amount - fee;
        
        invoice.status = InvoiceStatus.Paid;
        invoice.paidAt = block.timestamp;
        
        // Transfer payment to issuer
        (bool success, ) = payable(invoice.issuer).call{value: issuerAmount}("");
        require(success, "Payment transfer failed");
        
        // Refund excess payment
        if (msg.value > invoice.amount) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - invoice.amount}("");
            require(refundSuccess, "Refund failed");
        }
        
        emit InvoicePaid(_invoiceId, msg.sender, invoice.amount, fee);
    }
    
    /**
     * @dev Pay an invoice with ERC20 tokens
     */
    function payInvoiceToken(uint256 _invoiceId) external nonReentrant validInvoice(_invoiceId) {
        Invoice storage invoice = invoices[_invoiceId];
        
        require(invoice.status == InvoiceStatus.Created, "Invoice not payable");
        require(invoice.tokenAddress != address(0), "This invoice requires ETH payment");
        
        IERC20 token = IERC20(invoice.tokenAddress);
        require(token.balanceOf(msg.sender) >= invoice.amount, "Insufficient token balance");
        
        uint256 fee = (invoice.amount * platformFee) / 10000;
        uint256 issuerAmount = invoice.amount - fee;
        
        invoice.status = InvoiceStatus.Paid;
        invoice.paidAt = block.timestamp;
        
        // Transfer tokens to issuer
        require(token.transferFrom(msg.sender, invoice.issuer, issuerAmount), "Token transfer failed");
        
        // Transfer fee to contract owner
        if (fee > 0) {
            require(token.transferFrom(msg.sender, owner(), fee), "Fee transfer failed");
        }
        
        emit InvoicePaid(_invoiceId, msg.sender, invoice.amount, fee);
    }
    
    /**
     * @dev Raise a dispute for an invoice
     */
    function raiseDispute(uint256 _invoiceId, string memory _reason) external payable onlyInvoiceParty(_invoiceId) {
        require(msg.value >= disputeFee, "Insufficient dispute fee");
        require(disputes[_invoiceId].status == DisputeStatus.None, "Dispute already exists");
        
        Invoice storage invoice = invoices[_invoiceId];
        require(invoice.status == InvoiceStatus.Created || invoice.status == InvoiceStatus.Paid, "Cannot dispute this invoice");
        
        disputes[_invoiceId] = Dispute({
            invoiceId: _invoiceId,
            initiator: msg.sender,
            reason: _reason,
            status: DisputeStatus.Raised,
            createdAt: block.timestamp,
            resolvedAt: 0,
            resolver: address(0)
        });
        
        invoice.status = InvoiceStatus.Disputed;
        
        emit InvoiceDisputed(_invoiceId, msg.sender, _reason);
    }
    
    /**
     * @dev Resolve a dispute (only authorized resolvers)
     */
    function resolveDispute(uint256 _invoiceId, InvoiceStatus _newStatus) external onlyResolver validInvoice(_invoiceId) {
        Dispute storage dispute = disputes[_invoiceId];
        require(dispute.status == DisputeStatus.Raised, "No active dispute");
        require(_newStatus == InvoiceStatus.Paid || _newStatus == InvoiceStatus.Cancelled, "Invalid resolution status");
        
        Invoice storage invoice = invoices[_invoiceId];
        invoice.status = _newStatus;
        
        dispute.status = DisputeStatus.Resolved;
        dispute.resolvedAt = block.timestamp;
        dispute.resolver = msg.sender;
        
        // Refund dispute fee to initiator
        (bool success, ) = payable(dispute.initiator).call{value: disputeFee}("");
        require(success, "Dispute fee refund failed");
        
        emit DisputeResolved(_invoiceId, msg.sender, _newStatus);
    }
    
    /**
     * @dev Cancel an invoice (only issuer, only if not paid)
     */
    function cancelInvoice(uint256 _invoiceId) external validInvoice(_invoiceId) {
        Invoice storage invoice = invoices[_invoiceId];
        require(msg.sender == invoice.issuer, "Only issuer can cancel");
        require(invoice.status == InvoiceStatus.Created, "Cannot cancel this invoice");
        
        invoice.status = InvoiceStatus.Cancelled;
        
        emit InvoiceCancelled(_invoiceId, msg.sender);
    }
    
    /**
     * @dev Get invoice details
     */
    function getInvoice(uint256 _invoiceId) external view validInvoice(_invoiceId) returns (Invoice memory) {
        return invoices[_invoiceId];
    }
    
    /**
     * @dev Get dispute details
     */
    function getDispute(uint256 _invoiceId) external view validInvoice(_invoiceId) returns (Dispute memory) {
        return disputes[_invoiceId];
    }
    
    /**
     * @dev Get user's invoices
     */
    function getUserInvoices(address _user) external view returns (uint256[] memory) {
        return userInvoices[_user];
    }
    
    /**
     * @dev Get invoices by status
     */
    function getInvoicesByStatus(InvoiceStatus _status, uint256 _limit, uint256 _offset) 
        external view returns (Invoice[] memory) {
        
        uint256 count = 0;
        
        // First pass: count matching invoices
        for (uint256 i = 1; i < nextInvoiceId; i++) {
            if (invoices[i].status == _status) {
                count++;
            }
        }
        
        if (count == 0 || _offset >= count) {
            return new Invoice[](0);
        }
        
        uint256 resultLength = count - _offset;
        if (_limit > 0 && _limit < resultLength) {
            resultLength = _limit;
        }
        
        Invoice[] memory result = new Invoice[](resultLength);
        uint256 resultIndex = 0;
        uint256 currentOffset = 0;
        
        // Second pass: collect matching invoices
        for (uint256 i = 1; i < nextInvoiceId && resultIndex < resultLength; i++) {
            if (invoices[i].status == _status) {
                if (currentOffset >= _offset) {
                    result[resultIndex] = invoices[i];
                    resultIndex++;
                }
                currentOffset++;
            }
        }
        
        return result;
    }
    
    // Admin functions
    function addResolver(address _resolver) external onlyOwner {
        authorizedResolvers[_resolver] = true;
    }
    
    function removeResolver(address _resolver) external onlyOwner {
        authorizedResolvers[_resolver] = false;
    }
    
    function updateDisputeFee(uint256 _newFee) external onlyOwner {
        disputeFee = _newFee;
    }
    
    function updatePlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 1000, "Fee cannot exceed 10%"); // Max 10%
        platformFee = _newFee;
    }
    
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    // Emergency functions
    function emergencyPause() external onlyOwner {
        // Implement emergency pause functionality if needed
    }
}

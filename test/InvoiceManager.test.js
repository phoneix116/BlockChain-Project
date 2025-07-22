const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InvoiceManager", function () {
  let invoiceManager;
  let owner;
  let issuer;
  let recipient;
  let resolver;
  
  const testIPFSHash = "QmTest123456789";
  const invoiceAmount = ethers.utils.parseEther("1.0");
  const futureDate = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
  const testDescription = "Test invoice for web development services";

  beforeEach(async function () {
    [owner, issuer, recipient, resolver] = await ethers.getSigners();
    
    const InvoiceManager = await ethers.getContractFactory("InvoiceManager");
    invoiceManager = await InvoiceManager.deploy();
    await invoiceManager.deployed();
    
    // Add resolver
    await invoiceManager.addResolver(resolver.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await invoiceManager.owner()).to.equal(owner.address);
    });

    it("Should set initial values correctly", async function () {
      expect(await invoiceManager.nextInvoiceId()).to.equal(1);
      expect(await invoiceManager.disputeFee()).to.equal(ethers.utils.parseEther("0.01"));
      expect(await invoiceManager.platformFee()).to.equal(250); // 2.5%
    });
  });

  describe("Invoice Creation", function () {
    it("Should create an invoice successfully", async function () {
      await expect(
        invoiceManager.connect(issuer).createInvoice(
          testIPFSHash,
          recipient.address,
          invoiceAmount,
          ethers.constants.AddressZero,
          futureDate,
          testDescription
        )
      ).to.emit(invoiceManager, "InvoiceCreated")
        .withArgs(1, issuer.address, recipient.address, invoiceAmount, ethers.constants.AddressZero, testIPFSHash);

      const invoice = await invoiceManager.getInvoice(1);
      expect(invoice.id).to.equal(1);
      expect(invoice.issuer).to.equal(issuer.address);
      expect(invoice.recipient).to.equal(recipient.address);
      expect(invoice.amount).to.equal(invoiceAmount);
      expect(invoice.status).to.equal(0); // Created
    });

    it("Should fail with invalid recipient", async function () {
      await expect(
        invoiceManager.connect(issuer).createInvoice(
          testIPFSHash,
          ethers.constants.AddressZero,
          invoiceAmount,
          ethers.constants.AddressZero,
          futureDate,
          testDescription
        )
      ).to.be.revertedWith("Invalid recipient");
    });

    it("Should fail when invoicing yourself", async function () {
      await expect(
        invoiceManager.connect(issuer).createInvoice(
          testIPFSHash,
          issuer.address,
          invoiceAmount,
          ethers.constants.AddressZero,
          futureDate,
          testDescription
        )
      ).to.be.revertedWith("Cannot invoice yourself");
    });

    it("Should fail with zero amount", async function () {
      await expect(
        invoiceManager.connect(issuer).createInvoice(
          testIPFSHash,
          recipient.address,
          0,
          ethers.constants.AddressZero,
          futureDate,
          testDescription
        )
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should fail with past due date", async function () {
      const pastDate = Math.floor(Date.now() / 1000) - 86400; // 1 day ago
      
      await expect(
        invoiceManager.connect(issuer).createInvoice(
          testIPFSHash,
          recipient.address,
          invoiceAmount,
          ethers.constants.AddressZero,
          pastDate,
          testDescription
        )
      ).to.be.revertedWith("Due date must be in the future");
    });
  });

  describe("Invoice Payment", function () {
    beforeEach(async function () {
      await invoiceManager.connect(issuer).createInvoice(
        testIPFSHash,
        recipient.address,
        invoiceAmount,
        ethers.constants.AddressZero,
        futureDate,
        testDescription
      );
    });

    it("Should pay invoice with ETH successfully", async function () {
      const initialBalance = await ethers.provider.getBalance(issuer.address);
      
      await expect(
        invoiceManager.connect(recipient).payInvoiceETH(1, { value: invoiceAmount })
      ).to.emit(invoiceManager, "InvoicePaid")
        .withArgs(1, recipient.address, invoiceAmount, ethers.utils.parseEther("0.025")); // 2.5% fee

      const invoice = await invoiceManager.getInvoice(1);
      expect(invoice.status).to.equal(1); // Paid
      expect(invoice.paidAt).to.be.gt(0);

      // Check issuer received payment minus fee
      const finalBalance = await ethers.provider.getBalance(issuer.address);
      const expectedAmount = invoiceAmount.sub(ethers.utils.parseEther("0.025"));
      expect(finalBalance.sub(initialBalance)).to.equal(expectedAmount);
    });

    it("Should fail to pay with insufficient amount", async function () {
      const insufficientAmount = ethers.utils.parseEther("0.5");
      
      await expect(
        invoiceManager.connect(recipient).payInvoiceETH(1, { value: insufficientAmount })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should refund excess payment", async function () {
      const excessAmount = ethers.utils.parseEther("2.0");
      const initialBalance = await ethers.provider.getBalance(recipient.address);
      
      const tx = await invoiceManager.connect(recipient).payInvoiceETH(1, { value: excessAmount });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      
      const finalBalance = await ethers.provider.getBalance(recipient.address);
      const expectedChange = excessAmount.sub(invoiceAmount).sub(gasUsed);
      
      expect(finalBalance.sub(initialBalance).add(gasUsed)).to.equal(expectedChange.add(gasUsed));
    });

    it("Should fail to pay already paid invoice", async function () {
      await invoiceManager.connect(recipient).payInvoiceETH(1, { value: invoiceAmount });
      
      await expect(
        invoiceManager.connect(recipient).payInvoiceETH(1, { value: invoiceAmount })
      ).to.be.revertedWith("Invoice not payable");
    });
  });

  describe("Disputes", function () {
    beforeEach(async function () {
      await invoiceManager.connect(issuer).createInvoice(
        testIPFSHash,
        recipient.address,
        invoiceAmount,
        ethers.constants.AddressZero,
        futureDate,
        testDescription
      );
    });

    it("Should raise dispute successfully", async function () {
      const disputeFee = await invoiceManager.disputeFee();
      const disputeReason = "Service not delivered as promised";
      
      await expect(
        invoiceManager.connect(recipient).raiseDispute(1, disputeReason, { value: disputeFee })
      ).to.emit(invoiceManager, "InvoiceDisputed")
        .withArgs(1, recipient.address, disputeReason);

      const invoice = await invoiceManager.getInvoice(1);
      expect(invoice.status).to.equal(2); // Disputed

      const dispute = await invoiceManager.getDispute(1);
      expect(dispute.initiator).to.equal(recipient.address);
      expect(dispute.reason).to.equal(disputeReason);
      expect(dispute.status).to.equal(1); // Raised
    });

    it("Should fail to raise dispute with insufficient fee", async function () {
      const insufficientFee = ethers.utils.parseEther("0.005");
      
      await expect(
        invoiceManager.connect(recipient).raiseDispute(1, "Test reason", { value: insufficientFee })
      ).to.be.revertedWith("Insufficient dispute fee");
    });

    it("Should resolve dispute successfully", async function () {
      const disputeFee = await invoiceManager.disputeFee();
      
      await invoiceManager.connect(recipient).raiseDispute(1, "Test reason", { value: disputeFee });
      
      await expect(
        invoiceManager.connect(resolver).resolveDispute(1, 1) // Resolve as Paid
      ).to.emit(invoiceManager, "DisputeResolved")
        .withArgs(1, resolver.address, 1);

      const invoice = await invoiceManager.getInvoice(1);
      expect(invoice.status).to.equal(1); // Paid

      const dispute = await invoiceManager.getDispute(1);
      expect(dispute.status).to.equal(3); // Resolved
      expect(dispute.resolver).to.equal(resolver.address);
    });

    it("Should fail to resolve dispute if not authorized", async function () {
      const disputeFee = await invoiceManager.disputeFee();
      
      await invoiceManager.connect(recipient).raiseDispute(1, "Test reason", { value: disputeFee });
      
      await expect(
        invoiceManager.connect(issuer).resolveDispute(1, 1)
      ).to.be.revertedWith("Not authorized resolver");
    });
  });

  describe("Invoice Cancellation", function () {
    beforeEach(async function () {
      await invoiceManager.connect(issuer).createInvoice(
        testIPFSHash,
        recipient.address,
        invoiceAmount,
        ethers.constants.AddressZero,
        futureDate,
        testDescription
      );
    });

    it("Should cancel invoice successfully", async function () {
      await expect(
        invoiceManager.connect(issuer).cancelInvoice(1)
      ).to.emit(invoiceManager, "InvoiceCancelled")
        .withArgs(1, issuer.address);

      const invoice = await invoiceManager.getInvoice(1);
      expect(invoice.status).to.equal(4); // Cancelled
    });

    it("Should fail to cancel if not issuer", async function () {
      await expect(
        invoiceManager.connect(recipient).cancelInvoice(1)
      ).to.be.revertedWith("Only issuer can cancel");
    });

    it("Should fail to cancel paid invoice", async function () {
      await invoiceManager.connect(recipient).payInvoiceETH(1, { value: invoiceAmount });
      
      await expect(
        invoiceManager.connect(issuer).cancelInvoice(1)
      ).to.be.revertedWith("Cannot cancel this invoice");
    });
  });

  describe("Admin Functions", function () {
    it("Should update platform fee", async function () {
      await invoiceManager.updatePlatformFee(500); // 5%
      expect(await invoiceManager.platformFee()).to.equal(500);
    });

    it("Should fail to set platform fee too high", async function () {
      await expect(
        invoiceManager.updatePlatformFee(1500) // 15%
      ).to.be.revertedWith("Fee cannot exceed 10%");
    });

    it("Should update dispute fee", async function () {
      const newFee = ethers.utils.parseEther("0.02");
      await invoiceManager.updateDisputeFee(newFee);
      expect(await invoiceManager.disputeFee()).to.equal(newFee);
    });

    it("Should add and remove resolvers", async function () {
      const [, , , newResolver] = await ethers.getSigners();
      
      await invoiceManager.addResolver(newResolver.address);
      expect(await invoiceManager.authorizedResolvers(newResolver.address)).to.be.true;
      
      await invoiceManager.removeResolver(newResolver.address);
      expect(await invoiceManager.authorizedResolvers(newResolver.address)).to.be.false;
    });

    it("Should withdraw fees", async function () {
      // Create and pay an invoice to generate fees
      await invoiceManager.connect(issuer).createInvoice(
        testIPFSHash,
        recipient.address,
        invoiceAmount,
        ethers.constants.AddressZero,
        futureDate,
        testDescription
      );
      
      await invoiceManager.connect(recipient).payInvoiceETH(1, { value: invoiceAmount });
      
      const initialBalance = await ethers.provider.getBalance(owner.address);
      
      await invoiceManager.withdrawFees();
      
      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });
  });

  describe("Query Functions", function () {
    beforeEach(async function () {
      // Create multiple invoices for testing
      await invoiceManager.connect(issuer).createInvoice(
        testIPFSHash,
        recipient.address,
        invoiceAmount,
        ethers.constants.AddressZero,
        futureDate,
        "Invoice 1"
      );
      
      await invoiceManager.connect(issuer).createInvoice(
        testIPFSHash,
        recipient.address,
        invoiceAmount,
        ethers.constants.AddressZero,
        futureDate,
        "Invoice 2"
      );
      
      // Pay one invoice
      await invoiceManager.connect(recipient).payInvoiceETH(1, { value: invoiceAmount });
    });

    it("Should get user invoices", async function () {
      const issuerInvoices = await invoiceManager.getUserInvoices(issuer.address);
      expect(issuerInvoices.length).to.equal(2);
      expect(issuerInvoices[0]).to.equal(1);
      expect(issuerInvoices[1]).to.equal(2);
      
      const recipientInvoices = await invoiceManager.getUserInvoices(recipient.address);
      expect(recipientInvoices.length).to.equal(2);
    });

    it("Should get invoices by status", async function () {
      const createdInvoices = await invoiceManager.getInvoicesByStatus(0, 10, 0); // Created
      expect(createdInvoices.length).to.equal(1);
      expect(createdInvoices[0].id).to.equal(2);
      
      const paidInvoices = await invoiceManager.getInvoicesByStatus(1, 10, 0); // Paid
      expect(paidInvoices.length).to.equal(1);
      expect(paidInvoices[0].id).to.equal(1);
    });
  });
});

const prisma = require('../../db');

exports.getMyWallet = async (req, res) => {
    try {
        const wallet = await prisma.professionalProfile.findUnique({
            where:{userId: req.user.id},
            include: {walletTransactions: {
                orderBy:{createdAt: 'desc'}
            }}
        });

        if(!wallet){
            return res.status(404).json({message: 'Doctor not found'});
        }

        return res.status(200).json({
            walletBalance: wallet.walletBalance,
            isWalletBlocked: wallet.isWalletBlocked,
            transactions: wallet.walletTransactions
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({message: 'Error Fetching Wallet!'});
    }
};

exports.getProfessionalWalletByAdmin = async (req,res) => {
    try {
        const {professionalId} = req.params;
        const prof = await prisma.professionalProfile.findUnique({
            where:{id: professionalId},
            include: {
             user:true,
             walletTransactions:{
                orderBy:{createdAt: 'asc'}
             }   
            }
        });

        if(!prof){
            return res.status(404).json({message: "Professional Not Found!"});
        }

        return res.status(200).json({
            doctorName: prof.user.fullName,
            walletBalance: prof.walletBalance,
            transactions: prof.walletTransactions
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: 'Error Fetching Wallet!'});
    }
};

// Auto-check and block professionals who have a negative balance with unpaid debit > 30 days
// Or manual block by passing professionalId in body
exports.blockwallets = async (req, res) => {
    try {
        const { professionalId } = req.body;

        // If specific professionalId passed, manually block/toggle
        if (professionalId) {
            const updated = await prisma.professionalProfile.update({
                where: { id: professionalId },
                data: { isWalletBlocked: true },
                include: { user: true }
            });
            return res.status(200).json({ message: `Wallet for ${updated.user.fullName} blocked successfully!`, profile: updated });
        }

        // Automatic block: negative balance and an unsettled DEBIT older than 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const overdueProfessionals = await prisma.professionalProfile.findMany({
            where: {
                walletBalance: { lt: 0 },
                isWalletBlocked: false,
                walletTransactions: {
                    some: {
                        type: 'DEBIT',
                        createdAt: { lt: thirtyDaysAgo }
                    }
                }
            }
        });

        const blockedIds = overdueProfessionals.map(p => p.id);
        if (blockedIds.length > 0) {
            await prisma.professionalProfile.updateMany({
                where: { id: { in: blockedIds } },
                data: { isWalletBlocked: true }
            });
        }

        return res.status(200).json({
            message: `${blockedIds.length} overdue wallet(s) blocked successfully!`,
            blockedCount: blockedIds.length,
            blockedIds
        });
    } catch (error) {
        console.log("Error in blockwallets:", error);
        return res.status(500).json({ message: "Error blocking wallets!", error: error.message });
    }
};

// Admin unblock wallet once settled
exports.unblockWallet = async (req, res) => {
    try {
        const { professionalId } = req.body;
        if (!professionalId) {
            return res.status(400).json({ message: "professionalId is required" });
        }

        const updated = await prisma.professionalProfile.update({
            where: { id: professionalId },
            data: { isWalletBlocked: false },
            include: { user: true }
        });

        return res.status(200).json({
            message: `Wallet for ${updated.user.fullName} unblocked successfully!`,
            profile: updated
        });
    } catch (error) {
        console.log("Error unblocking wallet:", error);
        return res.status(500).json({ message: "Error unblocking wallet!", error: error.message });
    }
};

// Fetch all blocked wallets for Admin review
exports.findBlockedWallets = async (req, res) => {
    try {
        const blockedProfessionals = await prisma.professionalProfile.findMany({
            where: { isWalletBlocked: true },
            include: {
                user: {
                    select: { fullName: true, email: true, phone: true, role: true }
                },
                walletTransactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            }
        });

        const formatted = blockedProfessionals.map(p => ({
            id: p.id,
            fullName: p.user.fullName,
            email: p.user.email,
            phone: p.user.phone,
            role: p.user.role,
            walletBalance: p.walletBalance,
            isWalletBlocked: p.isWalletBlocked,
            recentTransactions: p.walletTransactions
        }));

        return res.status(200).json({
            count: formatted.length,
            blockedProfessionals: formatted
        });
    } catch (error) {
        console.log("Error in findBlockedWallets:", error);
        return res.status(500).json({ message: "Error fetching blocked wallets!", error: error.message });
    }
};

// Admin Master Financial Ledger: All transactions, all doctor balances, total commissions
exports.getAllFinancialLedger = async (req, res) => {
    try {
        const { type, paymentMethod } = req.query;

        const whereClause = {};
        if (type && type !== 'ALL') whereClause.type = type;
        if (paymentMethod && paymentMethod !== 'ALL') whereClause.paymentMethod = paymentMethod;

        // 1. Fetch line by line transactions across all professionals
        const transactions = await prisma.walletTransaction.findMany({
            where: whereClause,
            include: {
                professional: {
                    include: {
                        user: {
                            select: { fullName: true, email: true, role: true, phone: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        // 2. Fetch all professionals with their current wallet balances
        const professionals = await prisma.professionalProfile.findMany({
            include: {
                user: {
                    select: { fullName: true, email: true, role: true, phone: true }
                }
            },
            orderBy: { walletBalance: 'asc' } // Debtor/negative balances first
        });

        // 3. Calculate Platform Overview Totals
        const allTransactions = await prisma.walletTransaction.findMany();
        let totalCompanyCommission = 0;
        let totalDebitsDue = 0;
        let totalCreditsPayable = 0;

        allTransactions.forEach(tx => {
            totalCompanyCommission += Number(tx.commissionAmount || 0);
        });

        professionals.forEach(p => {
            const bal = Number(p.walletBalance || 0);
            if (bal < 0) {
                totalDebitsDue += Math.abs(bal);
            } else {
                totalCreditsPayable += bal;
            }
        });

        return res.status(200).json({
            summary: {
                totalCompanyCommission,
                totalDebitsDue, // Cash commissions owed to Company
                totalCreditsPayable, // Net earnings owed to Doctors from Card
                totalTransactionsCount: allTransactions.length,
                totalProfessionalsCount: professionals.length
            },
            professionals: professionals.map(p => ({
                id: p.id,
                name: p.user?.fullName || 'Professional',
                role: p.user?.role,
                phone: p.user?.phone,
                walletBalance: p.walletBalance || 0,
                isWalletBlocked: p.isWalletBlocked
            })),
            transactions: transactions.map(tx => ({
                id: tx.id,
                professionalId: tx.professionalId,
                doctorName: tx.professional?.user?.fullName || 'Doctor',
                doctorRole: tx.professional?.user?.role,
                amount: tx.amount,
                type: tx.type, // 'CREDIT' | 'DEBIT'
                paymentMethod: tx.paymentMethod, // 'CARD' | 'CASH'
                totalFee: tx.totalFee,
                commissionAmount: tx.commissionAmount,
                balanceAfter: tx.balanceAfter,
                description: tx.description,
                createdAt: tx.createdAt
            }))
        });
    } catch (error) {
        console.log("Error in getAllFinancialLedger:", error);
        return res.status(500).json({ message: "Error fetching financial ledger", error: error.message });
    }
};

// Initiate PayHere Payment for Doctor Due Settlement
exports.initiatePayHereSettlement = async (req, res) => {
    try {
        const crypto = require('crypto');
        const professional = await prisma.professionalProfile.findUnique({
            where: { userId: req.user.id },
            include: { user: true }
        });

        if (!professional) {
            return res.status(404).json({ message: "Professional profile not found." });
        }

        const currentBalance = Number(professional.walletBalance || 0);
        if (currentBalance >= 0) {
            return res.status(400).json({ message: "You have no outstanding commission dues to settle." });
        }

        const dueAmount = Math.abs(currentBalance);
        const orderId = `DUE-${professional.id.slice(0, 8)}-${Date.now()}`;
        const merchantId = process.env.PAYHERE_MERCHANT_ID || '1211149';
        const merchantSecret = process.env.PAYHERE_SECRET || '4T5A9b8c7d6e5f4a3b2c1d0e';
        const currency = 'LKR';

        // Format amount with 2 decimal places as required by PayHere
        const formattedAmount = dueAmount.toFixed(2);

        // PayHere Hash generation: uppercase(md5(merchant_id + order_id + amountFormatted + currency + uppercase(md5(merchant_secret))))
        const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
        const hashString = merchantId + orderId + formattedAmount + currency + hashedSecret;
        const hash = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();

        const isSandbox = (process.env.PAYHERE_MODE || 'sandbox').toLowerCase() === 'sandbox';

        return res.status(200).json({
            sandbox: isSandbox,
            merchant_id: merchantId,
            order_id: orderId,
            items: `Commission Due Settlement - Dr. ${professional.user.fullName}`,
            amount: formattedAmount,
            currency: currency,
            hash: hash,
            first_name: professional.user.fullName.split(' ')[0] || 'Doctor',
            last_name: professional.user.fullName.split(' ').slice(1).join(' ') || 'Professional',
            email: professional.user.email,
            phone: professional.user.phone || '0771234567',
            address: professional.address || 'Sri Lanka',
            city: 'Colombo',
            country: 'Sri Lanka',
            custom_1: professional.id, // Store professionalId for webhook verification
            custom_2: 'WALLET_SETTLEMENT'
        });
    } catch (error) {
        console.error("Error initiating PayHere settlement:", error);
        return res.status(500).json({ message: "Error initiating payment", error: error.message });
    }
};

// PayHere Server-to-Server IPN (Instant Payment Notification) Webhook
exports.handlePayHereNotify = async (req, res) => {
    try {
        const crypto = require('crypto');
        const {
            merchant_id,
            order_id,
            payhere_amount,
            payhere_currency,
            status_code,
            md5sig,
            custom_1,
            payment_id
        } = req.body;

        const merchantSecret = process.env.PAYHERE_SECRET || '4T5A9b8c7d6e5f4a3b2c1d0e';
        const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
        const checkHashString = merchant_id + order_id + payhere_amount + payhere_currency + status_code + hashedSecret;
        const localMd5sig = crypto.createHash('md5').update(checkHashString).digest('hex').toUpperCase();

        // 1. Verify payment authenticity
        if (localMd5sig !== md5sig) {
            console.error("PayHere IPN signature verification failed!");
            return res.status(400).send("Signature verification failed");
        }

        // status_code 2 means Success
        if (parseInt(status_code) === 2) {
            const professionalId = custom_1;
            const paidAmount = parseFloat(payhere_amount);

            if (professionalId) {
                // 1. Check if this order_id is ALREADY processed to prevent duplicate settlement
                const existingTx = await prisma.walletTransaction.findFirst({
                    where: {
                        professionalId: professionalId,
                        description: { contains: order_id }
                    }
                });

                if (existingTx) {
                    console.log(`Order ${order_id} already settled. Skipping duplicate.`);
                    return res.status(200).send("OK");
                }

                const professional = await prisma.professionalProfile.findUnique({
                    where: { id: professionalId }
                });

                if (professional) {
                    const currentBal = Number(professional.walletBalance || 0);
                    // Settle negative balance up to 0 or credit difference
                    const newBal = currentBal < 0 ? Math.min(0, currentBal + paidAmount) : currentBal;

                    await prisma.$transaction([
                        prisma.professionalProfile.update({
                            where: { id: professionalId },
                            data: {
                                walletBalance: newBal,
                                isWalletBlocked: false // Auto unblock on due settlement!
                            }
                        }),
                        prisma.walletTransaction.create({
                            data: {
                                professionalId: professionalId,
                                amount: paidAmount,
                                type: 'CREDIT',
                                paymentMethod: 'CARD',
                                totalFee: paidAmount,
                                commissionAmount: 0,
                                balanceAfter: newBal,
                                description: `Online Commission Due Settlement via PayHere (Order #${order_id}, Ref: ${payment_id || 'N/A'})`
                            }
                        })
                    ]);

                    console.log(`Successfully settled due of Rs. ${paidAmount} for Professional ID: ${professionalId}`);
                }
            }
        }

        return res.status(200).send("OK");
    } catch (error) {
        console.error("Error processing PayHere notify:", error);
        return res.status(500).send("Internal error");
    }
};

// Immediate client-side verification/fallback once PayHere completes
exports.verifyAndSettleDue = async (req, res) => {
    try {
        const { order_id, amount, payment_id } = req.body;
        const professional = await prisma.professionalProfile.findUnique({
            where: { userId: req.user.id },
            include: { user: true }
        });

        if (!professional) {
            return res.status(404).json({ message: "Professional profile not found." });
        }

        // 1. Check if this order_id was already settled by the webhook (IPN)
        if (order_id) {
            const alreadyProcessed = await prisma.walletTransaction.findFirst({
                where: {
                    professionalId: professional.id,
                    description: { contains: order_id }
                }
            });

            if (alreadyProcessed) {
                // Already settled via webhook, just return current zero/settled balance!
                return res.status(200).json({
                    message: "Wallet due already settled successfully!",
                    walletBalance: professional.walletBalance,
                    isWalletBlocked: professional.isWalletBlocked
                });
            }
        }

        const currentBal = Number(professional.walletBalance || 0);
        const settleAmount = parseFloat(amount) || Math.abs(currentBal);
        const newBal = currentBal < 0 ? Math.min(0, currentBal + settleAmount) : currentBal;

        const updated = await prisma.$transaction([
            prisma.professionalProfile.update({
                where: { id: professional.id },
                data: {
                    walletBalance: newBal,
                    isWalletBlocked: false
                }
            }),
            prisma.walletTransaction.create({
                data: {
                    professionalId: professional.id,
                    amount: settleAmount,
                    type: 'CREDIT',
                    paymentMethod: 'CARD',
                    totalFee: settleAmount,
                    commissionAmount: 0,
                    balanceAfter: newBal,
                    description: `PayHere Settlement Confirmed (Order #${order_id || 'DIRECT'}, Ref: ${payment_id || order_id})`
                }
            })
        ]);

        return res.status(200).json({
            message: "Wallet due settled and unblocked successfully!",
            walletBalance: newBal,
            isWalletBlocked: false
        });
    } catch (error) {
        console.error("Error verifying due settlement:", error);
        return res.status(500).json({ message: "Failed to settle wallet due", error: error.message });
    }
};


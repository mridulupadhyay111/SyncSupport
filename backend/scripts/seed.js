const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Chat = require('../models/Chat');
const KnowledgeBase = require('../models/KnowledgeBase');
const { generateEmbedding } = require('../services/aiService');

dotenv.config({ path: '../.env' });

async function seedDatabase() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/syncsupport';
  try {
    console.log('[Seed] Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);

    console.log('[Seed] Clearing existing data...');
    await User.deleteMany({});
    await Ticket.deleteMany({});
    await Chat.deleteMany({});
    await KnowledgeBase.deleteMany({});

    console.log('[Seed] Creating Support Staff Users...');
    const hashedPassword = await bcrypt.hash('SyncSupport2026!', 10);

    const admin = await User.create({
      name: 'Priya Sharma (Admin)',
      email: 'admin@syncsupport.io',
      password: hashedPassword,
      role: 'ADMIN',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120',
      status: 'ONLINE'
    });

    const agent1 = await User.create({
      name: 'Rohan Mehta (Senior Support Lead)',
      email: 'rohan@syncsupport.io',
      password: hashedPassword,
      role: 'AGENT',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120',
      status: 'ONLINE'
    });

    const agent2 = await User.create({
      name: 'Ananya Verma (Customer Care Executive)',
      email: 'ananya@syncsupport.io',
      password: hashedPassword,
      role: 'AGENT',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120',
      status: 'BUSY'
    });

    console.log('[Seed] Ingesting Indigenous Indian E-Commerce Knowledge Base Vector Chunks...');
    const indigenousEcommerceKBs = [
      {
        title: 'Delivery Timelines, Pincode Serviceability & Free Shipping Policy',
        category: 'Shipping & Delivery',
        contentChunk: 'We deliver to over 19,000+ pincodes across India in partnership with BlueDart, Delhivery, Xpressbees, and Shadowfax. Standard shipping takes 2-4 business days for metro cities (Bengaluru, Mumbai, Delhi-NCR, Hyderabad, Chennai, Kolkata, Pune) and 4-7 business days for Tier 2/3 cities, North-East, and J&K. Shipping is FREE on all orders above ₹499 (a nominal ₹49 delivery charge applies on orders below ₹499).'
      },
      {
        title: 'UPI, Cash on Delivery (COD), Credit/Debit Cards & NetBanking Payments',
        category: 'Payments & Billing',
        contentChunk: 'We support all indigenous Indian payment methods including UPI (Google Pay, PhonePe, Paytm, BHIM, Cred UPI), RuPay/Visa/Mastercard Credit & Debit cards, Net Banking across 50+ Indian banks, and No-Cost EMI on major credit cards. Cash on Delivery (COD) is available for orders up to ₹10,000 with a flat ₹49 COD handling fee.'
      },
      {
        title: '7-Day Easy Replacement, Returns & Instant UPI Refund Policy',
        category: 'Returns & Refunds',
        contentChunk: 'We offer a 7-day hassle-free doorstep replacement and return policy from the date of delivery. Reverse pickup is conducted right from your doorstep by our courier partner within 24-48 hours. Once the product passes Quality Check (QC) at pickup or warehouse, refunds are credited instantly via UPI (VPA) or IMPS bank transfer within 2 to 24 hours.'
      },
      {
        title: 'Order Tracking, AWB Tracking & Delivery SMS Updates',
        category: 'Order Status',
        contentChunk: 'Once your order is dispatched, an AWB tracking number with live tracking link is sent via WhatsApp, SMS, and Email. You can also track your shipment live by visiting "My Account -> Orders -> Track Package". Real-time OTP verification is required during final package delivery for high-value orders.'
      },
      {
        title: 'GST Tax Invoice & B2B Business Purchase Input Tax Credit (ITC)',
        category: 'GST & Invoicing',
        contentChunk: 'Business customers can claim Input Tax Credit (ITC) by entering their 15-digit GSTIN number and registered company name during checkout. An official GST Invoice with complete HSN/SAC code breakdown will be included in the shipment box and available for download under "My Orders -> Download GST Invoice".'
      },
      {
        title: 'Order Cancellations & Instant Refund SLA',
        category: 'Order Modifications',
        contentChunk: 'You can cancel your order for free anytime before it is dispatched by going to "My Orders -> Cancel Order". For prepaid UPI or card orders, the refund is initiated immediately and reflects in your original payment account within 2 hours. Once dispatched, orders cannot be canceled in-transit but can be refused at delivery or returned after delivery.'
      },
      {
        title: 'Damaged, Defective, or Wrong Item (Unboxing Video Guidelines)',
        category: 'Returns & Refunds',
        contentChunk: 'If you receive a damaged, tampered, or wrong item, please report it within 48 hours via "My Orders -> Report Issue" or live chat. For high-value electronics, providing a short unboxing video helps us expedite your free replacement or 100% refund immediately without waiting for return inspection.'
      },
      {
        title: 'Festive Offers, Bank Discounts & Coupon Redemption',
        category: 'Promotions & Offers',
        contentChunk: 'During Diwali, Independence Day, and Great Indian Festival sales, extra 10% instant discounts apply automatically at checkout when paying with participating HDFC, ICICI, or SBI bank cards. Coupon codes can be entered in the "Apply Coupon" box on the cart page (one coupon per order).'
      },
      {
        title: 'Brand Authenticity & Official Manufacturer Warranty in India',
        category: 'Product Authenticity',
        contentChunk: 'All electronics, smartphones, and appliances sold on our platform are 100% authentic Indian retail units with original brand warranty. You can claim warranty service directly at any authorized service center across India (Samsung, boAt, Noise, Realme, Philips, etc.) by presenting your official GST Tax Invoice.'
      },
      {
        title: 'Customer Support Hours, WhatsApp Support & Escalation SLA',
        category: 'Customer Service',
        contentChunk: 'Our AI Support Agent is available 24/7 in English and Hindi. Live human support executives are available Monday to Sunday from 9:00 AM to 9:00 PM IST. If the AI agent cannot resolve your query, your chat is transferred instantly to an Indian support executive with a guaranteed 3-minute wait time SLA.'
      }
    ];

    for (const kb of indigenousEcommerceKBs) {
      const embedding = await generateEmbedding(kb.contentChunk);
      await KnowledgeBase.create({
        title: kb.title,
        category: kb.category,
        contentChunk: kb.contentChunk,
        embedding: embedding
      });
    }

    console.log('[Seed] Creating Indigenous Indian Support Tickets & Chat Histories...');
    const ticket1 = await Ticket.create({
      ticketNumber: 'IND-884920',
      customerName: 'Aarav Patel',
      customerEmail: 'aarav.patel@gmail.com',
      status: 'PENDING_AGENT',
      assignedAgent: agent1._id,
      sentiment: 'Frustrated',
      summary: ''
    });

    await Chat.create([
      {
        ticketId: ticket1._id,
        sender: 'CUSTOMER',
        senderName: 'Aarav Patel',
        message: 'Namaste! I ordered a boAt Smartwatch order #IND-5591 via Cash on Delivery to Ahmedabad, but I want to pay via UPI scanner at delivery. Is that possible?',
        timestamp: new Date(Date.now() - 1000 * 60 * 25)
      },
      {
        ticketId: ticket1._id,
        sender: 'BOT',
        senderName: 'SyncSupport AI Agent',
        message: 'Namaste Aarav! Yes, our delivery partners (BlueDart/Delhivery) carry QR codes on their delivery POS devices so you can pay via Google Pay, PhonePe, or Paytm at delivery.',
        timestamp: new Date(Date.now() - 1000 * 60 * 22)
      },
      {
        ticketId: ticket1._id,
        sender: 'CUSTOMER',
        senderName: 'Aarav Patel',
        message: 'Also the delivery address has a small typo in the Society name (Vastrapur instead of Satellite). Please connect me to a human agent to update the delivery address!',
        timestamp: new Date(Date.now() - 1000 * 60 * 15)
      }
    ]);

    const ticket2 = await Ticket.create({
      ticketNumber: 'IND-339102',
      customerName: 'Kavita Reddy',
      customerEmail: 'kavita.reddy@hyderabadtech.io',
      status: 'IN_PROGRESS',
      assignedAgent: agent1._id,
      sentiment: 'Neutral',
      summary: ''
    });

    await Chat.create([
      {
        ticketId: ticket2._id,
        sender: 'CUSTOMER',
        senderName: 'Kavita Reddy',
        message: 'Hi, I need the B2B GST tax invoice for my order #IND-9912 so our company can claim GST Input Tax Credit.',
        timestamp: new Date(Date.now() - 1000 * 60 * 45)
      },
      {
        ticketId: ticket2._id,
        sender: 'AGENT',
        senderName: 'Rohan Mehta',
        message: 'Namaste Kavita! I have generated your GST tax invoice with your company GSTIN and sent it directly to your email. You can also download it under My Orders -> GST Invoice.',
        timestamp: new Date(Date.now() - 1000 * 60 * 30)
      }
    ]);

    const ticket3 = await Ticket.create({
      ticketNumber: 'IND-110482',
      customerName: 'Siddharth Iyer',
      customerEmail: 'siddharth@bengaluru.co',
      status: 'RESOLVED',
      assignedAgent: agent2._id,
      sentiment: 'Satisfied',
      summary: 'Customer asked about free delivery threshold for Bengaluru delivery. Confirmed orders above ₹499 qualify for free shipping.'
    });

    await Chat.create([
      {
        ticketId: ticket3._id,
        sender: 'CUSTOMER',
        senderName: 'Siddharth Iyer',
        message: 'Is delivery free for ₹650 cart value in Bengaluru?',
        timestamp: new Date(Date.now() - 1000 * 60 * 120)
      },
      {
        ticketId: ticket3._id,
        sender: 'BOT',
        senderName: 'SyncSupport AI Agent',
        message: 'Yes! Delivery is completely FREE on all orders above ₹499 across Bengaluru and pan-India.',
        timestamp: new Date(Date.now() - 1000 * 60 * 115)
      },
      {
        ticketId: ticket3._id,
        sender: 'CUSTOMER',
        senderName: 'Siddharth Iyer',
        message: 'Thank you! Placed the order using PhonePe UPI.',
        timestamp: new Date(Date.now() - 1000 * 60 * 90)
      }
    ]);

    console.log('\n======================================================');
    console.log('  Indigenous Indian E-Commerce Knowledge Base Seeded!');
    console.log('  Database: MongoDB Atlas (syncsupport)');
    console.log('  Total Indigenous Vector Chunks: ' + indigenousEcommerceKBs.length);
    console.log('  Support Admin: admin@syncsupport.io  (Pass: SyncSupport2026!)');
    console.log('  Support Agent: rohan@syncsupport.io  (Pass: SyncSupport2026!)');
    console.log('======================================================\n');
  } catch (err) {
    console.error('[Seed Error]', err);
  } finally {
    await mongoose.disconnect();
  }
}

seedDatabase();

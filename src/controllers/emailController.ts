import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import emailService, { EmailService, EmailTemplate } from "../services/emailService";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

// Send low stock alert email
export const sendLowStockAlert = async (req: Request, res: Response): Promise<any> => {
  try {
    const { productId, shopId, currentStock, minStock } = req.body;

    // Get product and shop details
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true, sku: true }
    });

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { name: true, managerId: true }
    });

    if (!product || !shop) {
      return res.status(404).json({ error: "Product or shop not found" });
    }

    // Get shop manager email
    if (!shop.managerId) {
      return res.status(404).json({ error: "Shop manager not assigned" });
    }
    
    const manager = await prisma.user.findUnique({
      where: { publicId: shop.managerId },
      select: { email: true, name: true }
    });

    if (!manager || !manager.email) {
      return res.status(404).json({ error: "Shop manager not found or email not available" });
    }

    const templates = EmailService.getTemplates();
    const template = templates.lowStockAlert;

    const data = {
      productName: product.name,
      shopName: shop.name,
      currentStock: currentStock.toString(),
      minStock: minStock.toString(),
      deficit: (minStock - currentStock).toString(),
      alertTime: new Date().toLocaleString()
    };

    const success = await emailService.sendTemplateEmail(
      manager.email,
      template,
      data
    );

    if (success) {
      logger.info(`Low stock alert email sent to ${manager.email} for product ${product.name}`);
      res.status(200).json({ message: "Low stock alert email sent successfully" });
    } else {
      res.status(500).json({ error: "Failed to send low stock alert email" });
    }
  } catch (error) {
    logger.error("Error sending low stock alert email:", error);
    res.status(500).json({ error: "Failed to send low stock alert email" });
  }
};

// Send employee created email
export const sendEmployeeCreatedEmail = async (req: Request, res: Response): Promise<any> => {
  try {
    const { employeeId, password } = req.body;

    const employee = await prisma.user.findUnique({
      where: { publicId: employeeId },
      include: {
        Role: { select: { name: true } },
        managedShops: { select: { name: true } }
      }
    });

    if (!employee || !employee.email) {
      return res.status(404).json({ error: "Employee not found or email not available" });
    }

    const templates = EmailService.getTemplates();
    const template = templates.employeeCreated;

    const data = {
      employeeName: employee.name,
      email: employee.email,
      password: password,
      role: employee.Role?.name || 'Employee',
      shopName: employee.managedShops?.[0]?.name || 'No Shop Assigned',
      loginUrl: `${process.env.FRONTEND_ORIGIN}/login`
    };

    const success = await emailService.sendTemplateEmail(
      employee.email,
      template,
      data
    );

    if (success) {
      logger.info(`Employee created email sent to ${employee.email}`);
      res.status(200).json({ message: "Employee created email sent successfully" });
    } else {
      res.status(500).json({ error: "Failed to send employee created email" });
    }
  } catch (error) {
    logger.error("Error sending employee created email:", error);
    res.status(500).json({ error: "Failed to send employee created email" });
  }
};

// Send restock request email
export const sendRestockRequestEmail = async (req: Request, res: Response): Promise<any> => {
  try {
    const { requestId } = req.body;

    const request = await prisma.restockRequest.findUnique({
      where: { id: requestId },
      include: {
        shop: { select: { name: true } },
        product: { select: { name: true } }
      }
    });

    if (!request) {
      return res.status(404).json({ error: "Restock request not found" });
    }

    // Get admin emails
    const admins = await prisma.user.findMany({
      where: {
        Role: { name: 'Admin' }
      },
      select: { email: true }
    });

    if (admins.length === 0) {
      return res.status(404).json({ error: "No admin users found" });
    }

    const templates = EmailService.getTemplates();
    const template = templates.restockRequest;

    const data = {
      shopName: request.shop.name,
      requestedBy: 'System User', // Since we can't get user info from the include
      requestDate: request.createdAt.toLocaleString(),
      priority: 'Normal', // Default priority since it's not in the schema
      items: [{
        productName: request.product.name,
        quantity: request.requestedAmount
      }],
      notes: request.notes || 'No additional notes',
      approvalUrl: `${process.env.FRONTEND_ORIGIN}/restock-requests/${requestId}`
    };

    const adminEmails = admins.map(admin => admin.email).filter(email => email !== null) as string[];
    const success = await emailService.sendTemplateEmail(
      adminEmails,
      template,
      data
    );

    if (success) {
      logger.info(`Restock request email sent to admins for request ${requestId}`);
      res.status(200).json({ message: "Restock request email sent successfully" });
    } else {
      res.status(500).json({ error: "Failed to send restock request email" });
    }
  } catch (error) {
    logger.error("Error sending restock request email:", error);
    res.status(500).json({ error: "Failed to send restock request email" });
  }
};

// Send invoice generated email
export const sendInvoiceGeneratedEmail = async (req: Request, res: Response): Promise<any> => {
  try {
    const { invoiceId, customerEmail } = req.body;

    const invoice = await prisma.billing.findUnique({
      where: { id: invoiceId },
      include: {
        shop: { select: { name: true } }
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const templates = EmailService.getTemplates();
    const template = templates.invoiceGenerated;

    const data = {
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      shopName: invoice.shop?.name || 'Factory Invoice',
      invoiceDate: invoice.createdAt.toLocaleDateString(),
      totalAmount: invoice.total.toFixed(2),
      invoiceUrl: `${process.env.FRONTEND_ORIGIN}/invoices/${invoiceId}`
    };

    const success = await emailService.sendTemplateEmail(
      customerEmail,
      template,
      data
    );

    if (success) {
      logger.info(`Invoice generated email sent to ${customerEmail}`);
      res.status(200).json({ message: "Invoice generated email sent successfully" });
    } else {
      res.status(500).json({ error: "Failed to send invoice generated email" });
    }
  } catch (error) {
    logger.error("Error sending invoice generated email:", error);
    res.status(500).json({ error: "Failed to send invoice generated email" });
  }
};

// Send system notification email
export const sendSystemNotificationEmail = async (req: Request, res: Response): Promise<any> => {
  try {
    const { title, message, recipients, actionUrl } = req.body;

    if (!title || !message || !recipients || recipients.length === 0) {
      return res.status(400).json({ 
        error: "Title, message, and recipients are required" 
      });
    }

    const templates = EmailService.getTemplates();
    const template = templates.systemNotification;

    const data = {
      title,
      message,
      timestamp: new Date().toLocaleString(),
      actionUrl: actionUrl || ''
    };

    const success = await emailService.sendTemplateEmail(
      recipients,
      template,
      data
    );

    if (success) {
      logger.info(`System notification email sent to ${recipients.length} recipients`);
      res.status(200).json({ message: "System notification email sent successfully" });
    } else {
      res.status(500).json({ error: "Failed to send system notification email" });
    }
  } catch (error) {
    logger.error("Error sending system notification email:", error);
    res.status(500).json({ error: "Failed to send system notification email" });
  }
};

// Test email configuration
export const testEmailConfiguration = async (req: Request, res: Response): Promise<any> => {
  try {
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({ error: "Test email address is required" });
    }

    const success = await emailService.sendEmail({
      to: testEmail,
      subject: "Test Email from Bliss Ice Cream Management System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #4ecdc4; color: white; padding: 20px; text-align: center;">
            <h1>✅ Email Configuration Test</h1>
          </div>
          <div style="padding: 20px; background: #f8f9fa;">
            <p>This is a test email to verify that the email configuration is working correctly.</p>
            <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
            <p>If you received this email, the email service is configured properly!</p>
          </div>
          <div style="background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>This email was sent from Bliss Ice Cream Management System</p>
          </div>
        </div>
      `,
      text: `
        Email Configuration Test
        
        This is a test email to verify that the email configuration is working correctly.
        
        Test Time: ${new Date().toLocaleString()}
        
        If you received this email, the email service is configured properly!
        
        This email was sent from Bliss Ice Cream Management System.
      `
    });

    if (success) {
      logger.info(`Test email sent to ${testEmail}`);
      res.status(200).json({ message: "Test email sent successfully" });
    } else {
      res.status(500).json({ error: "Failed to send test email" });
    }
  } catch (error) {
    logger.error("Error sending test email:", error);
    res.status(500).json({ error: "Failed to send test email" });
  }
};

// Get email templates
export const getEmailTemplates = async (req: Request, res: Response): Promise<any> => {
  try {
    const templates = EmailService.getTemplates();
    res.status(200).json(templates);
  } catch (error) {
    logger.error("Error getting email templates:", error);
    res.status(500).json({ error: "Failed to get email templates" });
  }
};

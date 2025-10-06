"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer = require('nodemailer');
const logger_1 = require("../utils/logger");
class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    // Test email configuration
    async testConnection() {
        try {
            await this.transporter.verify();
            logger_1.logger.info('Email service connection verified');
            return true;
        }
        catch (error) {
            logger_1.logger.error('Email service connection failed:', error);
            return false;
        }
    }
    // Send email
    async sendEmail(options) {
        try {
            const mailOptions = {
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
                subject: options.subject,
                text: options.text,
                html: options.html,
                attachments: options.attachments,
            };
            const result = await this.transporter.sendMail(mailOptions);
            logger_1.logger.info('Email sent successfully:', result.messageId);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to send email:', error);
            return false;
        }
    }
    // Send email with template
    async sendTemplateEmail(to, template, data) {
        try {
            let html = template.html;
            let text = template.text;
            let subject = template.subject;
            // Replace placeholders with data
            if (data) {
                Object.keys(data).forEach(key => {
                    const placeholder = `{{${key}}}`;
                    html = html.replace(new RegExp(placeholder, 'g'), data[key]);
                    text = text.replace(new RegExp(placeholder, 'g'), data[key]);
                    subject = subject.replace(new RegExp(placeholder, 'g'), data[key]);
                });
            }
            return await this.sendEmail({
                to,
                subject,
                html,
                text,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to send template email:', error);
            return false;
        }
    }
    // Email templates
    static getTemplates() {
        return {
            // Low stock alert template
            lowStockAlert: {
                subject: '🚨 Low Stock Alert - {{productName}}',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #ff6b6b; color: white; padding: 20px; text-align: center;">
              <h1>🚨 Low Stock Alert</h1>
            </div>
            <div style="padding: 20px; background: #f8f9fa;">
              <h2>Product: {{productName}}</h2>
              <p><strong>Shop:</strong> {{shopName}}</p>
              <p><strong>Current Stock:</strong> {{currentStock}} units</p>
              <p><strong>Minimum Stock:</strong> {{minStock}} units</p>
              <p><strong>Deficit:</strong> {{deficit}} units</p>
              <p><strong>Alert Time:</strong> {{alertTime}}</p>
              <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px;">
                <p><strong>Action Required:</strong> Please restock this product immediately to avoid stockouts.</p>
              </div>
            </div>
            <div style="background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px;">
              <p>This is an automated alert from Bliss Ice Cream Management System</p>
            </div>
          </div>
        `,
                text: `
          Low Stock Alert
          
          Product: {{productName}}
          Shop: {{shopName}}
          Current Stock: {{currentStock}} units
          Minimum Stock: {{minStock}} units
          Deficit: {{deficit}} units
          Alert Time: {{alertTime}}
          
          Action Required: Please restock this product immediately to avoid stockouts.
          
          This is an automated alert from Bliss Ice Cream Management System.
        `
            },
            // Employee created template
            employeeCreated: {
                subject: '👋 Welcome to Bliss Ice Cream - {{employeeName}}',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #4ecdc4; color: white; padding: 20px; text-align: center;">
              <h1>🎉 Welcome to Bliss Ice Cream!</h1>
            </div>
            <div style="padding: 20px; background: #f8f9fa;">
              <h2>Hello {{employeeName}}!</h2>
              <p>Your account has been created successfully. Here are your login details:</p>
              <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p><strong>Email:</strong> {{email}}</p>
                <p><strong>Password:</strong> {{password}}</p>
                <p><strong>Role:</strong> {{role}}</p>
                <p><strong>Assigned Shop:</strong> {{shopName}}</p>
              </div>
              <p>Please log in and change your password for security reasons.</p>
              <div style="text-align: center; margin: 20px 0;">
                <a href="{{loginUrl}}" style="background: #4ecdc4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Login Now</a>
              </div>
            </div>
            <div style="background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px;">
              <p>This email was sent from Bliss Ice Cream Management System</p>
            </div>
          </div>
        `,
                text: `
          Welcome to Bliss Ice Cream!
          
          Hello {{employeeName}}!
          
          Your account has been created successfully. Here are your login details:
          
          Email: {{email}}
          Password: {{password}}
          Role: {{role}}
          Assigned Shop: {{shopName}}
          
          Please log in and change your password for security reasons.
          
          Login URL: {{loginUrl}}
          
          This email was sent from Bliss Ice Cream Management System.
        `
            },
            // Restock request template
            restockRequest: {
                subject: '📦 Restock Request - {{shopName}}',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #ffa726; color: white; padding: 20px; text-align: center;">
              <h1>📦 Restock Request</h1>
            </div>
            <div style="padding: 20px; background: #f8f9fa;">
              <h2>Shop: {{shopName}}</h2>
              <p><strong>Requested by:</strong> {{requestedBy}}</p>
              <p><strong>Request Date:</strong> {{requestDate}}</p>
              <p><strong>Priority:</strong> {{priority}}</p>
              <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <h3>Requested Items:</h3>
                <ul>
                  {{#each items}}
                  <li><strong>{{productName}}</strong> - Quantity: {{quantity}}</li>
                  {{/each}}
                </ul>
              </div>
              <p><strong>Notes:</strong> {{notes}}</p>
              <div style="text-align: center; margin: 20px 0;">
                <a href="{{approvalUrl}}" style="background: #ffa726; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Request</a>
              </div>
            </div>
            <div style="background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px;">
              <p>This email was sent from Bliss Ice Cream Management System</p>
            </div>
          </div>
        `,
                text: `
          Restock Request
          
          Shop: {{shopName}}
          Requested by: {{requestedBy}}
          Request Date: {{requestDate}}
          Priority: {{priority}}
          
          Requested Items:
          {{#each items}}
          - {{productName}} - Quantity: {{quantity}}
          {{/each}}
          
          Notes: {{notes}}
          
          Review URL: {{approvalUrl}}
          
          This email was sent from Bliss Ice Cream Management System.
        `
            },
            // Invoice generated template
            invoiceGenerated: {
                subject: '🧾 Invoice Generated - #{{invoiceNumber}}',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #66bb6a; color: white; padding: 20px; text-align: center;">
              <h1>🧾 Invoice Generated</h1>
            </div>
            <div style="padding: 20px; background: #f8f9fa;">
              <h2>Invoice #{{invoiceNumber}}</h2>
              <p><strong>Customer:</strong> {{customerName}}</p>
              <p><strong>Shop:</strong> {{shopName}}</p>
              <p><strong>Date:</strong> {{invoiceDate}}</p>
              <p><strong>Total Amount:</strong> ₹{{totalAmount}}</p>
              <div style="text-align: center; margin: 20px 0;">
                <a href="{{invoiceUrl}}" style="background: #66bb6a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View Invoice</a>
              </div>
            </div>
            <div style="background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px;">
              <p>This email was sent from Bliss Ice Cream Management System</p>
            </div>
          </div>
        `,
                text: `
          Invoice Generated
          
          Invoice #{{invoiceNumber}}
          Customer: {{customerName}}
          Shop: {{shopName}}
          Date: {{invoiceDate}}
          Total Amount: ₹{{totalAmount}}
          
          View Invoice: {{invoiceUrl}}
          
          This email was sent from Bliss Ice Cream Management System.
        `
            },
            // System notification template
            systemNotification: {
                subject: '🔔 System Notification - {{title}}',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #9c27b0; color: white; padding: 20px; text-align: center;">
              <h1>🔔 System Notification</h1>
            </div>
            <div style="padding: 20px; background: #f8f9fa;">
              <h2>{{title}}</h2>
              <p>{{message}}</p>
              <p><strong>Time:</strong> {{timestamp}}</p>
              {{#if actionUrl}}
              <div style="text-align: center; margin: 20px 0;">
                <a href="{{actionUrl}}" style="background: #9c27b0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Take Action</a>
              </div>
              {{/if}}
            </div>
            <div style="background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px;">
              <p>This email was sent from Bliss Ice Cream Management System</p>
            </div>
          </div>
        `,
                text: `
          System Notification
          
          {{title}}
          
          {{message}}
          
          Time: {{timestamp}}
          
          {{#if actionUrl}}
          Take Action: {{actionUrl}}
          {{/if}}
          
          This email was sent from Bliss Ice Cream Management System.
        `
            }
        };
    }
}
exports.EmailService = EmailService;
// Create singleton instance
const emailService = new EmailService();
exports.default = emailService;

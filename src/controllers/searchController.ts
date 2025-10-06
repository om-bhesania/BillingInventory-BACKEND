import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

interface SearchResult {
  type: string;
  id: string;
  title: string;
  description: string;
  url: string;
  relevanceScore: number;
  metadata?: Record<string, any>;
}

interface SearchOptions {
  query: string;
  modules?: string[];
  limit?: number;
  offset?: number;
  includeInactive?: boolean;
}

export const globalSearch = async (req: Request, res: Response): Promise<any> => {
  try {
    const { 
      query, 
      modules = [], 
      limit = 20, 
      offset = 0, 
      includeInactive = false 
    }: SearchOptions = req.query as any;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        error: "Search query must be at least 2 characters long" 
      });
    }

    const userPublicId = (req as any).user?.publicId;
    if (!userPublicId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get user permissions
    const user = await prisma.user.findUnique({
      where: { publicId: userPublicId },
      include: { Role: true }
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const isAdmin = user.Role?.name === 'Admin';
    const searchTerm = query.trim().toLowerCase();
    const results: SearchResult[] = [];

    // Search Products
    if (modules.length === 0 || modules.includes('products')) {
      const products = await searchProducts(searchTerm, isAdmin, includeInactive);
      results.push(...products);
    }

    // Search Shops
    if (modules.length === 0 || modules.includes('shops')) {
      const shops = await searchShops(searchTerm, userPublicId, isAdmin, includeInactive);
      results.push(...shops);
    }

    // Search Employees
    if (modules.length === 0 || modules.includes('employees')) {
      const employees = await searchEmployees(searchTerm, userPublicId, isAdmin, includeInactive);
      results.push(...employees);
    }

    // Search Inventory
    if (modules.length === 0 || modules.includes('inventory')) {
      const inventory = await searchInventory(searchTerm, userPublicId, isAdmin, includeInactive);
      results.push(...inventory);
    }

    // Search Billing/Invoices
    if (modules.length === 0 || modules.includes('billing')) {
      const billing = await searchBilling(searchTerm, userPublicId, isAdmin, includeInactive);
      results.push(...billing);
    }

    // Search Restock Requests
    if (modules.length === 0 || modules.includes('restock')) {
      const restockRequests = await searchRestockRequests(searchTerm, userPublicId, isAdmin, includeInactive);
      results.push(...restockRequests);
    }

    // Search Categories
    if (modules.length === 0 || modules.includes('categories')) {
      const categories = await searchCategories(searchTerm, includeInactive);
      results.push(...categories);
    }

    // Search Flavors
    if (modules.length === 0 || modules.includes('flavors')) {
      const flavors = await searchFlavors(searchTerm, includeInactive);
      results.push(...flavors);
    }

    // Sort by relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Apply pagination
    const paginatedResults = results.slice(offset, offset + limit);

    // Group results by type
    const groupedResults = paginatedResults.reduce((acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    }, {} as Record<string, SearchResult[]>);

    res.status(200).json({
      query: searchTerm,
      totalResults: results.length,
      results: paginatedResults,
      groupedResults,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < results.length
      }
    });

  } catch (error) {
    logger.error("Error in global search:", error);
    res.status(500).json({ error: "Failed to perform search" });
  }
};

// Search Products
async function searchProducts(query: string, isAdmin: boolean, includeInactive: boolean): Promise<SearchResult[]> {
  const whereClause: any = {
    OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { sku: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } }
    ]
  };

  if (!includeInactive) {
    whereClause.isActive = true;
  }

  const products = await prisma.product.findMany({
    where: whereClause,
    include: {
      category: { select: { name: true } },
      flavor: { select: { name: true } }
    },
    take: 10
  });

  return products.map(product => ({
    type: 'product',
    id: product.id,
    title: product.name,
    description: `${product.sku} • ${product.category?.name || 'No Category'} • ${product.flavor?.name || 'No Flavor'}`,
    url: `/inventory/products/${product.id}`,
    relevanceScore: calculateRelevanceScore(query, [
      product.name,
      product.sku,
      product.description || ''
    ]),
    metadata: {
      sku: product.sku,
      category: product.category?.name,
      flavor: product.flavor?.name,
      unitPrice: product.unitPrice,
      totalStock: product.totalStock
    }
  }));
}

// Search Shops
async function searchShops(query: string, userPublicId: string, isAdmin: boolean, includeInactive: boolean): Promise<SearchResult[]> {
  let whereClause: any = {
    OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { address: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
      { contactNumber: { contains: query, mode: 'insensitive' } }
    ]
  };

  if (!includeInactive) {
    whereClause.isActive = true;
  }

  // If not admin, only search shops they manage
  if (!isAdmin) {
    whereClause.managerId = userPublicId;
  }

  const shops = await prisma.shop.findMany({
    where: whereClause,
    include: {
      manager: { select: { name: true, email: true } },
      _count: { select: { inventory: true, restockRequests: true } }
    },
    take: 10
  });

  return shops.map(shop => ({
    type: 'shop',
    id: shop.id,
    title: shop.name,
    description: `${shop.address || 'No Address'} • ${shop.contactNumber || 'No Contact'} • Manager: ${shop.manager?.name || 'No Manager'}`,
    url: `/shops/${shop.id}`,
    relevanceScore: calculateRelevanceScore(query, [
      shop.name,
      shop.address || '',
      shop.email || '',
      shop.contactNumber || ''
    ]),
    metadata: {
      address: shop.address || '',
      email: shop.email || '',
      contactNumber: shop.contactNumber || '',
      manager: shop.manager?.name,
      inventoryCount: shop._count.inventory,
      restockRequestCount: shop._count.restockRequests
    }
  }));
}

// Search Employees
async function searchEmployees(query: string, userPublicId: string, isAdmin: boolean, includeInactive: boolean): Promise<SearchResult[]> {
  let whereClause: any = {
    id: { not: userPublicId }, // Exclude current user
    OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
      { contact: { contains: query, mode: 'insensitive' } }
    ]
  };

  if (!includeInactive) {
    whereClause.role = 'active';
  }

  // If not admin, only search employees in their shops
  if (!isAdmin) {
    const managedShops = await prisma.shop.findMany({
      where: { managerId: userPublicId },
      select: { id: true }
    });
    
    const shopIds = managedShops.map(shop => shop.id);
    whereClause.OR = [
      ...whereClause.OR,
      { managedShops: { some: { id: { in: shopIds } } } }
    ];
  }

  const employees = await prisma.user.findMany({
    where: whereClause,
    include: {
      Role: { select: { name: true } },
      managedShops: { select: { name: true } }
    },
    take: 10
  });

  return employees.map(employee => ({
    type: 'employee',
    id: employee.publicId,
    title: employee.name || 'Unknown Employee',
    description: `${employee.email || 'No Email'} • ${employee.Role?.name || 'No Role'} • ${employee.managedShops?.[0]?.name || 'No Shop'}`,
    url: `/employees/${employee.publicId}`,
    relevanceScore: calculateRelevanceScore(query, [
      employee.name || '',
      employee.email || '',
      employee.contact || ''
    ]),
    metadata: {
      email: employee.email || '',
      contact: employee.contact || '',
      role: employee.Role?.name,
      shop: employee.managedShops?.[0]?.name
    }
  }));
}

// Search Inventory
async function searchInventory(query: string, userPublicId: string, isAdmin: boolean, includeInactive: boolean): Promise<SearchResult[]> {
  let whereClause: any = {
    OR: [
      { product: { name: { contains: query, mode: 'insensitive' } } },
      { product: { sku: { contains: query, mode: 'insensitive' } } }
    ]
  };

  // If not admin, only search their shops
  if (!isAdmin) {
    const managedShops = await prisma.shop.findMany({
      where: { managerId: userPublicId },
      select: { id: true }
    });
    
    const shopIds = managedShops.map(shop => shop.id);
    whereClause.shopId = { in: shopIds };
  }

  const inventory = await prisma.shopInventory.findMany({
    where: whereClause,
    include: {
      product: { 
        select: { 
          name: true, 
          sku: true,
          category: { select: { name: true } }
        } 
      },
      shop: { select: { name: true } }
    },
    take: 10
  });

  return inventory.map(item => ({
    type: 'inventory',
    id: item.id,
    title: `${item.product.name} in ${item.shop.name}`,
    description: `${item.product.sku} • Stock: ${item.currentStock} • Category: ${item.product.category?.name || 'No Category'}`,
    url: `/shop-inventory/${item.id}`,
    relevanceScore: calculateRelevanceScore(query, [
      item.product.name,
      item.product.sku,
      item.shop.name
    ]),
    metadata: {
      productSku: item.product.sku,
      shopName: item.shop.name,
      currentStock: item.currentStock,
      category: item.product.category?.name
    }
  }));
}

// Search Billing/Invoices
async function searchBilling(query: string, userPublicId: string, isAdmin: boolean, includeInactive: boolean): Promise<SearchResult[]> {
  let whereClause: any = {
    OR: [
      { invoiceNumber: { contains: query, mode: 'insensitive' } },
      { customerName: { contains: query, mode: 'insensitive' } },
      { customerEmail: { contains: query, mode: 'insensitive' } }
    ]
  };

  // If not admin, only search their shops
  if (!isAdmin) {
    const managedShops = await prisma.shop.findMany({
      where: { managerId: userPublicId },
      select: { id: true }
    });
    
    const shopIds = managedShops.map(shop => shop.id);
    whereClause.shopId = { in: shopIds };
  }

  const billing = await prisma.billing.findMany({
    where: whereClause,
    include: {
      shop: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  return billing.map(bill => ({
    type: 'billing',
    id: bill.id,
    title: `Invoice #${bill.invoiceNumber || 'Unknown'}`,
    description: `${bill.customerName || 'Unknown Customer'} • ${bill.shop?.name || 'Factory Invoice'} • ₹${bill.total.toFixed(2)}`,
    url: `/invoices/${bill.id}`,
    relevanceScore: calculateRelevanceScore(query, [
      bill.invoiceNumber || '',
      bill.customerName || '',
      bill.customerEmail || ''
    ]),
    metadata: {
      customerName: bill.customerName || '',
      customerEmail: bill.customerEmail || '',
      shopName: bill.shop?.name || 'Factory Invoice',
      total: bill.total,
      status: 'completed' // Default status since it's not in the schema
    }
  }));
}

// Search Restock Requests
async function searchRestockRequests(query: string, userPublicId: string, isAdmin: boolean, includeInactive: boolean): Promise<SearchResult[]> {
  let whereClause: any = {
    OR: [
      { notes: { contains: query, mode: 'insensitive' } },
      { product: { name: { contains: query, mode: 'insensitive' } } },
      { product: { sku: { contains: query, mode: 'insensitive' } } }
    ]
  };

  // If not admin, only search their shops
  if (!isAdmin) {
    const managedShops = await prisma.shop.findMany({
      where: { managerId: userPublicId },
      select: { id: true }
    });
    
    const shopIds = managedShops.map(shop => shop.id);
    whereClause.shopId = { in: shopIds };
  }

  const requests = await prisma.restockRequest.findMany({
    where: whereClause,
    include: {
      product: { select: { name: true, sku: true } },
      shop: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  return requests.map(request => ({
    type: 'restock',
    id: request.id,
    title: `Restock Request for Product ID: ${request.productId}`,
    description: `${request.shop.name} • ${request.requestedAmount} units • System Request`,
    url: `/restock-requests/${request.id}`,
    relevanceScore: calculateRelevanceScore(query, [
      request.notes || '',
      request.shop.name
    ]),
    metadata: {
      productId: request.productId,
      shopName: request.shop.name,
      requestedAmount: request.requestedAmount,
      status: request.status,
      requestedBy: 'System User'
    }
  }));
}

// Search Categories
async function searchCategories(query: string, includeInactive: boolean): Promise<SearchResult[]> {
  const whereClause: any = {
    name: { contains: query, mode: 'insensitive' }
  };

  if (!includeInactive) {
    whereClause.isActive = true;
  }

  const categories = await prisma.category.findMany({
    where: whereClause,
    include: {
      _count: { select: { products: true } }
    },
    take: 10
  });

  return categories.map(category => ({
    type: 'category',
    id: category.id,
    title: category.name,
    description: `${category._count.products} products`,
    url: `/inventory/categories/${category.id}`,
    relevanceScore: calculateRelevanceScore(query, [category.name]),
    metadata: {
      productCount: category._count.products
    }
  }));
}

// Search Flavors
async function searchFlavors(query: string, includeInactive: boolean): Promise<SearchResult[]> {
  const whereClause: any = {
    name: { contains: query, mode: 'insensitive' }
  };

  if (!includeInactive) {
    whereClause.isActive = true;
  }

  const flavors = await prisma.flavor.findMany({
    where: whereClause,
    include: {
      _count: { select: { products: true } }
    },
    take: 10
  });

  return flavors.map(flavor => ({
    type: 'flavor',
    id: flavor.id,
    title: flavor.name,
    description: `${flavor._count.products} products`,
    url: `/inventory/flavors/${flavor.id}`,
    relevanceScore: calculateRelevanceScore(query, [flavor.name]),
    metadata: {
      productCount: flavor._count.products
    }
  }));
}

// Calculate relevance score based on query match
function calculateRelevanceScore(query: string, fields: string[]): number {
  const queryLower = query.toLowerCase();
  let score = 0;

  fields.forEach(field => {
    if (!field) return;
    
    const fieldLower = field.toLowerCase();
    
    // Exact match gets highest score
    if (fieldLower === queryLower) {
      score += 100;
    }
    // Starts with query gets high score
    else if (fieldLower.startsWith(queryLower)) {
      score += 80;
    }
    // Contains query gets medium score
    else if (fieldLower.includes(queryLower)) {
      score += 60;
    }
    // Word boundary match gets lower score
    else if (new RegExp(`\\b${queryLower}`, 'i').test(fieldLower)) {
      score += 40;
    }
  });

  return score;
}

// Get search suggestions
export const getSearchSuggestions = async (req: Request, res: Response): Promise<any> => {
  try {
    const { query } = req.query;
    
    if (!query || query.toString().trim().length < 2) {
      return res.status(200).json({ suggestions: [] });
    }

    const searchTerm = query.toString().trim().toLowerCase();
    const suggestions: string[] = [];

    // Get product suggestions
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { sku: { contains: searchTerm, mode: 'insensitive' } }
        ],
        isActive: true
      },
      select: { name: true, sku: true },
      take: 5
    });

    products.forEach(product => {
      suggestions.push(product.name);
      suggestions.push(product.sku);
    });

    // Get shop suggestions
    const shops = await prisma.shop.findMany({
      where: {
        name: { contains: searchTerm, mode: 'insensitive' },
        isActive: true
      },
      select: { name: true },
      take: 3
    });

    shops.forEach(shop => {
      suggestions.push(shop.name);
    });

    // Remove duplicates and limit
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, 10);

    res.status(200).json({ suggestions: uniqueSuggestions });

  } catch (error) {
    logger.error("Error getting search suggestions:", error);
    res.status(500).json({ error: "Failed to get search suggestions" });
  }
};

// Get search statistics
export const getSearchStats = async (req: Request, res: Response): Promise<any> => {
  try {
    const userPublicId = (req as any).user?.publicId;
    if (!userPublicId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { publicId: userPublicId },
      include: { Role: true }
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const isAdmin = user.Role?.name === 'Admin';

    // Get counts for different modules
    const stats = {
      products: await prisma.product.count({ where: { isActive: true } }),
      shops: isAdmin 
        ? await prisma.shop.count({ where: { isActive: true } })
        : await prisma.shop.count({ where: { managerId: userPublicId, isActive: true } }),
      employees: isAdmin
        ? await prisma.user.count({ where: { id: { not: user.id }, role: 'active' } })
        : 0, // Non-admins can't see employee count
      inventory: isAdmin
        ? await prisma.shopInventory.count()
        : await prisma.shopInventory.count({
            where: {
              shop: { managerId: userPublicId }
            }
          }),
      billing: isAdmin
        ? await prisma.billing.count()
        : await prisma.billing.count({
            where: {
              shop: { managerId: userPublicId }
            }
          }),
      categories: await prisma.category.count({ where: { isActive: true } }),
      flavors: await prisma.flavor.count({ where: { isActive: true } })
    };

    res.status(200).json(stats);

  } catch (error) {
    logger.error("Error getting search stats:", error);
    res.status(500).json({ error: "Failed to get search statistics" });
  }
};

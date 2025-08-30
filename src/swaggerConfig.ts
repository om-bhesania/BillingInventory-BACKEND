import swaggerJsDoc from "swagger-jsdoc";

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5000;

// Define servers based on environment
const getServers = () => {
  if (NODE_ENV === 'production') {
    return [
      {
        url: "https://api.shreefood.co.in",
        description: "Production - Shree Food",
      },
      {
        url: "https://billinginventory-backend.onrender.com",
        description: "Production - Render",
      },
    ];
  }
  
  return [
    { url: `http://localhost:${PORT}`, description: "Local Development" },
    {
      url: "https://api.shreefood.co.in",
      description: "Production - Shree Food",
    },
  ];
};

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Bliss Ice Cream Management System API",
      version: "1.0.0",
      description:
        "Complete API documentation for the Bliss Ice Cream multi-shop management system. Includes authentication, user management, shop management, inventory, and billing operations.",
    },
    servers: getServers(),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/**/*.ts", "./src/controllers/**/*.ts"],
};

const swaggerSpecs = swaggerJsDoc(options);

export default swaggerSpecs;
